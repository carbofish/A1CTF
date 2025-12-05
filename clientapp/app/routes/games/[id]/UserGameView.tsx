
import { ChallengesView } from 'components/user/game/ChallengesView';
import MyTeamInfomationView from "components/user/game/MyTeamInfomationView";
import ScoreBoardPage from "components/user/game/ScoreBoardPage";
import GameViewSidebar from "components/user/game/GameViewSidebar";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import GameInfoView from "components/user/game/GameInfoView";
import { useGameSwitchContext } from "contexts/GameSwitchContext";
import { Ban, Panda } from "lucide-react";
import { A1GameStatus } from "components/modules/game/GameStatusEnum";
import { useGame } from "hooks/UseGame";
import { useTranslation } from 'react-i18next';
import { useGlobalVariableContext } from 'contexts/GlobalVariableContext';

export default function Games() {

    const { id } = useParams();
    const { module } = useParams()
    const navigate = useNavigate()

    const { t } = useTranslation("game_view")

    if (!id) {
        return <div>404</div>
    }

    const gameID = parseInt(id, 10)

    const { gameInfo, gameStatus, isLoading } = useGame(gameID)
    const { isAdmin } = useGlobalVariableContext()

    useEffect(() => {
        if (!module) navigate(`/games/${id}/info`)
        setCurChoicedModule(module || "info")
    }, [module])

    const [curChoicedModule, setCurChoicedModule] = useState(module || "info")

    // 切换比赛动画
    const { setIsChangingGame } = useGameSwitchContext();

    let updateGameInterval: NodeJS.Timeout | undefined = undefined


    useEffect(() => {
        setTimeout(() => {
            setIsChangingGame(false)
        }, 500)

        return () => {
            clearInterval(updateGameInterval)
        }
    }, [])

    if (isLoading) return <></>

    if (gameStatus == A1GameStatus.NoSuchGame) {
        return (
            <div className="w-screen h-screen flex items-center justify-center gap-6 select-none">
                <Panda size={64} />
                <span className="text-4xl font-bold">{t("error_game")}</span>
            </div>
        )
    }

    return (
        <div className="p-0 h-screen relative">
            <div className="flex w-full h-full">
                <GameViewSidebar
                    curChoicedModule={curChoicedModule}
                    gameID={gameID}
                />
                <div className="flex-1 h-full overflow-hidden">
                    {curChoicedModule == "challenges" ? (
                        <ChallengesView
                            gameID={gameID}
                        />
                    ) : <></>}

                    {curChoicedModule == "scoreboard" ? (
                        <div className="relative w-full h-full">
                            { !gameInfo?.scoreboard_enabled && !isAdmin() ? (
                                <div className="w-screen h-screen flex items-center justify-center gap-6 select-none">
                                    <Panda size={64} />
                                    <span className="text-4xl font-bold">{t("scoreboard_disabled")}</span>
                                </div>
                            ) : (
                                <ScoreBoardPage gmid={parseInt(id)} />
                            ) }
                        </div>
                    ) : <></>}

                    {curChoicedModule == "team" && (
                        <MyTeamInfomationView
                            gameID={gameID}
                        />
                    )}

                    {curChoicedModule == "info" && (
                        <GameInfoView
                            gameID={gameID}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
