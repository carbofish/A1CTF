import SafeComponent from "components/SafeComponent"
import { AdminChallengeConfig, ChallengeCategory, FlagType, JudgeType } from "utils/A1API";
import { EditChallengeView } from "components/admin/EditChallengeView";

export default function Home() {
    const challengeConfig: AdminChallengeConfig = {
        name: "",
        description: "",
        category: ChallengeCategory.MISC,   // 默认MISC
        judge_config: {
            judge_type: JudgeType.DYNAMIC,
            judge_script: null,
            flag_template: ""
        },
        container_config: [],
        attachments: [],
        flag_type: FlagType.FlagTypeStatic, // 默认静态flag
        allow_wan: false,
        allow_dns: false,
    }
    return (
        <div className="p-0 h-screen flex flex-col">
            <SafeComponent animation={false}>
                <EditChallengeView challenge_info={challengeConfig} isCreate={true} />
            </SafeComponent>
        </div>
    );
}