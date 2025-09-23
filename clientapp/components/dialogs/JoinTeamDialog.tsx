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

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState } from "react";
import { toast } from 'react-toastify/unstyled';
import { useTranslation } from "react-i18next";
import { api } from "utils/ApiHelper"

export const JoinTeamDialog: React.FC<{ callback: () => void, game_id: number, children: React.ReactNode }> = ({ game_id, callback: updateTeam, children }) => {

    const { t } = useTranslation("teams")

    const formSchema = z.object({
        inviteCode: z.string().min(1, {
            message: t("invalid_invite_code")
        })
    })
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            inviteCode: "",
        },
    })

    const [isOpen, setIsOpen] = useState(false)

    const [submitDisabled, setSubmitDisabled] = useState(false)

    function onSubmit(values: z.infer<typeof formSchema>) {
        setSubmitDisabled(true)

        api.team.teamAccept(game_id, {
            invite_code: values.inviteCode
        }).then(() => {
            toast.success(t("join_team_success"))
            updateTeam()
            setIsOpen(false)
        }).finally(() => {
            setSubmitDisabled(false)
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
                    <DialogTitle>{ t("join_team") }</DialogTitle>
                    <DialogDescription>
                        { t("join_team_desc") }
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="inviteCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{ t("invite_code") }</FormLabel>
                                    <FormControl>
                                        <Input placeholder="xxxx:xx:xxxxxxxx" {...field} autoComplete="off" />
                                    </FormControl>
                                    <FormDescription>
                                        { t("invite_code_desc") }
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="transition-all duration-300" disabled={submitDisabled}>{ t("submit") }</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}