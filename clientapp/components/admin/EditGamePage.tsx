import { AdminFullGameInfo } from "utils/A1API";
import { api } from "utils/ApiHelper";
import { EditGameView } from "./EditGameView";
import useSWR from "swr";

export function EditGamePage({ game_id }: { game_id: number }) {

    const { data: gameInfo = null } = useSWR<AdminFullGameInfo>(
        `/api/admin/game/${game_id}`,
        () => api.admin.getGameInfo(game_id).then(res => res.data.data))

    return (
        <>
            {gameInfo && <EditGameView game_info={gameInfo} />}
        </>
    );
}