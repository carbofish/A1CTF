import { EditGameView } from "components/admin/EditGameView";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AdminFullGameInfo } from "utils/A1API";
import { api } from "utils/ApiHelper";
import { LoadingPage } from "components/LoadingPage";
import useSWR from "swr";


export default function GameSettings() {

    const { game_id } = useParams();
    const navigate = useNavigate()

    if (!game_id) {
        navigate("/404")
        return
    }

    let gid = 0
    try {
        gid = parseInt(game_id)
    } catch {
        navigate("/404")
        return
    }

    const [gameInfoFetchError, setGameInfoFetchError] = useState(false);

    const { data: gameInfo } = useSWR(
        `/api/admin/game/${gid}`,
        () => api.admin.getGameInfo(gid).then(res => res.data.data).catch((_) => {
            setGameInfoFetchError(true)
        })
    )

    if (!gameInfo) {
        if (gameInfoFetchError) {
            navigate("/404")
            return
        }
        return <LoadingPage visible={true} />;
    }

    return (
        <div className="w-screen h-screen">
            <EditGameView game_info={gameInfo} />
        </div>
    );
}