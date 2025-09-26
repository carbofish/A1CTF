import { EditChallengeView } from "./EditChallengeView";
import { AdminChallengeConfig } from "utils/A1API";
import { api } from "utils/ApiHelper";
import useSWR from "swr";

export function EditChallengePage({ challenge_id }: { challenge_id: number }) {
    const { data: challengeInfo = null } = useSWR<AdminChallengeConfig>(
        `/api/admin/challenge/${challenge_id}`,
        () => api.admin.getChallengeInfo(challenge_id).then((res) => res.data.data)
    )

    return (
        <>
            {challengeInfo && <EditChallengeView challenge_info={challengeInfo} />}
        </>
    );
}