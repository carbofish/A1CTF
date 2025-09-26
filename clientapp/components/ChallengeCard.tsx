import { ChevronsRight, Dices, CircleCheckBig, EyeOff } from "lucide-react"

import { FC, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion";
import { challengeCategoryColorMap } from "utils/ClientAssets";
import { useGlobalVariableContext } from "contexts/GlobalVariableContext";
import { useGame } from "hooks/UseGame";
import dayjs from "dayjs";

interface ChallengeInfo {
    type: string,
    name: string,
    solved: number,
    score: number,
    rank: number,
    choiced: boolean,
    status: boolean,
    visible: boolean,
    belongStage: string | undefined,
    gameID: number
}

export const ChallengeCard: FC<ChallengeInfo & React.HTMLAttributes<HTMLDivElement>> = ({
    type, name, solved, score, rank: _rank, choiced, status, visible, gameID, belongStage, ...props
}) => {

    const {
        gameInfo
    } = useGame(gameID)

    let colorClass = "bg-amber-600";
    const [solveStatus, setSolveStatus] = useState(false)

    // 解决懒加载重新播放动画的问题
    const [shouldAnime, setShouldAnime] = useState(false)
    const prevStatus = useRef(false)

    const { isAdmin } = useGlobalVariableContext()

    const colorMap: { [key: string]: string } = challengeCategoryColorMap

    if (type in colorMap) colorClass = colorMap[type]
    else colorClass = colorMap["misc"]

    useEffect(() => {
        setSolveStatus(status)
        prevStatus.current = status
        return () => {

        }
    }, [])

    useEffect(() => {
        if (prevStatus.current != status) {
            if (status == true) {
                setShouldAnime(status)
                setTimeout(() => {
                    setShouldAnime(false)
                }, 4000)
            }
            setSolveStatus(status)
            prevStatus.current = status
        }
    }, [status])

    const getCurGameStage = () : string | undefined => {
        if (gameInfo?.stages) {
            for (const stage of gameInfo.stages) {
                if (dayjs(stage.end_time) >= dayjs() && dayjs(stage.start_time) <= dayjs()) {
                    return stage.stage_name
                }
            }
        }
        return undefined
    }

    return (
        <div className={
            `w-full h-[100px] ${isAdmin() && (visible ? "" : "opacity-40")} border-2 rounded-xl relative hover:scale-[1.04] pl-4 pt-4 pr-4 pb-3 select-none overflow-hidden transition-all duration-300 will-change-transform 
            ${solveStatus ? "bg-green-200/[0.3] border-green-300/40" : "bg-background/[0.3]"}
            ${ getCurGameStage() != belongStage && belongStage && !isAdmin() ? "opacity-40" : "" }
            `}
            {...props}
        >
            <AnimatePresence>
                {shouldAnime && (
                    <>
                        <motion.div className="absolute w-full h-full top-0 left-0 z-100"
                            initial={{
                                backdropFilter: "blur(0px)"
                            }}
                            animate={{
                                backdropFilter: "blur(10px)"
                            }}
                            exit={{
                                backdropFilter: "blur(0px)"
                            }}
                            transition={{
                                duration: 0.5
                            }}
                        >

                        </motion.div>
                        <motion.div
                            className="absolute w-full h-full top-0 left-0 flex justify-center items-center"
                            initial={{
                                opacity: 0
                            }}
                            animate={{
                                opacity: 1
                            }}
                            exit={{
                                opacity: 0
                            }}
                            transition={{
                                duration: 0.5,
                                // delay: 0.2,
                                ease: "anticipate"
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <CircleCheckBig size={40} />
                                <span className="text-2xl font-bold">Solved!</span>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            <div className="flex flex-col h-full w-full">
                <div className="flex items-center gap-1">
                    <div id="card-title" className="flex justify-start items-center gap-2 min-w-0 h-[32px]" >
                        {isAdmin() && !visible ? (
                            <>
                                <EyeOff size={23} className="flex-none transition-colors duration-300" style={{ color: !choiced ? "" : colorClass }} />
                                <span className={`font-bold text-ellipsis whitespace-nowrap overflow-hidden transition-colors duration-300`} style={{ color: !choiced ? "" : colorClass }} >{name}</span>
                            </>
                        ) : (
                            <>
                                <Dices size={23} className="flex-none transition-colors duration-300" style={{ color: !choiced ? "" : colorClass }} />
                                <span className={`font-bold text-ellipsis whitespace-nowrap overflow-hidden transition-colors duration-300`} style={{ color: !choiced ? "" : colorClass }}>{name}</span>
                            </>
                        )}

                    </div>

                    {solveStatus ? (
                        <>
                            <div className="flex-1" />
                            <div className="flex justify-end gap-[2px] w-[32px] h-full items-center text-green-600">
                                <CircleCheckBig size={23} />
                            </div>
                        </>
                    ) : <></>}

                </div>
                <div className="flex-1" />
                <div className="flex items-center transition-colors duration-300">
                    <div className="flex justify-start">
                        <span className="font-bold">{solved} solves & {score} pts</span>
                    </div>
                    <div className="flex-1" />
                    <div className="flex justify-end items-center">
                        {/* <span className="font-bold">Try</span> */}
                        <ChevronsRight size={32} />
                    </div>
                </div>
            </div>
        </div>
    )
}