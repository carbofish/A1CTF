import { BedDouble, Columns3Cog, Plus } from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
} from "components/ui/sidebar"

import { Button } from "components/ui/button"

import { AxiosError } from 'axios';
import { Dispatch, MutableRefObject, SetStateAction, useEffect, useRef, useState } from "react";

import { MacScrollbar } from 'mac-scrollbar';
import { useTheme } from "next-themes";

import { randomInt } from "mathjs";
import { toast } from 'react-toastify/unstyled';
import { ParticipationStatus, UserDetailGameChallenge, UserSimpleGameChallenge } from "utils/A1API";
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
        isLoading: isGameDataLoading
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
    const [addChallengeOpen, setAddChallengeOpen] = useState(false)

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
                    <MacScrollbar
                        skin={theme == "light" ? "light" : "dark"}
                        trackStyle={(horizontal) => ({ [horizontal ? "height" : "width"]: 0, borderWidth: 0 })}
                        thumbStyle={(horizontal) => ({ [horizontal ? "height" : "width"]: 6 })}
                        className="pr-1 pl-1 h-full"
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
                                    <span className="font-bold text-xl transition-colors duration-300">A1CTF Platform</span>
                                </div>
                                <div className="flex-1" />
                            </div>

                            {!loadingVisible && challengesLoaded ? (
                                Object.entries(challenges).length > 0 ? (
                                    <div className="pl-[7px] pr-[7px] mt-2 pb-6">
                                        {
                                            Object.entries(challenges ?? {}).map(([category, challengeList]) => (
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
                                            ))
                                        }
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
                                <LoadingModule />
                            )}
                        </SidebarGroup>
                    </MacScrollbar>
                </SidebarContent>
            </Sidebar>
        </>
    )
}

CategorySidebar.whyDidYouRender = true