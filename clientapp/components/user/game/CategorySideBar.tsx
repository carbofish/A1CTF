import { BedDouble, Columns3Cog, Loader2, Plus, UploadCloud, Eye, X } from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
} from "components/ui/sidebar"

import { Button } from "components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "components/ui/dialog"

import { AxiosError } from 'axios';
import { Dispatch, MutableRefObject, SetStateAction, useCallback, useEffect, useRef, useState } from "react";

import { MacScrollbar } from 'mac-scrollbar';
import { useTheme } from "next-themes";

import { randomInt } from "mathjs";
import { toast } from 'react-toastify/unstyled';
import { ParticipationStatus, TeamWriteupInfo, UserDetailGameChallenge, UserSimpleGameChallenge } from "utils/A1API";
import { api, createSkipGlobalErrorConfig } from "utils/ApiHelper";
import { ChallengeSolveStatus } from "components/user/game/ChallengesView";
import { useGlobalVariableContext } from "contexts/GlobalVariableContext";
import CategoryChallenges from "components/modules/game/CategoryChallenges";
import { challengeCategoryColorMap } from "utils/ClientAssets";
import LoadingModule from "components/modules/LoadingModule";
import { useNavigate } from "react-router";
import AddChallengeFromLibraryDialog from "components/admin/game/AddChallengeFromLibraryDialog";
import { useGame } from "hooks/UseGame";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";

