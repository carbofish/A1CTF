import { A1GameStatus } from "components/modules/game/GameStatusEnum";
import ImageLoader from "components/modules/ImageLoader";
import TimerDisplay from "components/modules/TimerDisplay";
import { useGlobalVariableContext } from "contexts/GlobalVariableContext";
import dayjs from "dayjs";
import { Ban, CalendarArrowDown, CalendarArrowUp, CirclePlay, ClockAlert, Dumbbell, Hourglass, Package, TicketCheck, User, Users, UsersRound } from "lucide-react";
import { useState } from "react";
import { FastAverageColor } from "fast-average-color";
import { ParticipationStatus, UserFullGameInfo } from "utils/A1API";
import { useTranslation } from "react-i18next";

export default function GamePosterInfoModule(
    {
        gameInfo,
        gameStatus,
        teamStatus
    }: {
        gameInfo: UserFullGameInfo | undefined,
        gameStatus: A1GameStatus,
        teamStatus: ParticipationStatus
    }
) {
    const { t } = useTranslation("game_view")
    const { clientConfig } = useGlobalVariableContext()

    const [posterTextPrimaryColor, setPosterTextPrimaryColor] = useState("white")
    const [posterPrimaryColor, setPosterPrimaryColor] = useState([255, 255, 255, 255])

    const gameStatusElement = {
        "ended": (
            <div className="flex gap-4 items-center">
                <ClockAlert size={36} />
                <span className="text-2xl font-bold">{t("game_finished")}</span>
            </div>
        ),
        "practiceMode": (
            <div className="flex gap-4 items-center">
                <Dumbbell size={36} />
                <span className="text-2xl font-bold">{t("practice")}</span>
            </div>
        ),
        "running": (
            <div className="flex flex-col gap-4 items-center">
                <div className="flex gap-4 items-center">
                    <CirclePlay size={36} />
                    <span className="text-2xl font-bold">{t("time_to_finish")}</span>
                </div>
                <TimerDisplay
                    className="text-xl font-bold"
                    targetTime={dayjs(gameInfo?.end_time)}
                    onFinishCallback={() => { }}
                />
            </div>
        ),
        "pending": (
            <div className="flex flex-col gap-4 items-center">
                <div className="flex gap-4 items-center">
                    <Hourglass size={36} />
                    <span className="text-2xl font-bold">{t("time_to_start")}</span>
                </div>
                <TimerDisplay
                    className="text-xl font-bold"
                    targetTime={dayjs(gameInfo?.start_time)}
                    onFinishCallback={() => { }}
                />
            </div>
        ),
    }

    return (
        <div className="flex flex-col w-full overflow-hidden select-none lg:gap-16 gap-6">
            <div className="relative rounded-xl overflow-hidden border-2"
                style={{
                    borderColor: `rgba(${posterPrimaryColor[0]}, ${posterPrimaryColor[1]}, ${posterPrimaryColor[2]}, ${posterPrimaryColor[3]})`
                }}
            >
                <div className="w-full aspect-video bg-background overflow-hidden">
                    <ImageLoader
                        src={gameInfo?.poster || clientConfig.DefaultBGImage}
                        className=""
                        onLoad={(e) => {
                            const fac = new FastAverageColor();
                            const container = e.target as HTMLImageElement;

                            fac.getColorAsync(container)
                                .then((color: any) => {
                                    const brightness = 0.2126 * color.value[0] + 0.7152 * color.value[1] + 0.0722 * color.value[2];
                                    setPosterPrimaryColor(color.value)
                                    const brightColor = brightness > 128 ? "white" : "black";
                                    setPosterTextPrimaryColor(brightColor)
                                })
                                .catch((_) => {

                                });
                        }}
                    />
                </div>
                <div className="absolute bottom-0 w-full overflow-hidden backdrop-blur-md"
                    style={{
                        backgroundColor: `rgba(${posterPrimaryColor[0]}, ${posterPrimaryColor[1]}, ${posterPrimaryColor[2]}, 0.3)`
                    }}
                >
                    <div className="w-full h-full py-4 px-7">
                        <div className="flex gap-6 items-center">
                            <img
                                width={"12%"}
                                height={"12%"}
                                className="min-w-[48px] min-h-[48px]"
                                src={
                                    posterTextPrimaryColor == "white" ? gameInfo?.game_icon_light ?? clientConfig.SVGIconLight : gameInfo?.game_icon_dark ?? clientConfig.SVGIconDark
                                }
                                alt={gameInfo?.name ?? "A1CTF ???????"}
                            />
                            <div className={`flex flex-col min-w-0 ${posterTextPrimaryColor == "white" ? "text-black" : "text-white"}`}>
                                <span className="font-bold text-2xl text-nowrap pointer-events-auto overflow-ellipsis overflow-hidden whitespace-nowrap block"
                                    data-tooltip-content={gameInfo?.name}
                                    data-tooltip-id="my-tooltip"
                                    data-tooltip-place="top"
                                >{gameInfo?.name}</span>
                                <span className="text-md text-nowrap overflow-ellipsis pointer-events-auto overflow-hidden whitespace-nowrap block"
                                    data-tooltip-content={gameInfo?.summary}
                                    data-tooltip-id="my-tooltip"
                                    data-tooltip-place="bottom"
                                >{gameInfo?.summary}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex gap-2 w-full justify-center items-center">
                {(gameStatusElement as any)[gameStatus]}
            </div>
            <div className="flex flex-col w-full justify-center items-center gap-4 mt-[-16px]">
                <div className="flex gap-4 items-center">
                    <div className="flex gap-2 rounded-full border-1 items-center bg-blue-400/60 border-blue-400 px-4 py-1 text-black/70">
                        <UsersRound size={20} />
                        <span>{t("person_limit")}: {gameInfo?.team_number_limit}</span>
                    </div>
                    <div className="flex gap-2 rounded-full border-1 items-center bg-orange-400/60 border-orange-400 px-4 py-1 text-black/70">
                        <Package size={20} />
                        <span>{t("contianer_limit")}: {gameInfo?.container_number_limit}</span>
                    </div>
                </div>
                <div className="flex gap-2 rounded-full border-1 items-center bg-green-400/60 border-green-500 px-4 py-1 text-black/70">
                    <CalendarArrowUp size={20} />
                    <span>{dayjs(gameInfo?.start_time).format("YYYY-MM-DD HH:mm:ss")}</span>
                    <span>-</span>
                    <CalendarArrowDown size={20} />
                    <span>{dayjs(gameInfo?.end_time).format("YYYY-MM-DD HH:mm:ss")}</span>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex gap-2 rounded-full border-1 items-center bg-purple-400/60 border-purple-400 px-4 py-1 text-black/70">
                        <TicketCheck size={20} />
                        <span>{t("team_count")}</span>
                        <User size={20} />
                        <span>{gameInfo?.player_count} / </span>
                        <Users size={20} />
                        <span>{gameInfo?.team_count}</span>
                    </div>
                    { !gameInfo?.scoreboard_enabled && (
                        <div className="flex gap-2 rounded-full border-1 items-center bg-red-400/60 border-red-400 px-4 py-1 text-black/70">
                            <Ban size={20} />
                            <span>{t("no_scoreboard")}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}