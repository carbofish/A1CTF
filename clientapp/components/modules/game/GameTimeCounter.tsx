import dayjs from "dayjs"
import minMax from "dayjs/plugin/minMax";
dayjs.extend(minMax);

import { useGame } from "hooks/UseGame";
import { useEffect } from "react"
import { GameStage } from "utils/A1API";
import { A1GameStatus } from "./GameStatusEnum";
import TimeCounterWithProgressBar from "components/user/game/TimeCounterWithProgressBar";
import useConditionalState from "hooks/ContidionalState";
import { DropdownMenu, DropdownMenuContent } from "components/ui/dropdown-menu";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { ClockArrowDown, ClockArrowUp, SquareChartGantt } from "lucide-react";

export default function GameTimeCounter(
    { gameID }: {
        gameID: number,
    }
) {
    const { gameInfo, gameStatus } = useGame(gameID)
    const stageMode = gameInfo?.stages != undefined && gameInfo.stages.length > 0

    const getCurGameStages = (): Array<GameStage> => {
        if (gameInfo?.stages) {
            const allStages = []

            // 筛选出所有符合当前时间的 stage
            for (const stage of gameInfo.stages) {
                if (dayjs().isAfter(dayjs(stage.start_time)) && dayjs().isBefore(dayjs(stage.end_time))) {
                    allStages.push(stage)
                }
            }

            // 升序, 查找最早开始的
            allStages.sort((a, b) => {
                return dayjs(a.start_time).isBefore(dayjs(b.start_time)) ? -1 : 1
            })

            return allStages
        }
        return []
    }

    const [curGameStages, setCurGameStages] = useConditionalState<Array<GameStage | undefined>>(getCurGameStages())

    const gameStagesModule = () => {

        if (!stageMode || !curGameStages.length) {
            return (
                <TimeCounterWithProgressBar
                    start_time={gameInfo?.start_time ?? dayjs()}
                    target_time={gameInfo?.end_time ?? dayjs()}
                />
            )
        }

        // 处理多阶段情况
        // 选择多个时间段的交集
        const start_time = dayjs.max(curGameStages.map(e => dayjs(e?.start_time)))
        const end_time = dayjs.min(curGameStages.map(e => dayjs(e?.end_time)))
        const combined_stage_name = curGameStages.map(e => e?.stage_name).join(" & ")

        return (
            <TimeCounterWithProgressBar
                start_time={start_time ?? dayjs()}
                target_time={end_time ?? dayjs()}
                prefix={combined_stage_name + " - "}
            />
        )
    }

    const checkIfInStages = (stage: GameStage | undefined) => {
        if (!stage) return false
        return dayjs().isAfter(dayjs(stage.start_time)) && dayjs().isBefore(dayjs(stage.end_time))
    }

    useEffect(() => {
        const gameStageInter = setInterval(() => {
            setCurGameStages(getCurGameStages())
        }, 500)

        return () => {
            clearInterval(gameStageInter)
        }
    }, [gameInfo])

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="select-none cursor-pointer" title="查看比赛时间详细">
                    {/* 未开始 */}
                    {gameStatus == A1GameStatus.Pending && (
                        <div className="bg-background rounded-2xl">
                            <div className="bg-black/10 pl-4 pr-4 pt-1 pb-1 rounded-2xl overflow-hidden select-none dark:bg-[#2A2A2A] hidden lg:flex relative transition-colors duration-300">
                                <div className="absolute top-0 left-0 bg-black dark:bg-white transition-colors duration-300"
                                    style={{ width: `100%`, height: '100%' }}
                                />
                                <span className="text-white mix-blend-difference z-20 transition-all duration-500">比赛未开始</span>
                            </div>
                        </div>
                    )}

                    {/* 比赛已结束 */}
                    {gameStatus == A1GameStatus.Ended || gameStatus == A1GameStatus.PracticeMode && (
                        <div className="bg-background rounded-2xl">
                            <div className="bg-black/10 pl-4 pr-4 pt-1 pb-1 rounded-2xl overflow-hidden select-none dark:bg-[#2A2A2A] hidden lg:flex relative transition-colors duration-300">
                                <div className="absolute top-0 left-0 bg-black dark:bg-white transition-colors duration-300"
                                    style={{ width: `0%`, height: '100%' }}
                                />
                                <span className="text-white mix-blend-difference z-20 transition-all duration-500">{gameStatus == A1GameStatus.PracticeMode ? "练习模式" : "比赛已结束"}</span>
                            </div>
                        </div>
                    )}

                    {gameStatus == A1GameStatus.Running && gameStagesModule()}
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-background/5 backdrop-blur-sm px-4 py-4 flex flex-col gap-2 mt-2 select-none">
                <div className="flex gap-2 items-center">
                    <SquareChartGantt className="w-4 h-4" />
                    <span className="text-sm font-bold">比赛时间段</span>
                </div>
                <div className="flex flex-col px-2 py-1 bg-foreground/10 rounded-sm gap-1 mt-1">
                    <div className="flex gap-2 items-center">
                        <ClockArrowUp className="w-4 h-4" />
                        <span className="text-sm font-bold">比赛开始时间: {dayjs(gameInfo?.start_time).format("YYYY-MM-DD HH:mm:ss")}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                        <ClockArrowDown className="w-4 h-4" />
                        <span className="text-sm font-bold">比赛结束时间: {dayjs(gameInfo?.end_time).format("YYYY-MM-DD HH:mm:ss")}</span>
                    </div>
                </div>
                {stageMode && (
                    <div className="flex flex-col gap-2 mt-1">
                        {gameInfo.stages.map((e, idx) => (
                            <div className={`flex flex-col gap-1 ${ checkIfInStages(e) ? "text-orange-400" : "" }`} key={idx}>
                                <span className="text-sm font-bold">Stage{idx + 1} - {e.stage_name}</span>
                                <div className="flex gap-1 items-center">
                                    <div className="flex gap-2 items-center bg-foreground/10 rounded-full px-2 py-1">
                                        <ClockArrowUp className="w-4 h-4" />
                                        <span className="text-sm font-bold">{dayjs(e.start_time).format("YYYY-MM-DD HH:mm:ss")}</span>
                                    </div>
                                    <span>-</span>
                                    <div className="flex gap-2 items-center bg-foreground/10 rounded-full px-2 py-1">
                                        <ClockArrowDown className="w-4 h-4" />
                                        <span className="text-sm font-bold">{dayjs(e.end_time).format("YYYY-MM-DD HH:mm:ss")}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}