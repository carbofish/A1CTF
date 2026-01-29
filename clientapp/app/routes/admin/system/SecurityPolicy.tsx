import { Switch } from "components/ui/switch";
import { UseFormReturn } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "components/ui/form";
import { SystemSettingsValues } from "./AdminSettingsPage";
import { useTranslation } from "react-i18next";

export const SecurityPolicySettings = (
    { form }: {
        form: UseFormReturn<SystemSettingsValues>,
    }
) => {

    const { t: systemSettingsT } = useTranslation("system_settings")

    const t = (key: string) => systemSettingsT(`security.${key}`)

    return (
        <>
            <span className="text-2xl font-bold mb-4">{t("title")}</span>

            <FormField
                control={form.control}
                name="captchaEnabled"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-y-0 justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5 mb-[-1px]">
                            <FormLabel>{t("captcha")}</FormLabel>
                            <FormDescription>
                                {t("captcha_description")}
                            </FormDescription>
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
        </>
    );
};

export default SecurityPolicySettings; 