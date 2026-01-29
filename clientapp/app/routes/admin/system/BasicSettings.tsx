import { Input } from "components/ui/input";
import { Textarea } from "components/ui/textarea";
import { UseFormReturn } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "components/ui/form";
import { SystemSettingsValues } from "./AdminSettingsPage";
import { Switch } from "components/ui/switch";
import { useTranslation } from "react-i18next";

export const BasicSettings = (
    { form }: {
        form: UseFormReturn<SystemSettingsValues>,
    }
) => {

    const { t } = useTranslation("system_settings")

    return (
        <>
            <span className="text-2xl font-bold mb-4">{t("basic.title")}</span>

            <FormField
                control={form.control}
                name="systemName"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center h-[20px]">
                            <FormLabel>{t("basic.name")}</FormLabel>
                            <div className="flex-1" />
                            <FormMessage className="text-[14px]" />
                        </div>
                        <FormControl>
                            <Input {...field} />
                        </FormControl>
                        <FormDescription>{t("basic.name_description")}</FormDescription>
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="systemSlogan"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center h-[20px]">
                            <FormLabel>{t("basic.slogan")}</FormLabel>
                            <div className="flex-1" />
                            <FormMessage className="text-[14px]" />
                        </div>
                        <FormControl>
                            <Input {...field} />
                        </FormControl>
                        <FormDescription>{t("basic.slogan_description")}</FormDescription>
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="systemFooter"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center h-[20px]">
                            <FormLabel>{t("basic.footer")}</FormLabel>
                            <div className="flex-1" />
                            <FormMessage className="text-[14px]" />
                        </div>
                        <FormControl>
                            <Input {...field} />
                        </FormControl>
                        <FormDescription>{t("basic.footer_description")}</FormDescription>
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="systemICP"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center h-[20px]">
                            <FormLabel>{t("basic.icp")}</FormLabel>
                            <div className="flex-1" />
                            <FormMessage className="text-[14px]" />
                        </div>
                        <FormControl>
                            <Input {...field} />
                        </FormControl>
                        <FormDescription>{t("basic.icp_description")}</FormDescription>
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="systemOrganization"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center h-[20px]">
                            <FormLabel>{t("basic.org")}</FormLabel>
                            <div className="flex-1" />
                            <FormMessage className="text-[14px]" />
                        </div>
                        <FormControl>
                            <Input {...field} />
                        </FormControl>
                        <FormDescription>{t("basic.org_description")}</FormDescription>
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="systemOrganizationURL"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center h-[20px]">
                            <FormLabel>{t("basic.url")}</FormLabel>
                            <div className="flex-1" />
                            <FormMessage className="text-[14px]" />
                        </div>
                        <FormControl>
                            <Input {...field} />
                        </FormControl>
                        <FormDescription>{t("basic.url_description")}</FormDescription>
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="svgAltData"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center h-[20px]">
                            <FormLabel>{t("basic.logo")}</FormLabel>
                            <div className="flex-1" />
                            <FormMessage className="text-[14px]" />
                        </div>
                        <FormControl>
                            <Input {...field} />
                        </FormControl>
                        <FormDescription>{t("basic.logo_description")}</FormDescription>
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="schoolUnionAuthText"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center h-[20px]">
                            <FormLabel>{t("basic.auth")}</FormLabel>
                            <div className="flex-1" />
                            <FormMessage className="text-[14px]" />
                        </div>
                        <FormControl>
                            <Input {...field} />
                        </FormControl>
                        <FormDescription>{t("basic.auth_description")}</FormDescription>
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="systemSummary"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center h-[20px]">
                            <FormLabel>{t("basic.summary")}</FormLabel>
                            <div className="flex-1" />
                            <FormMessage className="text-[14px]" />
                        </div>
                        <FormControl>
                            <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormDescription>{t("basic.summary_description")}</FormDescription>
                    </FormItem>
                )}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <FormField
                    control={form.control}
                    name="bgAnimation"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-y-0 justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5 mb-[-1px]">
                                <FormLabel>{t("basic.animation")}</FormLabel>
                                <FormDescription>
                                    {t("basic.animation_description")}
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
            </div>
        </>
    );
};

export default BasicSettings; 