import React, { } from "react";
import { Input } from "components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "components/ui/form";
import { SystemSettingsValues } from "./AdminSettingsPage";
import ImageUploader from "components/modules/ImageUploader";
import { SystemResourceType } from "utils/A1API";
import { api, createSkipGlobalErrorConfig } from "utils/ApiHelper";
import { toast } from 'react-toastify/unstyled';
import { useTranslation } from "react-i18next";

export const ResourceSettings = (
    {
        form
    }: {
        form: UseFormReturn<SystemSettingsValues>
    }
) => {

    const { t: systemSettingsT } = useTranslation("system_settings")

    const t = (key: string) => systemSettingsT(`resource.${key}`)

    interface ResourceItem {
        type: SystemResourceType,
        name: string,
        description?: string,
        darkBackground?: boolean,
        formValue: string
    }

    const resourceList: ResourceItem[] = [
        {
            type: SystemResourceType.FancyBackGroundIconBlack,
            name: t("bg_icon2"),
            formValue: "fancyBackGroundIconBlack",
            darkBackground: true,
        },
        {
            type: SystemResourceType.FancyBackGroundIconWhite,
            name: t("bg_icon1"),
            formValue: "fancyBackGroundIconWhite",
        },
        {
            type: SystemResourceType.SvgIconDark,
            name: t("sys_icon1"),
            darkBackground: true,
            formValue: "svgIconDark"
        },
        {
            type: SystemResourceType.SvgIconLight,
            name: t("sys_icon2"),
            formValue: "svgIconLight"
        },
        {
            type: SystemResourceType.TrophysGold,
            name: t("1blood"),
            description: t("1blood_description"),
            formValue: "trophysGold"
        },
        {
            type: SystemResourceType.TrophysSilver,
            name: t("2blood"),
            description: t("2blood_description"),
            formValue: "trophysSilver"
        },
        {
            type: SystemResourceType.TrophysBronze,
            name: t("3blood"),
            description: t("3blood_description"),
            formValue: "trophysBronze"
        },
        {
            type: SystemResourceType.SchoolLogo,
            name: t("school_icon1"),
            description: t("school_icon1_description"),
            formValue: "schoolLogo",
            darkBackground: true
        },
        {
            type: SystemResourceType.SchoolLogo,
            name: t("school_icon2"),
            description: t("school_icon1_description"),
            formValue: "schoolSmallIcon",
            darkBackground: true
        }
    ]

    const handleImageUpload = (resource: ResourceItem) => {
        return (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (file) {
                api.system.uploadSystemFile({
                    file: file,
                    resource_type: resource.type,
                }, createSkipGlobalErrorConfig()).then((res) => {
                    if (res.status === 200) {
                        form.setValue(resource.formValue as any, `/api/file/download/${res.data.data.file_id}`);
                        toast.success(`${resource.name} ${t("upload_success")}`)
                    }
                }).catch((_err) => {
                    toast.error(`${resource.name} ${t("upload_failed")}`)
                })
            }
        }
    };

    return (
        <>
            <span className="text-2xl font-bold mb-4">{t("setting")}</span>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-4">
                {resourceList.map((resource, idx) => (
                    <FormField
                        control={form.control}
                        key={idx}
                        name={resource.formValue as any}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{resource.name}</FormLabel>
                                <FormControl>
                                    <ImageUploader
                                        src={field.value ?? "#"}
                                        backgroundTheme={resource.darkBackground ? "dark" : "light"}
                                        onChange={handleImageUpload(resource)}
                                        size={180}
                                        imageFit="object-contain"
                                    />
                                </FormControl>
                                {resource.description && (
                                    <FormDescription>{resource.description}</FormDescription>
                                )}
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                ))}
            </div>

            <FormField
                control={form.control}
                name="fancyBackGroundIconWidth"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center h-[20px]">
                            <FormLabel>{t("width")}</FormLabel>
                            <div className="flex-1" />
                            <FormMessage className="text-[14px]" />
                        </div>
                        <FormControl>
                            <Input {...field} />
                        </FormControl>
                        <FormDescription>{t("width_description")}</FormDescription>
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="fancyBackGroundIconHeight"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center h-[20px]">
                            <FormLabel>{t("height")}</FormLabel>
                            <div className="flex-1" />
                            <FormMessage className="text-[14px]" />
                        </div>
                        <FormControl>
                            <Input {...field} />
                        </FormControl>
                        <FormDescription>{t("height_description")}</FormDescription>
                    </FormItem>
                )}
            />

        </>
    );
};

export default ResourceSettings; 