import { SidebarProvider } from "components/ui/sidebar"
import { CategorySidebar } from "components/user/game/CategorySideBar";

import { toastNewNotice, toastNewHint } from "utils/ToastUtil";

import LazyMdxCompoents from "components/modules/LazyMdxCompoents";
import { useEffect, useMemo, useRef, useState } from "react";

import { api, createSkipGlobalErrorConfig } from "utils/ApiHelper"
import { GameNotice, NoticeCategory, ParticipationStatus, UserDetailGameChallenge, UserSimpleGameChallenge } from "utils/A1API"

import dayjs from "dayjs";
import { Loader2 } from "lucide-react";
import { AxiosError } from "axios";

import { AnimatePresence, motion } from "framer-motion";
import { RedirectNotice } from "components/RedirectNotice";
import { NoticesView } from "components/NoticesView";

import { MacScrollbar } from 'mac-scrollbar';
import { useTheme } from "next-themes";

import { useGlobalVariableContext } from "contexts/GlobalVariableContext";


import { SolvedAnimation } from "components/SolvedAnimation";
import ChallengesViewHeader from "components/modules/challenge/ChallengeViewHeader";
import SubmitFlagView from "components/modules/challenge/SubmitFlagView";

import GameStatusMask from "components/modules/game/GameStatusMask";
import ChallengeHintPage from "components/modules/challenge/ChallengeHintPage";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import ChallengeMainContent from "components/modules/challenge/ChallengeMainContent";
import LoadingModule from "components/modules/LoadingModule";
import GameTeamStatusCard from "components/modules/game/GameTeamStatusCard";
import { A1GameStatus } from "components/modules/game/GameStatusEnum";
import useConditionalState from "hooks/ContidionalState";
import { useGame, useGameDescription } from "hooks/UseGame";

export interface ChallengeSolveStatus {
    solved: boolean;
    solve_count: number;
    cur_score: number;
}

