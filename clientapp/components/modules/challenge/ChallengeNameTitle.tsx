import { CircleCheckBig, Citrus, Flag, Info, ScanHeart } from "lucide-react";
import { ChallengeSolveStatus } from "components/user/game/ChallengesView";
import { UserDetailGameChallenge } from "utils/A1API";
import { Badge } from "components/ui/badge";
import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";

export default function ChallengeNameTitle({
    challengeSolveStatusList,
    curChallenge,
    setShowHintsWindowVisible
}: {
    challengeSolveStatusList: Record<number, ChallengeSolveStatus | undefined>,
    curChallenge: UserDetailGameChallenge,
    setShowHintsWindowVisible: Dispatch<SetStateAction<boolean>>
}) {
    const { t } = useTranslation("challenge_view")
    return (
        <div className={`flex items-center gap-2 px-5 h-[56px] border-2 rounded-xl bg-foreground/[0.04] backdrop-blur-sm`}>
            <Info />
            <span className="font-bold text-lg">{t("challenge_info")} - {curChallenge.challenge_name}</span>
            {/* 有已放出或待放出的 hint 时都显示入口，待放出的提示信息在 hint 窗口里展示 */}
            {curChallenge.hints?.length || curChallenge.pending_hint_count ? (
                <Badge className="select-none p-0 ml-2 rounded-[20px_20px_20px_20px] pr-[5px] pl-[4px] bg-yellow-500 hover:bg-yellow-600"
                    onClick={() => {
                        setShowHintsWindowVisible(true);
                    }}
                >
                    <div className="flex items-center gap-[6px] p-[4px]">
                        <Citrus size={20} />
                        <span className="font-bold text-[14px]">{curChallenge.hints?.length ?? 0} {t("hints")}{curChallenge.pending_hint_count ? ` (+${curChallenge.pending_hint_count})` : ""}</span>
                    </div>
                </Badge>
            ) : (<></>)}
            <div className="flex-1" />
            <div className="items-center gap-4 hidden lg:flex select-none">
                {challengeSolveStatusList[curChallenge.challenge_id || 0]?.solved ? (
                    <div className="flex items-center gap-2 text-purple-600">
                        <ScanHeart className="flex-none " />
                        <span className="text-sm lg:text-md font-bold">{challengeSolveStatusList[curChallenge.challenge_id || 0]?.cur_score ?? "?"} pts</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-amber-600">
                        <Flag className="flex-none" />
                        <span className="text-sm lg:text-md font-bold">{challengeSolveStatusList[curChallenge.challenge_id || 0]?.cur_score ?? "?"} pts</span>
                    </div>
                )}
                <div className="flex items-center gap-2 text-green-600">
                    <CircleCheckBig />
                    <span className="text-sm lg:text-md font-bold">{challengeSolveStatusList[curChallenge.challenge_id || 0]?.solve_count ?? "?"} solves</span>
                </div>
            </div>
        </div>
    )
}