import { Button } from "components/ui/button";
import InGameChallengeManageSheet from "./InGameChallengeManageSheet";
import { Loader2, PanelTopClose, PanelTopOpen, Trash2, Wrench } from "lucide-react";
import { api } from "utils/ApiHelper";
import { UserDetailGameChallenge, UserSimpleGameChallenge } from "utils/A1API";
import { Dispatch, SetStateAction, useState } from "react";
import AlertConformer from "components/modules/AlertConformer";
import { toast } from "react-toastify/unstyled";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

export default function InGameManageButtons(
    { gameID, curChallenge, setCurChallenge, setChallenges }: {
        gameID: number,
        curChallenge: UserDetailGameChallenge | undefined,
        setCurChallenge: Dispatch<SetStateAction<UserDetailGameChallenge | undefined>>,
        setChallenges: Dispatch<SetStateAction<Record<string, UserSimpleGameChallenge[]>>>,
    }
) {

    const [switchVisibleLoading, setSwitchVisibleLoading] = useState(false)
    const { t } = useTranslation("challenge_manage")

    const switchVisible = () => {
        setSwitchVisibleLoading(true)
        api.admin.updateGameChallenge(gameID, curChallenge?.challenge_id ?? 0, {
            visible: !curChallenge?.visible
        }).then(() => {
            if (curChallenge) {
                setSwitchVisibleLoading(false)
                setCurChallenge({
                    ...curChallenge,
                    visible: !curChallenge.visible
                });

                setChallenges((prev) => ({
                    ...prev,
                    [curChallenge.category?.toLocaleLowerCase() ?? "0"]: prev[curChallenge.category?.toLocaleLowerCase() ?? "0"].map((c) => {
                        
                        if (c.challenge_id == curChallenge.challenge_id) {
                            return {
                                ...c,
                                visible: !c.visible
                            }
                        }
                        return c
                    })
                }))
            }
        })
    }

    const [searchParams, setSearchParams] = useSearchParams()

    const deleteChallenge = () => {
        api.admin.deleteGameChallenge(gameID, curChallenge?.challenge_id ?? 0).then(() => {
            // 设置当前选中的题目
            setCurChallenge(undefined)

            // 删除题目列表里的题目
            setChallenges((prev) => {
                const categoryKey = curChallenge?.category?.toLocaleLowerCase() ?? "0";
                const filteredChallenges = prev[categoryKey]?.filter(
                    (c) => c.challenge_id !== curChallenge?.challenge_id
                ) || [];

                // 如果过滤后的数组不为空，则更新该分类
                if (filteredChallenges.length > 0) {
                    return {
                        ...prev,
                        [categoryKey]: filteredChallenges
                    };
                }

                // 如果过滤后数组为空，则删除该分类
                const newChallenges = { ...prev };
                delete newChallenges[categoryKey];
                return newChallenges;
            });

            // 移除旧的 id 参数
            const newParams = new URLSearchParams(searchParams);
            newParams.delete("id");
            setSearchParams(newParams)

            toast.success(t("delete_success"))
        })
    }

    return (
        <div className="absolute bottom-0 left-0 p-5 z-10 flex flex-col gap-2">
            <AlertConformer
                title={t("alert_title")}
                description={t("delete_description")}
                onConfirm={deleteChallenge}
                type="danger"
            >
                <Button variant="ghost" size="icon"
                    className={`rounded-xl w-12 h-12 [&_svg]:size-6 bg-foreground/10 hover:hover:bg-foreground/20 cursor-pointer text-red-400`}
                    data-tooltip-id="my-tooltip"
                    data-tooltip-html={t("delete")}
                    data-tooltip-place="right"
                >
                    <Trash2 />
                </Button>
            </AlertConformer>
            <AlertConformer
                title={t("alert_title")}
                description={t("switch_description")}
                onConfirm={switchVisible}
            >
                <Button variant="ghost" size="icon"
                    className={`rounded-xl w-12 h-12 [&_svg]:size-6 bg-foreground/10 hover:hover:bg-foreground/20 cursor-pointer ${curChallenge?.visible ? "text-red-400" : "text-blue-400"}`}
                    data-tooltip-id="my-tooltip"
                    data-tooltip-html={curChallenge?.visible ? t("offline") : t("online")}
                    data-tooltip-place="right"
                    disabled={switchVisibleLoading}
                >
                    {switchVisibleLoading ? (
                        <Loader2 className="animate-spin" />
                    ) : curChallenge?.visible ? <PanelTopOpen /> : <PanelTopClose />}
                </Button>
            </AlertConformer>
            <InGameChallengeManageSheet
                gameID={gameID}
                challengeID={curChallenge?.challenge_id ?? 0}
            >
                <Button variant="ghost" size="icon" className="rounded-xl w-12 h-12 [&_svg]:size-6 bg-foreground/10 hover:hover:bg-foreground/20 cursor-pointer"
                    data-tooltip-id="my-tooltip"
                    data-tooltip-html={t("magic_tool")}
                    data-tooltip-place="right"
                >
                    <Wrench />
                </Button>
            </InGameChallengeManageSheet>
        </div>
    )
}