export function ChallengesView({
    gameID,
}: {
    gameID: number,
}) {

    const {
        gameInfo,
        gameStatus,
        teamStatus,
        isLoading: isGameDataLoading
    } = useGame(gameID)

    const { gameDescription, isLoading: isGameDescriptionLoading } = useGameDescription(gameID)

    const { t } = useTranslation()
    const { t: noticesViewT } = useTranslation("notices_view")
    const { t: gameViewT } = useTranslation("game_view")

    // 所有题目
    const [challenges, setChallenges] = useConditionalState<Record<string, UserSimpleGameChallenge[]>>({})

    // 当前选中的题目
    const [curChallenge, setCurChallenge] = useState<UserDetailGameChallenge>()
    const curChallengeDetail = useRef<UserDetailGameChallenge>()

    // 前一个题目
    const prevChallenge = useRef<UserDetailGameChallenge>();

    // 加载动画
    const [loadingVisible, setLoadingVisibility] = useState(true)

    // 页面切换动画
    const [pageSwitch, setPageSwitch] = useState(false)

    // 题目是否解决
    const [challengeSolveStatusList, setChallengeSolveStatusList] = useState<Record<number, ChallengeSolveStatus>>({});

    const [redirectURL, setRedirectURL] = useState<string>("")

    // 公告页面是否打开
    const [noticesOpened, setNoticeOpened] = useState<boolean>(false)
    const [notices, setNotices] = useState<GameNotice[]>([])

    const noticesRef = useRef<GameNotice[]>([])

    const { theme } = useTheme()

    const { isAdmin } = useGlobalVariableContext()

    const [blood, setBlood] = useState("")
    const [bloodMessage, setBloodMessage] = useState("")

    const [submitFlagWindowVisible, setSubmitFlagWindowVisible] = useState(false)
    const [showHintsWindowVisible, setShowHintsWindowVisible] = useState(false)

    const wsRef = useRef<WebSocket | null>(null)
    const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected" | "ingore">("ingore")

    const [searchParams, setSearchParams] = useSearchParams()

    const challengeSearched = searchParams.get("id") ? true : false

    const setChallengeSolved = (id: number) => {
        if (isAdmin()) {
            setChallengeSolveStatusList((prev) => ({
                ...prev,
                [id]: {
                    solved: true,
                    solve_count: (prev[id]?.solve_count ?? 0),
                    cur_score: prev[id]?.cur_score ?? 0,
                },
            }))
        } else {
            setChallengeSolveStatusList((prev) => ({
                ...prev,
                [id]: {
                    solved: true,
                    solve_count: (prev[id]?.solve_count ?? 0) + 1,
                    cur_score: prev[id]?.cur_score ?? 0,
                },
            }))

            if (curChallengeDetail.current?.challenge_id == id) {
                curChallengeDetail.current.solve_count = (curChallengeDetail.current.solve_count ?? 0) + 1
            }
        }
    }

    useEffect(() => {
        // 切换题目重置折叠状态
        if (JSON.stringify(curChallenge) == JSON.stringify(prevChallenge.current)) return
        prevChallenge.current = curChallenge

        Object.keys(challenges).forEach((obj) => {
            const detail = challenges[obj].find((obj) => obj.challenge_id == curChallenge?.challenge_id)
            if (detail) curChallengeDetail.current = detail
        })

        const timeout = setTimeout(() => setPageSwitch(false), 300)

        return () => {
            clearTimeout(timeout)
        }
    }, [curChallenge]);

    const finishLoading = () => {
        setLoadingVisibility(false)
    }

    useEffect(() => {
        // 根据比赛状态处理事件
        if (gameStatus == A1GameStatus.Running || gameStatus == A1GameStatus.PracticeMode || isAdmin()) {
            const challengeID = searchParams.get("id")
            if (challengeID) {
                const challengeIDInt = parseInt(challengeID, 10)
                api.user.userGetGameChallenge(gameID, challengeIDInt).then((response) => {
                    // 
                    curChallengeDetail.current = response.data.data
                    setCurChallenge(response.data.data)
                    // setPageSwitch(true)

                    finishLoading()
                }, createSkipGlobalErrorConfig()).catch((_error: AxiosError) => { })
            } else {
                finishLoading()
            }

            // 获取比赛通知
            api.user.userGetGameNotices(gameID).then((res) => {
                const filtedNotices: GameNotice[] = []
                let curIndex = 0

                res.data.data.sort((a, b) => (dayjs(b.create_time).unix() - dayjs(a.create_time).unix()))

                // 这里多次 forEach 是为了让公告优先在最上面
                res.data.data.forEach((obj) => {
                    if (obj.notice_category == NoticeCategory.NewAnnouncement) filtedNotices[curIndex++] = obj
                })

                res.data.data.forEach((obj) => {
                    if ([NoticeCategory.FirstBlood, NoticeCategory.SecondBlood, NoticeCategory.ThirdBlood, NoticeCategory.NewHint].includes(obj.notice_category)) filtedNotices[curIndex++] = obj
                })

                noticesRef.current = filtedNotices
                setNotices(filtedNotices)
            })

            // Websocket
            const baseURL = window.location.host
            let reconnectAttempts = 0
            const maxReconnectAttempts = 5
            const reconnectInterval = 3000 // 3秒重连间隔
            let reconnectTimer: NodeJS.Timeout | null = null
            let isManualClose = false

            const connectWebSocket = () => {
                // 显示连接中的toast
                const connectPromise = new Promise<void>((resolve, reject) => {

                    const https_enabled = window.location.protocol == "https:"
                    const socket = new WebSocket(`${https_enabled ? "wss" : "ws"}://${baseURL}/api/hub?game=${gameID}`)
                    wsRef.current = socket

                    setWsStatus("connecting")

                    const connectTimeout = setTimeout(() => {
                        socket.close()
                        reject(new Error('连接超时'))
                    }, 10000) // 10秒连接超时

                    socket.onopen = () => {
                        clearTimeout(connectTimeout)
                        setWsStatus("connected")
                        
                        reconnectAttempts = 0 // 重置重连次数
                        resolve()
                    }

                    socket.onmessage = (event) => {
                        try {
                            const data = JSON.parse(event.data)
                            
                            if (data.type === 'Notice') {
                                const message: GameNotice = data.message
                                

                                if (message.notice_category == NoticeCategory.NewHint) {
                                    // 将NewHint通知添加到通知列表
                                    const newNotices: GameNotice[] = []
                                    let insertIndex = 0

                                    // 先添加所有公告
                                    noticesRef.current.forEach((notice) => {
                                        if (notice.notice_category === NoticeCategory.NewAnnouncement) {
                                            newNotices[insertIndex++] = notice
                                        }
                                    })

                                    // 然后添加新的Hint通知
                                    newNotices[insertIndex++] = message

                                    // 最后添加其他通知
                                    noticesRef.current.forEach((notice) => {
                                        if (![NoticeCategory.NewAnnouncement].includes(notice.notice_category)) {
                                            newNotices[insertIndex++] = notice
                                        }
                                    })

                                    noticesRef.current = newNotices
                                    setNotices(newNotices)

                                    // 显示toast通知
                                    toastNewHint({
                                        challenges: message.data,
                                        time: dayjs(message.create_time).toDate().getTime() / 1000,
                                        openNotices: setNoticeOpened
                                    })
                                }

                                if (message.notice_category == NoticeCategory.NewAnnouncement) {
                                    const newNotices: GameNotice[] = []
                                    newNotices[0] = message
                                    noticesRef.current.forEach((ele, index) => {
                                        newNotices[index + 1] = ele
                                    })

                                    noticesRef.current = newNotices
                                    setNotices(newNotices)

                                    toastNewNotice({
                                        title: message.data[0],
                                        time: dayjs(message.create_time).format("YYYY-MM-DD HH:mm:ss"),
                                        openNotices: setNoticeOpened
                                    })
                                }

                                if ([NoticeCategory.FirstBlood, NoticeCategory.SecondBlood, NoticeCategory.ThirdBlood].includes(message.notice_category) &&
                                    gameInfo?.team_info?.team_name?.toString().trim() == message.data[0]?.toString().trim()) {
                                    switch (message.notice_category) {
                                        case NoticeCategory.FirstBlood:
                                            setBloodMessage(`${noticesViewT("congratulations")}${noticesViewT("blood_message_p1")} ${message.data[1]} ${noticesViewT("blood1")}`)
                                            setBlood("gold")
                                            break
                                        case NoticeCategory.SecondBlood:
                                            setBloodMessage(`${noticesViewT("congratulations")}${noticesViewT("blood_message_p1")} ${message.data[1]} ${noticesViewT("blood2")}`)
                                            setBlood("silver")
                                            break
                                        case NoticeCategory.ThirdBlood:
                                            setBloodMessage(`${noticesViewT("congratulations")}${noticesViewT("blood_message_p1")} ${message.data[1]} ${noticesViewT("blood3")}`)
                                            setBlood("copper")
                                            break
                                    }
                                }
                            }
                        } catch (error) {
                            console.error('Error parsing WebSocket message:', error)
                        }
                    }

                    socket.onerror = (error) => {
                        clearTimeout(connectTimeout)
                        console.error('WebSocket error:', error)
                    }

                    socket.onclose = (_event) => {
                        setWsStatus("disconnected")
                        clearTimeout(connectTimeout)

                        // 如果不是手动关闭且重连次数未达到上限，则尝试重连
                        if (!isManualClose && reconnectAttempts < maxReconnectAttempts) {
                            reconnectAttempts++

                            reconnectTimer = setTimeout(() => {
                                connectWebSocket()
                            }, reconnectInterval)
                        } else if (reconnectAttempts >= maxReconnectAttempts) {
                            // toast.error('WebSocket连接失败，请刷新页面重试')
                        }
                    }
                })

                return connectPromise
            }

            // 初始连接
            if (teamStatus == ParticipationStatus.Approved) {
                setWsStatus("disconnected")
                setTimeout(() => {
                    connectWebSocket()
                    
                }, 1000)
            } else {
                setWsStatus("ingore")
            }

            return () => {
                isManualClose = true // 标记为手动关闭

                if (reconnectTimer) {
                    clearTimeout(reconnectTimer)
                    reconnectTimer = null
                }

                if (wsRef.current) {
                    wsRef.current.close()
                }
            }

        }
    }, [gameStatus])

    // 为游戏描述创建 memo 化的 Mdx 组件
    const memoizedGameDescription = useMemo(() => {
        return gameDescription ? (
            <div className="p-10">
                <LazyMdxCompoents source={gameDescription || ""} />
            </div>
        ) : null;
    }, [gameDescription]); // 只依赖游戏描述

    useEffect(() => {
        if (curChallenge?.challenge_id) {
            setSearchParams({ id: curChallenge.challenge_id.toString() })
        }
    }, [curChallenge?.challenge_id])


    if (isGameDataLoading || isGameDescriptionLoading) {
        return <></>
    }

    if (!([A1GameStatus.Running, A1GameStatus.PracticeMode].includes(gameStatus) || teamStatus == ParticipationStatus.Banned || isAdmin())) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <span className="text-2xl font-bold">{gameViewT("game_not_start")}</span>
            </div>
        )
    }

    return (
        <>
            {/* <LoadingPage visible={loadingVisiblity} /> */}

            {/* <div className="absolute h-full w-full top-0 left-0 backdrop-blur-sm" /> */}

            {/* 抢血动画 */}
            <SolvedAnimation blood={blood} setBlood={setBlood} bloodMessage={bloodMessage} />
            {/* 提交 Flag 组件 */}
            <SubmitFlagView curChallenge={curChallenge} gameID={gameID} setChallengeSolved={setChallengeSolved} challengeSolveStatusList={challengeSolveStatusList} visible={submitFlagWindowVisible} setVisible={setSubmitFlagWindowVisible} />

            {/* Hint 列表 */}
            <ChallengeHintPage curChallenge={curChallenge} visible={showHintsWindowVisible} setVisible={setShowHintsWindowVisible} />

            {/* 比赛各种状态页 */}
            <GameStatusMask gameID={gameID} />

            {/* 重定向警告页 */}
            <RedirectNotice redirectURL={redirectURL} setRedirectURL={setRedirectURL} />
            {/* 公告页 */}
            <NoticesView opened={noticesOpened} setOpened={setNoticeOpened} notices={notices} />

            {/* 题目侧栏和题目信息 */}
            <SidebarProvider>
                <CategorySidebar
                    gameID={gameID}
                    curChallenge={curChallenge}
                    setCurChallenge={setCurChallenge}
                    curChallengeRef={curChallengeDetail}
                    setPageSwitching={setPageSwitch}
                    challenges={challenges || {}}
                    setChallenges={setChallenges}
                    challengeSolveStatusList={challengeSolveStatusList}
                    setChallengeSolveStatusList={setChallengeSolveStatusList}
                    loadingVisible={loadingVisible}
                />
                <div className="w-full h-screen relative">
                    <div className="absolute h-full w-full top-0 left-0">
                        <div className="flex flex-col h-full w-full overflow-hidden relative">
                            <ChallengesViewHeader
                                gameID={gameID}
                                wsStatus={wsStatus}
                                setNoticeOpened={setNoticeOpened}
                                notices={notices}
                                loadingVisible={loadingVisible}
                            />
                            <div className="relative overflow-hidden h-full">
                                <AnimatePresence>
                                    {pageSwitch ? (
                                        <motion.div className="absolute top-0 left-0 w-full h-full z-20 flex justify-center items-center"
                                            exit={{
                                                opacity: 0
                                            }}
                                        >
                                            <div className="flex">
                                                <Loader2 className="animate-spin" />
                                                <span className="font-bold ml-3">{t("loading")}</span>
                                            </div>
                                        </motion.div>
                                    ) : (null)}
                                </AnimatePresence>
                                <div className="absolute bottom-0 right-0 z-10 pr-7 pb-5">
                                    <GameTeamStatusCard gameID={gameID} />
                                </div>
                                {!challengeSearched && !loadingVisible ? (
                                    <div className="absolute top-0 left-0 w-full h-full flex flex-col">
                                        {gameDescription ? (
                                            <MacScrollbar
                                                className="w-full flex flex-col"
                                                skin={theme === "dark" ? "dark" : "light"}
                                            >
                                                {memoizedGameDescription}
                                            </MacScrollbar>

                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center select-none">
                                                <span className="font-bold text-lg">Emmmmmm</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    !loadingVisible && curChallenge ? (
                                        <>
                                            {!pageSwitch ? (
                                                <ChallengeMainContent
                                                    gameID={gameID}
                                                    curChallenge={curChallenge}
                                                    setChallenges={setChallenges}
                                                    setCurChallenge={setCurChallenge}
                                                    challengeSolveStatusList={challengeSolveStatusList}
                                                    setSubmitFlagWindowVisible={setSubmitFlagWindowVisible}
                                                    setShowHintsWindowVisible={setShowHintsWindowVisible}
                                                    setRedirectURL={setRedirectURL}
                                                />
                                            ) : (
                                                <></>
                                            )}
                                        </>
                                    ) : (
                                        <LoadingModule />
                                    )
                                )}

                            </div>
                        </div>
                    </div>
                </div>
            </SidebarProvider>
        </>
    )
}