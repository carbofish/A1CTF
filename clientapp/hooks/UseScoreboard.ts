import useSWR from "swr"
import { TeamTimelineLowCost } from "utils/A1API"
import { api } from "utils/ApiHelper"

export const useScoreboardTimeLine = (gameID: number, teamID: number) => {
    const {
        data: teamTimeLine,
        isLoading: teamTimeLineLoading,
        mutate: mutateTeamTimeLine
    } = useSWR<TeamTimelineLowCost | undefined>(`/game/${gameID}/scoreboard/${teamID}/timeline`, async () => {
        if (!gameID) return undefined
        if (!teamID) return undefined
        const res = await api.user.userGetGameScoreboardTimeLine(gameID, teamID)
        return res.data.data
    })

    return { teamTimeLine, teamTimeLineLoading, mutateTeamTimeLine }
}