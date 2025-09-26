import { UseFormReturn } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "components/ui/form";
import { SystemSettingsValues } from "./AdminSettingsPage";
import { Input } from "components/ui/input";

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "components/ui/card"
import { Button } from "components/ui/button";
import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "react-toastify/unstyled";
import { api } from "utils/ApiHelper";
import { useTranslation } from "react-i18next";
import LazyThemedEditor from "components/modules/LazyThemedEditor";

export default function TemplateSettings(
    { form }: {
        form: UseFormReturn<SystemSettingsValues>,
    }
) {

    const [testEmailReceiver, setTestEmailReceiver] = useState("")

    const { t } = useTranslation("system_settings")

    const handleSendTestMail = function (type: "forget" | "verify" | "test") {
        if (!testEmailReceiver) {
            toast.error(t("email.smtp_test.empty_error"))
            return
        }
        api.system.sendSmtpTestMail({
            to: testEmailReceiver,
            type: type
        }).then((_res) => {
            toast.success(t("email.smtp_test.success"))
        })
    }

    return (
        <>
            <span className="text-2xl font-bold mb-4">{t("template.title")}</span>
            <div className="space-y-8">
                <Card className="w-full">
                    <CardHeader>
                        <CardTitle>{t("template.verify.title")}</CardTitle>
                        <CardDescription>
                            {t("template.verify.description")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="gap-4 flex flex-col mt-4">
                        <FormField
                            control={form.control}
                            name="verifyEmailHeader"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center h-[20px]">
                                        <FormLabel>{t("template.email_title")}</FormLabel>
                                        <div className="flex-1" />
                                        <FormMessage className="text-[14px]" />
                                    </div>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="verifyEmailTemplate"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center h-[20px]">
                                        <FormLabel>{t("template.email_content")}</FormLabel>
                                        <div className="flex-1" />
                                        <FormMessage className="text-[14px]" />
                                    </div>
                                    <FormControl>
                                        <LazyThemedEditor
                                            value={field.value}
                                            onChange={field.onChange}
                                            language="html"
                                            className='h-[500px]'
                                        />
                                    </FormControl>
                                    <FormDescription>{t("template.verify.email_description")}</FormDescription>
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter className="flex flex-col pt-4 gap-2">
                        <div className="flex gap-2 w-full items-center">
                            <span className="text-sm font-bold">{t("template.email_test")}</span>
                        </div>
                        <div className="flex gap-4 w-full">
                            <Input placeholder={t("template.email_test_placeholder")} value={testEmailReceiver} className="flex-1" onChange={(e) => setTestEmailReceiver(e.target.value)}></Input>
                            <Button type="submit" variant="outline"
                                onClick={() => handleSendTestMail("verify")}
                            >
                                <Send />
                                {t("template.send")}
                            </Button>
                        </div>

                    </CardFooter>
                </Card>

                <Card className="w-full">
                    <CardHeader>
                        <CardTitle>{t("template.reset.title")}</CardTitle>
                        <CardDescription>
                            {t("template.reset.description")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="gap-4 flex flex-col mt-4">
                        <FormField
                            control={form.control}
                            name="forgetPasswordHeader"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center h-[20px]">
                                        <FormLabel>{t("template.email_title")}</FormLabel>
                                        <div className="flex-1" />
                                        <FormMessage className="text-[14px]" />
                                    </div>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="forgetPasswordTemplate"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center h-[20px]">
                                        <FormLabel>{t("template.email_content")}</FormLabel>
                                        <div className="flex-1" />
                                        <FormMessage className="text-[14px]" />
                                    </div>
                                    <FormControl>
                                        <LazyThemedEditor
                                            value={field.value}
                                            onChange={field.onChange}
                                            language="html"
                                            className='h-[500px]'
                                        />
                                    </FormControl>
                                    <FormDescription>{t("template.reset.email_description")}</FormDescription>
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter className="flex flex-col pt-4 gap-2">
                        <div className="flex gap-2 w-full items-center">
                            <span className="text-sm font-bold">{t("template.email_test")}</span>
                        </div>
                        <div className="flex gap-4 w-full">
                            <Input placeholder={t("template.email_test_placeholder")} value={testEmailReceiver} className="flex-1" onChange={(e) => setTestEmailReceiver(e.target.value)}></Input>
                            <Button type="submit" variant="outline"
                                onClick={() => handleSendTestMail("forget")}
                            >
                                <Send />
                                {t("template.send")}
                            </Button>
                        </div>

                    </CardFooter>
                </Card>
            </div>
        </>
    )
}