export function CategorySidebar({
    gameID,
    curChallenge,
    setCurChallenge,
    curChallengeRef,
    setPageSwitching,
    challenges,
    setChallenges,
    challengeSolveStatusList,
    setChallengeSolveStatusList,
    loadingVisible,
}: {
    gameID: number,
    curChallenge: UserDetailGameChallenge | undefined,
    setCurChallenge: Dispatch<SetStateAction<UserDetailGameChallenge | undefined>>,
    curChallengeRef: MutableRefObject<UserDetailGameChallenge | undefined>,
    setPageSwitching: Dispatch<SetStateAction<boolean>>,
    challenges: Record<string, UserSimpleGameChallenge[]>,
    setChallenges: Dispatch<SetStateAction<Record<string, UserSimpleGameChallenge[]>>>,
    challengeSolveStatusList: Record<string, ChallengeSolveStatus>,
    setChallengeSolveStatusList: Dispatch<SetStateAction<Record<string, ChallengeSolveStatus>>>,
    loadingVisible: boolean,
}) {

    const { theme } = useTheme()
    const { t } = useTranslation("game_view")

    const {
        gameStatus,
        mutateTeamStatus: setTeamStatus,
        isLoading: isGameDataLoading,
        gameInfo
    } = useGame(gameID)

    const [challengesLoaded, setChallengesLoaded] = useState<boolean>(false)

    // 之前的题目列表
    const prevChallenges = useRef<Record<string, UserSimpleGameChallenge[]>>()

    // 懒加载, 当前题目卡片是否在视窗内
    const observerRef = useRef<IntersectionObserver | null>(null);
    const [visibleItems, setVisibleItems] = useState<Record<string, Record<string, boolean>>>({});

    let updateChallengeInter: NodeJS.Timeout;

    const colorMap: { [key: string]: string } = challengeCategoryColorMap

    useEffect(() => {
        const foldMap: Record<string, boolean> = {};
        Object.keys(colorMap).forEach((key) => foldMap[key] = true);
    }, [])

    // 更新题目列表
    const updateChalenges = () => {

        api.user.userGetGameChallenges(gameID).then((res) => {

            const response = res.data

            // 根据 Category 分组

            const tmpGroupedChallenges: Record<string, UserSimpleGameChallenge[]> = {};
            response.data.challenges.forEach((challenge: UserSimpleGameChallenge) => {
                const category = challenge.category?.toLowerCase() || "misc";
                if (!tmpGroupedChallenges[category]) {
                    tmpGroupedChallenges[category] = [];
                }
                tmpGroupedChallenges[category].push(challenge);
            });

            const groupedChallenges = Object.fromEntries(
                Object.entries(tmpGroupedChallenges).sort(([a], [b]) => a.localeCompare(b))
            );


            if (JSON.stringify(prevChallenges.current) == JSON.stringify(groupedChallenges)) return
            prevChallenges.current = groupedChallenges
            setChallenges(groupedChallenges || {})

            // if (JSON.stringify(prevGameDetail.current) == JSON.stringify(response.data)) return
            // prevGameDetail.current = groupedChallenges
            // setGameDetail(response.data)

            let curChallengeStillExists = false

            for (const key in groupedChallenges) {
                if (groupedChallenges.hasOwnProperty(key)) {
                    groupedChallenges[key].forEach(challenge => {
                        // 
                        if (challenge.challenge_name == curChallengeRef.current?.challenge_name) {
                            curChallengeStillExists = true
                        }
                    });

                    // 初始化一次先
                    groupedChallenges[key].forEach(challenge => {
                        setChallengeSolveStatusList((prev) => ({
                            ...prev,
                            [challenge.challenge_id || 0]: {
                                solved: response.data.solved_challenges?.some(obj => obj.challenge_id == challenge.challenge_id) ?? false,
                                solve_count: challenge.solve_count ?? 0,
                                cur_score: challenge.cur_score ?? 0,
                            }
                        }))
                    });
                }
            }

            if (!curChallengeStillExists) {
                setCurChallenge(undefined)
                curChallengeRef.current = undefined
            }

            observerRef.current = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    const target = entry.target as HTMLElement;

                    const id = target.dataset.id as string;
                    const category = target.dataset.category as string;


                    if (entry.isIntersecting) {
                        setVisibleItems((prev) => ({
                            ...prev,
                            [category]: {
                                ...(prev[category]),
                                [id]: true, // 标记为可见
                            },
                        }));
                    } else {
                        setVisibleItems((prev) => ({
                            ...prev,
                            [category]: {
                                ...(prev[category]),
                                [id]: false, // 标记为不可见
                            },
                        }));
                    }
                }
                );
            },
                {
                    rootMargin: "200px 0px",
                });

            setTimeout(() => {
                setChallengesLoaded(true)
            }, 200)
        }, createSkipGlobalErrorConfig()).catch((error: AxiosError) => {
            if (error.response?.status == 400) {
                clearInterval(updateChallengeInter)

                api.user.userGetGameInfoWithTeamInfo(gameID).then((res) => {
                    if (res.data.data.team_status == ParticipationStatus.Banned) {
                        setTeamStatus(ParticipationStatus.Banned)
                    } else {
                        toast.error("Unknow error!")
                    }
                })
            }
        })
    }

    useEffect(() => {

        if (gameStatus == "running" || gameStatus == "practiceMode" || isAdmin()) {
            updateChalenges()
            updateChallengeInter = setInterval(() => {
                updateChalenges()
            }, randomInt(4000, 6000))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        return () => { if (updateChallengeInter) clearInterval(updateChallengeInter) }
    }, [gameStatus])

    const navigate = useNavigate()

    useEffect(() => {
        // 更新题目的解决状态
        // FIXME 更新题目解决状态需要修复
        // for (const key in Object.keys(challenges)) {
        //     if (challenges.hasOwnProperty(key)) {
        //         challenges[key].forEach(challenge => {
        //             setChallengeSolvedList((prev) => ({
        //                 ...prev,
        //                 [challenge.id || 0]: prevGameDetail.current?.rank?.solvedChallenges?.some(obj => obj.id == challenge.id) || false
        //             }))
        //         });
        //     }
        // }
    }, [challenges])

    // 处理切换题目
    const handleChangeChallenge: (id: number) => React.MouseEventHandler<HTMLDivElement> = (id: number) => {
        return (_event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {

            if (id == curChallenge?.challenge_id) return

            api.user.userGetGameChallenge(gameID, id).then((response) => {
                // 
                curChallengeRef.current = response.data.data
                setCurChallenge(response.data.data)
                setPageSwitching(true)
            }).catch((_error: AxiosError) => { })
        };
    };

    // 懒加载
    const observeItem = (el: HTMLElement, category: string, id: string) => {
        if (el && observerRef.current) {
            el.dataset.id = id;
            el.dataset.category = category;
            observerRef.current.observe(el);
        }
    };

    const { clientConfig, isAdmin, getSystemLogoDefault } = useGlobalVariableContext()
    const systemDisplayName = clientConfig?.systemName ? `${clientConfig.systemName} Platform` : "A1CTF Platform"
    const [addChallengeOpen, setAddChallengeOpen] = useState(false)
    const showWriteupCard = !isAdmin()
    const writeupCard = showWriteupCard ? (
        <WriteupSubmissionCard
            gameID={gameID}
            initialRequire={gameInfo?.require_wp}
            initialDeadline={gameInfo?.wp_expire_time}
            initialStart={gameInfo?.wp_start_time}
            initialFormats={gameInfo?.wp_formats}
        />
    ) : null

    if (isGameDataLoading) {
        return <></>
    }

    return (
        <>
            <AddChallengeFromLibraryDialog
                gameID={gameID}
                setChallenges={setChallenges}
                isOpen={addChallengeOpen}
                setIsOpen={setAddChallengeOpen}
                setChallengeSolveStatusList={setChallengeSolveStatusList}
            />
            <Sidebar className="hide-scrollbar select-none transition-all duration-200 ml-16">
                <SidebarContent>
                    {isAdmin() && (
                        <div className="absolute bottom-5 right-5 z-10 flex flex-col gap-4">
                            <Button variant="ghost" size="icon"
                                className={`rounded-xl w-12 h-12 [&_svg]:size-6 bg-foreground/10 hover:hover:bg-foreground/20 cursor-pointer`}
                                data-tooltip-id="my-tooltip"
                                data-tooltip-html={t("score_adjustments")}
                                data-tooltip-place="left"
                                onClick={() => {
                                    navigate(`/admin/games/${gameID}/score-adjustments`)
                                }}
                            >
                                <Columns3Cog />
                            </Button>
                            <Button variant="ghost" size="icon"
                                className={`rounded-xl w-12 h-12 [&_svg]:size-6 bg-foreground/10 hover:hover:bg-foreground/20 cursor-pointer`}
                                data-tooltip-id="my-tooltip"
                                data-tooltip-html={t("add_challenge")}
                                data-tooltip-place="left"
                                onClick={() => setAddChallengeOpen(true)}
                            >
                                <Plus />
                            </Button>
                        </div>
                    )}
                    <div className="flex h-full flex-col">
                        <MacScrollbar
                            skin={theme == "light" ? "light" : "dark"}
                            trackStyle={(horizontal) => ({ [horizontal ? "height" : "width"]: 0, borderWidth: 0 })}
                            thumbStyle={(horizontal) => ({ [horizontal ? "height" : "width"]: 6 })}
                            className="pr-1 pl-1 flex-1"
                        >
                            <SidebarGroup className="h-full">
                                <div className="flex justify-center w-full items-center pl-2 pr-2 pt-6 mb-4">
                                    <div className="justify-start flex gap-4 items-center">
                                        <img
                                            className="transition-all duration-300"
                                            src={getSystemLogoDefault()}
                                            alt={clientConfig.SVGAltData}
                                            width={40}
                                            height={40}
                                        />
                                        <span className="font-bold text-xl transition-colors duration-300">{systemDisplayName}</span>
                                    </div>
                                    <div className="flex-1" />
                                </div>

                                {!loadingVisible && challengesLoaded ? (
                                    Object.entries(challenges).length > 0 ? (
                                        <div className="pl-[7px] pr-[7px] mt-2 pb-6 space-y-6">
                                            {Object.entries(challenges ?? {}).map(([category, challengeList]) => (
                                                <CategoryChallenges
                                                    key={category}
                                                    category={category}
                                                    challengeList={challengeList}
                                                    curChallenge={curChallenge}
                                                    observeItem={observeItem}
                                                    gameID={gameID}
                                                    visibleItems={visibleItems}
                                                    handleChangeChallenge={handleChangeChallenge}
                                                    challengeSolveStatusList={challengeSolveStatusList}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="w-full items-center justify-center flex flex-col gap-4 h-full">
                                            <div className="flex gap-2 items-center">
                                                <BedDouble size={28} />
                                                <span className="text-lg">{t("no_challenge")}</span>
                                            </div>
                                            <span className="text-muted-foreground line-through">{t("rest")}</span>
                                        </div>
                                    )
                                ) : (
                                    <div className="flex h-full items-center justify-center">
                                        <LoadingModule />
                                    </div>
                                )}
                            </SidebarGroup>
                        </MacScrollbar>
                        {writeupCard && (
                            <div className="px-3 pb-4 pt-2">
                                {writeupCard}
                            </div>
                        )}
                    </div>
                </SidebarContent>
            </Sidebar>
        </>
    )
}

CategorySidebar.whyDidYouRender = true

interface WriteupSubmissionCardProps {
    gameID: number
    initialRequire?: boolean
    initialDeadline?: string
    initialStart?: string
    initialFormats?: string[]
}

const WriteupSubmissionCard: React.FC<WriteupSubmissionCardProps> = ({ gameID, initialRequire, initialDeadline, initialStart, initialFormats }) => {
    const { t } = useTranslation("game_view")
    const [writeup, setWriteup] = useState<TeamWriteupInfo | null>(null)
    const [requireWriteup, setRequireWriteup] = useState<boolean>(initialRequire ?? false)
    const [deadline, setDeadline] = useState<string | undefined>(initialDeadline)
    const [startTime, setStartTime] = useState<string | undefined>(initialStart)
    const [formats, setFormats] = useState<string[]>(initialFormats ?? [])
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [fetched, setFetched] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setRequireWriteup(initialRequire ?? false)
        setDeadline(initialDeadline)
        setStartTime(initialStart)
        setFormats(initialFormats ?? [])
    }, [initialRequire, initialDeadline, initialStart, initialFormats])

    const loadWriteupInfo = useCallback(() => {
        setLoading(true)
        api.user.userGetGameWriteup(gameID).then((res) => {
            const payload = res.data?.data as {
                writeup?: TeamWriteupInfo | null
                require_wp: boolean
                wp_expire_time: string
                wp_start_time?: string
                wp_formats?: string[]
            }
            if (!payload) return
            setWriteup(payload.writeup ?? null)
            setRequireWriteup(payload.require_wp)
            setDeadline(payload.wp_expire_time)
            setStartTime(payload.wp_start_time)
            setFormats(payload.wp_formats ?? [])
            setFetched(true)
        }).finally(() => setLoading(false))
    }, [gameID])

    useEffect(() => {
        loadWriteupInfo()
    }, [loadWriteupInfo])

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setUploading(true)
        api.user.userUploadGameWriteupFile(gameID, { file }).then((response) => {
            const fileId = response.data?.file_id
            if (!fileId) {
                throw new Error("invalid_file_id")
            }
            return api.user.userSubmitGameWriteup(gameID, { file_id: fileId })
        }).then(() => {
            toast.success(t("writeup_card.submit_success"))
            loadWriteupInfo()
        }).catch(() => {
            // handled globally
        }).finally(() => {
            setUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        })
    }

    const formattedDeadline = deadline ? dayjs(deadline).format("YYYY-MM-DD HH:mm") : undefined
    const startMoment = startTime ? dayjs(startTime) : undefined
    const formattedStart = startMoment ? startMoment.format("YYYY-MM-DD HH:mm") : undefined
    const startReady = !startMoment || dayjs().isAfter(startMoment)
    const allowedFormatsDisplay = (formats?.length ? formats.join("/").toUpperCase() : "PDF/ZIP/DOC/DOCX/MD/TXT")
    const uploadAccept = (formats?.length
        ? formats.map((fmt) => `.${fmt.toLowerCase()}`).join(",")
        : ".pdf,.zip,.md,.doc,.docx,.txt")

    if (!requireWriteup && fetched && !loading) {
        return null
    }

    return (
        <div className="rounded-2xl border border-border/50 bg-background/60 p-4 shadow-sm shadow-black/5">
            <div className="flex items-center justify-between gap-3">
                <p className="text-base font-semibold text-foreground">{t("writeup_card.title")}</p>
                {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
                {formattedDeadline ? t("writeup_card.deadline", { time: formattedDeadline }) : t("writeup_card.deadline_unknown")}
            </p>
            {startMoment && !startReady ? (
                <p className="mt-2 text-xs text-amber-600">
                    {t("writeup_card.start_not_ready", { time: formattedStart })}
                </p>
            ) : null}
            {writeup ? (
                <div className="mt-3 rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between gap-3">
                        <span>{t("writeup_card.last_submitted", { time: dayjs(writeup.submitted_at).format("YYYY-MM-DD HH:mm") })}</span>
                        <button
                            className="flex items-center gap-1 text-primary hover:text-primary/80"
                            onClick={() => setShowPreview(true)}
                            type="button"
                        >
                            <Eye className="h-3.5 w-3.5" />
                            <span>{t("writeup_card.view")}</span>
                        </button>
                    </div>
                </div>
            ) : (
                <p className="mt-3 text-xs text-muted-foreground">{t("writeup_card.not_submitted")}</p>
            )}
            <div className="mt-4 flex flex-col gap-2">
                <button
                    type="button"
                    disabled={uploading || !startReady}
                    className="flex items-center justify-center gap-2 rounded-xl bg-primary/90 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary disabled:opacity-70"
                    onClick={() => fileInputRef.current?.click()}
                >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                    {uploading ? t("writeup_card.uploading") : (writeup ? t("writeup_card.replace") : t("writeup_card.upload"))}
                </button>
                <p className="text-[0.7rem] text-muted-foreground">
                    {t("writeup_card.allowed_formats_with_size", { formats: allowedFormatsDisplay })}
                </p>
            </div>
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={uploadAccept}
                onChange={handleFileChange}
            />

            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="flex h-[92vh] w-[min(1400px,96vw)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
                    <DialogHeader className="px-6 py-4 pr-12 border-b shrink-0">
                        <DialogTitle className="flex items-center justify-between gap-4">
                            <span className="truncate">{t("writeup_card.preview_title")}</span>
                            <span className="text-sm font-normal text-muted-foreground truncate max-w-[min(45vw,360px)]">
                                {writeup?.file_name}
                            </span>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden min-h-0">
                        {writeup?.url && (
                            <iframe
                                src={writeup.url}
                                className="h-full w-full border-0"
                                title="Writeup Preview"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
