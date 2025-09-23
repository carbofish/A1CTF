import { Button } from "components/ui/button";
import { useNavigateFrom } from "hooks/NavigateFrom";
import { AudioWaveform, ChartNoAxesCombined, Flag, IdCard, KeyRound, PencilLine, Pickaxe, ScanFace, ScanText, Users, Lock, Star } from "lucide-react";
import { ParticipationStatus } from "utils/A1API";

import { CreateTeamDialog } from "components/dialogs/CreateTeamDialog";
import { JoinTeamDialog } from "components/dialogs/JoinTeamDialog";
import { useGlobalVariableContext } from "contexts/GlobalVariableContext";
import { useGame } from "hooks/UseGame";
import { useTranslation } from "react-i18next";
import { GroupCreateTeamDialog } from "components/dialogs/GroupCreateTeamDialog";

export default function GameTeamStatusCard(
    { gameID }: { gameID: number }
) {
    const { t } = useTranslation("game_view")
    const { gameInfo, teamStatus, isLoading, mutateGameInfo } = useGame(gameID)

    const teamStatusElement = {
        "Pending": (
            <div className="flex flex-col gap-2 items-center backdrop-blur-sm rounded-2xl border-1 border-green-400 py-3 px-6 select-none">
                <div className="flex gap-2 items-center text-green-500">
                    <ScanText size={24} />
                    <span className="text-md font-bold">{t("team_pending")}</span>
                </div>
            </div>
        ),
        "Banned": (
            <div className="flex flex-col gap-2 items-center backdrop-blur-sm rounded-2xl border-1 border-red-400 py-3 px-6 select-none">
                <div className="flex gap-2 items-center text-red-500">
                    <Lock size={24} />
                    <span className="text-md font-bold">{t("team_banned")}</span>
                </div>
            </div>
        ),
        "UnRegistered": (
            <div className="flex flex-col gap-3 items-center bg-transparent backdrop-blur-sm border-blue-500 rounded-2xl border-1 py-4 px-6 select-none">
                <div className="flex gap-2 items-center text-blue-500">
                    <PencilLine size={24} />
                    <span className="text-md font-bold">{t("team_unregistered")}</span>
                </div>
                <div className="flex gap-4 pointer-events-auto">
                    { gameInfo?.group_invite_code_enabled ? (
                        <GroupCreateTeamDialog callback={() => {
                            mutateGameInfo()
                        }} gameID={gameInfo?.game_id ?? 0}>
                            <Button variant="outline" className="border-blue-300 hover:hover:bg-blue-300/10" type="button"><Pickaxe />{t("create_team")}</Button>
                        </GroupCreateTeamDialog>
                    ) : (
                        <CreateTeamDialog callback={() => {
                            mutateGameInfo()
                        }} gameID={gameInfo?.game_id ?? 0}>
                            <Button variant="outline" className="border-blue-300 hover:hover:bg-blue-300/10" type="button"><Pickaxe />{t("create_team")}</Button>
                        </CreateTeamDialog>
                    ) }
                    <JoinTeamDialog
                        game_id={gameInfo?.game_id ?? 0}
                        callback={() => {
                            mutateGameInfo()
                        }}>
                        <Button variant="outline" className="border-blue-300 hover:hover:bg-blue-300/10" type="button"><Users />{t("join_team")}</Button>
                    </JoinTeamDialog>
                </div>
            </div>
        )
    }

    const { isAdmin } = useGlobalVariableContext()

    const rankColor = (rank: number) => {
        if (rank == 1) return "text-red-400 font-bold"
        else if (rank == 2) return "text-green-400 font-bold"
        else if (rank == 3) return "text-blue-400 font-bold"
        else return ""
    }

    if (teamStatus != ParticipationStatus.Approved && teamStatus != ParticipationStatus.UnLogin) {
        return (
            (teamStatusElement as any)[teamStatus]
        )
    }

    if (isAdmin()) {
        return (
            <div className="flex px-5 py-2 flex-col gap-2 backdrop-blur-sm rounded-2xl select-none border-1 shadow-xl">
                <div className="flex gap-2 items-center text-red-400">
                    <Star className="size-5" />
                    <span>Admin Team</span>
                </div>
                <div className="flex gap-4">
                    <div className="flex gap-2 items-center">
                        <Flag className="size-5" />
                        <span>?? pts</span>
                    </div>
                    <div className={`flex gap-2 items-center transition-colors duration-300`}>
                        <ChartNoAxesCombined className="size-5" />
                        <span>Rank ??</span>
                    </div>
                </div>
            </div>
        )
    }

    if (isLoading) return <></>

    return (
        <div className="flex px-5 py-2 flex-col gap-2 backdrop-blur-sm rounded-2xl select-none border-1 shadow-xl">
            <div className="flex gap-2 items-center">
                <AudioWaveform className="size-5" />
                <span>{gameInfo?.team_info?.team_name}</span>
            </div>
            <div className="flex gap-4">
                <div className="flex gap-2 items-center">
                    <Flag className="size-5" />
                    <span>{gameInfo?.team_info?.team_score ?? 0} pts</span>
                </div>
                <div className={`flex gap-2 items-center transition-colors duration-300 ${rankColor(gameInfo?.team_info?.rank ?? 0)}`}>
                    <ChartNoAxesCombined className="size-5" />
                    <span>Rank {gameInfo?.team_info?.rank ?? 0}</span>
                </div>
            </div>
        </div>
    )
}

export function LoginFirstCard() {

    const { t } = useTranslation("game_view")
    const [navigateFrom, _getNavigateFrom] = useNavigateFrom()

    return (
        <div className="pl-5 pr-5 py-2 border-l-1 border-y-1 rounded-l-2xl w-full flex gap-6 items-center select-none">
            <div className="flex gap-3 items-center">
                <KeyRound size={26} />
                <span className="text-md font-bold">{t("not_login")}</span>
            </div>
            <div className="flex gap-3 items-center">
                <Button variant="outline" className="pointer-events-auto border-blue-400 hover:hover:bg-blue-400/10 text-blue-600 [&_svg]:size-[22px] gap-2 bg-transparent"
                    onClick={() => {
                        navigateFrom("/login")
                    }}
                >
                    <ScanFace />
                    <span className="text-[16px] font-bold">{t("login")}</span>
                </Button>
                <Button variant="outline" className="pointer-events-auto border-green-400 hover:hover:bg-green-400/10 text-green-600 [&_svg]:size-[22px] gap-2 bg-transparent"
                    onClick={() => {
                        navigateFrom("/signup")
                    }}
                >
                    <IdCard />
                    <span className="text-[16px] font-bold">{t("register")}</span>
                </Button>
            </div>
        </div>
    )
}