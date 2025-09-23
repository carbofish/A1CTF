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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "components/ui/select"

import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "components/ui/form"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useEffect, useState } from "react";
import { Textarea } from "../ui/textarea";
import { api } from "utils/ApiHelper";
import { toast } from 'react-toastify/unstyled';
import { useTranslation } from "react-i18next";
import { GameGroup } from "utils/A1API"
import { useGame } from "hooks/UseGame"

export const CreateTeamDialog: React.FC<{ callback: () => void, gameID: number, children: React.ReactNode }> = ({ callback: updateTeam, gameID, children }) => {

    const { t } = useTranslation("teams")
    const [groups, setGroups] = useState<GameGroup[]>([])
    const { gameInfo } = useGame(gameID)
    const [loadingGroups, setLoadingGroups] = useState(false)

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

    // 加载分组列表
    useEffect(() => {
        if (isOpen) {
            setLoadingGroups(true)
            api.user.userGetGameGroups(gameID)
                .then((res) => {
                    setGroups(res.data.data || [])
                })
                .catch(() => {
                    setGroups([])
                })
                .finally(() => {
                    setLoadingGroups(false)
                })
        }
    }, [isOpen, gameID])

    function onSubmit(values: z.infer<typeof formSchema>) {
        const payload: any = {
            name: values.teamName,
            slogan: values.slogan,
            description: values.description ?? "",
            invite_code: values.invite_code ?? undefined,
        }

        // 如果选择了分组，添加group_id
        if (values.groupId != "all" && values.groupId) {
            payload.group_id = parseInt(values.groupId)
        }

        api.user.userGameCreateTeam(gameID, payload).then(() => {
            toast.success(t("create_team_success"))
            updateTeam()
            setIsOpen(false)
        })
    }

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
                        {t("create_team_desc")}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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

                        {/* 分组选择 */}
                        {groups.length > 0 && !gameInfo?.group_invite_code_enabled && (
                            <FormField
                                control={form.control}
                                name="groupId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>参赛分组</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="选择参赛分组（可选）" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="all">不选择分组</SelectItem>
                                                {groups.map((group) => (
                                                    <SelectItem key={group.group_id} value={group.group_id.toString()}>
                                                        {group.group_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            选择您的队伍所属的参赛分组，如果不选择则为默认分组
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {gameInfo?.group_invite_code_enabled && (
                            <FormField
                                control={form.control}
                                name="invite_code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("group_invite_code")}</FormLabel>
                                        <FormControl>
                                            <Input placeholder="9f96ec31....." {...field} autoComplete="off" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

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
                        <Button type="submit" disabled={loadingGroups}>
                            {loadingGroups ? "加载中..." : t("submit")}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}