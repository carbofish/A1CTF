import { Input } from "components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "components/ui/form";
import { SystemSettingsValues } from "./AdminSettingsPage";
import { useTranslation } from "react-i18next";
import { Switch } from "components/ui/switch";

export const OtherSettings = (
    { form }: {
        form: UseFormReturn<SystemSettingsValues>,
    }
) => {

    const { t: systemSettingsT } = useTranslation("system_settings")

    const t = (key: string) => systemSettingsT(`other.${key}`)

    return (
        <>
            <span className="text-2xl font-bold mb-4">{t("title")}</span>
            <FormField
                control={form.control}
                name="defaultLanguage"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center h-[20px]">
                            <FormLabel>{t("language")}</FormLabel>
                            <div className="flex-1" />
                            <FormMessage className="text-[14px]" />
                        </div>
                        <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                        >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("language_placeholder")} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="zh-CN">{t("zh")}</SelectItem>
                                <SelectItem value="en-US">{t("en")}</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="timeZone"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center h-[20px]">
                            <FormLabel>{t("timezone")}</FormLabel>
                            <div className="flex-1" />
                            <FormMessage className="text-[14px]" />
                        </div>
                        <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                        >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("timezone_placeholder")} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Asia/Shanghai">{t("shanghai")}</SelectItem>
                                <SelectItem value="UTC">{t("utc")}</SelectItem>
                                <SelectItem value="America/New_York">{t("nk")}</SelectItem>
                                <SelectItem value="Europe/London">{t("london")}</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="maxUploadSize"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center h-[20px]">
                            <FormLabel>{t("file_max_size")}</FormLabel>
                            <div className="flex-1" />
                            <FormMessage className="text-[14px]" />
                        </div>
                        <FormControl>
                            <Input
                                type="number"
                                value={field.value}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            
            {/* QQ Bot 设置（使用统一保存按钮） */}
            <div className="mt-6">
                <span className="text-lg font-semibold mb-2">QQ Bot 设置</span>

                {/* 启用 QQ Bot */}
                <FormField
                    control={form.control}
                    name="qqBotEnabled"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5 mb-[-1px]">
                                <FormLabel>启用 QQ Bot</FormLabel>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={Boolean(field.value)}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                {/* QQ Bot Base URL */}
                <FormField
                    control={form.control}
                    name="qqBotApiBase"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center h-[20px]">
                                <FormLabel>服务器地址（base_url）</FormLabel>
                                <div className="flex-1" />
                                <FormMessage className="text-[14px]" />
                            </div>
                            <FormControl>
                                <Input
                                    placeholder="例如 http://127.0.0.1:5700"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* QQ Bot Access Token */}
                <FormField
                    control={form.control}
                    name="qqBotAccessToken"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center h-[20px]">
                                <FormLabel>Access Token（可选）</FormLabel>
                                <div className="flex-1" />
                                <FormMessage className="text-[14px]" />
                            </div>
                            <FormControl>
                                <Input
                                    placeholder="若开启鉴权则填写"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* QQ 群号 */}
                <FormField
                    control={form.control}
                    name="qqBotGroupId"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center h-[20px]">
                                <FormLabel>QQ 群号</FormLabel>
                                <div className="flex-1" />
                                <FormMessage className="text-[14px]" />
                            </div>
                            <FormControl>
                                <Input
                                    placeholder="输入群号（数字）"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* 推送所有提交（包含错误） */}
                <FormField
                    control={form.control}
                    name="qqBotPushAllSubmits"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5 mb-[-1px]">
                                <FormLabel>推送所有提交（包含错误）</FormLabel>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={Boolean(field.value)}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>
        </>
    );
};

export default OtherSettings; 