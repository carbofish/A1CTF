import SafeComponent from "components/SafeComponent"
import { EditChallengePage } from "components/admin/EditChallengePage";
import { useNavigate, useParams } from "react-router";

export default function Home() {

    const { challenge_id } = useParams();
    const navigate = useNavigate()

    if (!challenge_id) {
        navigate("/404")
        return
    }

    let cid = 0

    try {
        cid = parseInt(challenge_id);
    } catch {
        navigate("/404")
        return
    }

    return (
        <div className="p-0 h-screen flex flex-col">
            <SafeComponent animation={false}>
                <EditChallengePage challenge_id={cid} />
            </SafeComponent>
        </div>
    );
}