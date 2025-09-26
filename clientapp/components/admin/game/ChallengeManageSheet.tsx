import { Button } from "components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "components/ui/sheet"
import { MacScrollbar } from "mac-scrollbar"
import { ReactNode, useEffect, useState } from "react"
import { JudgeConfigForm } from "./JudgeConfigForm"
import { useTheme } from "next-themes"
import { useForm } from "react-hook-form"
import { Form } from 'components/ui/form';
import { GameChallengeSchema } from "./EditGameSchema"

import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AdminDetailGameChallenge } from "utils/A1API"
import { api } from "utils/ApiHelper"
import { Save } from "lucide-react"
import { toast } from 'react-toastify/unstyled';
import LoadingModule from "components/modules/LoadingModule"
import ChallengeSettingsSidebar from "./ChallengeSettingsSidebar"
import { ContainerManageView } from "./ContainerManageView"
import { GameEventModule } from "./GameEventModule"
import ChallengeTools from "./ChallengeTools"
import { ChallengeManageFormWrapper } from "./ChallengeManageForm"
import { useTranslation } from "react-i18next"

export default function ChallengeManageSheet(
    {
        children,
        gameID,
        challengeID,
    }: {
        children: ReactNode,
        gameID: number,
        challengeID: number,
    }
) {

    // 初始化的时候加载 game_edit 的 i18n，防止切换到容器管理和事件管理的时候页面会有感刷新
    useTranslation("game_edit")

    const { t } = useTranslation("challenge_manage")
    const { theme } = useTheme()
    const [isOpen, setIsOpen] = useState(false)
    const [isDataLoaded, setIsDataLoaded] = useState(false)
    const [curChoicedModule, setCurChoicedModule] = useState("challenge_settings")
    const [challengeDetail, setChallengeDetail] = useState<AdminDetailGameChallenge | undefined>(undefined)

    const form = useForm<z.infer<typeof GameChallengeSchema>>({
        resolver: zodResolver(GameChallengeSchema),
        defaultValues: {}
    })

    useEffect(() => {
        if (challengeDetail) {
            form.reset(challengeDetail as any)
            setIsDataLoaded(true)
        }
    }, [challengeDetail])

    useEffect(() => {
        if (isOpen && challengeDetail == undefined) {
            api.admin.getGameChallenge(gameID, challengeID).then((res) => {
                setChallengeDetail(res.data.data)
            })
        }
    }, [isOpen])

    const handleSubmit = (values: z.infer<typeof GameChallengeSchema>) => {
        api.admin.updateGameChallenge(gameID, challengeID, values as any as AdminDetailGameChallenge).then(() => {
            toast.success(t("update_success"))
        })
    }

    return (
        <Sheet
            modal={false}
            open={isOpen}
            onOpenChange={setIsOpen}
        >
            <SheetTrigger asChild>
                {children}
            </SheetTrigger>
            <SheetContent
                onInteractOutside={(e) => e.preventDefault()}
                className="backdrop-blur-md bg-background/40 !w-[70%] !max-w-none"
                hideClose
            >
                <div className="flex overflow-hidden h-full">
                    <ChallengeSettingsSidebar
                        curChoicedModule={curChoicedModule}
                        setCurChoicedModule={setCurChoicedModule}
                        setSheetOpen={setIsOpen}
                    />
                    <MacScrollbar className="flex-1 h-full overflow-y-auto"
                        skin={theme == "light" ? "light" : "dark"}
                    >
                        <div className="px-10 py-10">

                            {curChoicedModule == "challenge_settings" && challengeDetail?.challenge_id ? (
                                <div>
                                    <SheetHeader className="p-0 mb-5">
                                        <SheetTitle>
                                            <div className="flex w-full items-center h-[38px]">
                                                <span className="font-bold text-2xl">{t("setting")}</span>
                                            </div>
                                        </SheetTitle>
                                        <SheetDescription>
                                            {t("setting_description")}
                                        </SheetDescription>
                                    </SheetHeader>
                                    <ChallengeManageFormWrapper
                                        challenge_id={challengeDetail?.challenge_id}
                                    />
                                </div>
                            ) : <></>}

                            {curChoicedModule == "game_settings" ? (
                                <>
                                    <SheetHeader className="p-0 mb-5">
                                        <SheetTitle>
                                            <div className="flex w-full items-center  h-[38px]">
                                                <span className="font-bold text-2xl">{t("judge_and_hint")}</span>
                                            </div>
                                        </SheetTitle>
                                        <SheetDescription>
                                            {t("judge_and_hint_description")}
                                        </SheetDescription>
                                    </SheetHeader>
                                    {isDataLoaded ? (
                                        <Form {...form}>

                                            <div className="flex flex-col gap-4">
                                                <JudgeConfigForm
                                                    control={form.control}
                                                    form={form}
                                                />
                                            </div>
                                        </Form>
                                    ) : (
                                        <div className="flex w-full h-[400px] items-center justify-center">
                                            <LoadingModule />
                                        </div>
                                    )}
                                    <div className="flex gap-4 items-center">
                                        <Button className="mt-5"
                                            variant="outline"
                                            onClick={form.handleSubmit(handleSubmit)}
                                        >
                                            <Save />
                                            {t("save")}
                                        </Button>
                                    </div>
                                </>
                            ) : <></>}

                            {curChoicedModule == "containers" ? (
                                <div>
                                    <div className="flex w-full items-center  h-[38px]">
                                        <span className="font-bold text-2xl">{t("container")}</span>
                                    </div>
                                    <ContainerManageView
                                        gameId={gameID}
                                        challengeID={challengeID}
                                    />
                                </div>
                            ) : <></>}

                            {curChoicedModule == "submissions" ? (
                                <GameEventModule
                                    GgameID={gameID}
                                    GchallengeID={challengeID}
                                />
                            ) : <></>}

                            {curChoicedModule == "tools" ? (
                                <div>
                                    <div className="flex w-full items-center  h-[38px]">
                                        <span className="font-bold text-2xl">{t("challenge_tool")}</span>
                                    </div>
                                    <ChallengeTools
                                        gameID={gameID}
                                        challengeID={challengeID}
                                    />
                                </div>
                            ) : <></>}
                        </div>
                    </MacScrollbar>
                </div>
            </SheetContent>
        </Sheet >
    )
}