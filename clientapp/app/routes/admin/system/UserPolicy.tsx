import { Switch } from "components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "components/ui/form";
import { SystemSettingsValues } from "./AdminSettingsPage";
import { useTranslation } from "react-i18next";

export const UserPolicySettings = (
    { form }: {
        form: UseFormReturn<SystemSettingsValues>,
    }
) => {

    const { t: systemSettingsT } = useTranslation("system_settings")

    const t = (key: string) => systemSettingsT(`user.${key}`)

    return (
        <>
            <span className="text-2xl font-bold mb-4">{t("title")}</span>

            <FormField
                control={form.control}
                name="registrationEnabled"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-y-0 justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5 mb-[-1px]">
                            <FormLabel>{t("register_enable")}</FormLabel>
                            <FormDescription>{t("register_enable_description")}</FormDescription>
                        </div>
                        <FormControl>
                            <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        </FormControl>
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="accountActivationMethod"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center h-[20px]">
                            <FormLabel>{t("active_method")}</FormLabel>
                            <div className="flex-1" />
                            <FormMessage className="text-[14px]" />
                        </div>
                        <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                        >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("active_choose")} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="auto">{t("active_auto")}</SelectItem>
                                <SelectItem value="email">{t("active_email")}</SelectItem>
                                <SelectItem value="admin">{t("active_admin")}</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </>
    );
};

export default UserPolicySettings; 