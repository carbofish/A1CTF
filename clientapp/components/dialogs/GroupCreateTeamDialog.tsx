import { Button } from "components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "components/ui/dialog"
import { Input } from "components/ui/input"

import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "components/ui/form"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useEffect, useState } from "react";
import { Textarea } from "../ui/textarea";
import { api } from "utils/ApiHelper";
import { toast } from 'react-toastify/unstyled';
import { useTranslation } from "react-i18next";
import { useGame } from "hooks/UseGame"

import { validate as uuidValidate } from 'uuid';
import { Sparkle, UsersRound } from "lucide-react"

export const GroupCreateTeamDialog: React.FC<{ callback: () => void, gameID: number, children: React.ReactNode }> = ({ callback: updateTeam, gameID, children }) => {

    const { t } = useTranslation("teams")
    const { gameInfo } = useGame(gameID)
    const [curStage, setCurStage] = useState<string>("stage1")
    const [inviteCodeDetail, setInviteCodeDetail] = useState<any>(null)

    const formSchema = z.object({
        teamName: z.string().min(2, {
            message: t("form_team_name_error"),
        }),
        slogan: z.string(),
        description: z.string().optional(),
        groupId: z.string().optional(),
        invite_code: gameInfo?.group_invite_code_enabled ? z.string().uuid() : z.string().optional(),
    })

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            teamName: "",
            slogan: "",
            groupId: undefined,
            invite_code: undefined,
        },
    })

    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setCurStage("stage1")
        form.reset()
    }, [isOpen])

    function onSubmit(values: z.infer<typeof formSchema>) {
        const payload: any = {
            name: values.teamName,
            slogan: values.slogan,
            description: values.description ?? "",
            invite_code: values.invite_code ?? undefined,
        }

        if (values.groupId != "all" && values.groupId) {
            payload.group_id = parseInt(values.groupId)
        }

        api.user.userGameCreateTeam(gameID, payload).then(() => {
            toast.success(t("create_team_success"))
            updateTeam()
            setIsOpen(false)
        })
    }

    const watched_invite_code = useWatch({
        control: form.control,
        name: "invite_code",
        defaultValue: "",
    })

    return (
        <Dialog open={isOpen} onOpenChange={(status) => {
            if (status) form.reset()
            setIsOpen(status)
        }}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px] select-none"
                onInteractOutside={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>{t("create_team")}</DialogTitle>
                    <DialogDescription>
                        {t("group_create_team_desc")}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <>
                        {curStage == "stage1" && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="invite_code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("group_invite_code")}</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="group invite code here" {...field} autoComplete="off" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button type="submit" onClick={() => {
                                    if (!uuidValidate(form.getValues("invite_code"))) {
                                        form.setError("invite_code", { message: t("form_invite_code_error") })
                                        return
                                    }
                                    api.user.userGetGroupInviteCodeDetail(gameID, {
                                        invite_code: form.getValues("invite_code") ?? "",
                                    }).then((res) => {
                                        setInviteCodeDetail(res.data.data)
                                        setCurStage("stage2")
                                    })
                                }}>
                                    {t("next_step")}
                                </Button>
                            </>
                        )}

                        {curStage == "stage2" && (
                            <>
                                <div className="flex items-center justify-center">
                                    <div className="flex flex-col gap-2 px-4 py-3 bg-foreground/5 rounded-xl w-fit">
                                        <div className="flex gap-2 items-center text-purple-500">
                                            <Sparkle size={18} />
                                            <span className="text-xs">InviteCode: {watched_invite_code}</span>
                                        </div>
                                        <div className="flex gap-2 items-center text-blue-500">
                                            <UsersRound size={18} />
                                            <span className="text-xs">Team: { inviteCodeDetail.group_name } #{ inviteCodeDetail.group_id }</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="teamName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("team_name")}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="a1team" {...field} autoComplete="off" />
                                                </FormControl>
                                                <FormDescription>
                                                    {t("team_name_desc")}
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="slogan"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("slogan")}</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="We can win!" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>队伍描述</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="It's a team" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" onClick={form.handleSubmit(onSubmit)}>
                                        {t("submit")}
                                    </Button>
                                </div>
                            </>
                        )}
                    </>
                </Form>
            </DialogContent>
        </Dialog>
    )
}