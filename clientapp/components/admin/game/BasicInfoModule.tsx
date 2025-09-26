import React from 'react';

import { Switch } from 'components/ui/switch';

import { Input } from 'components/ui/input';
import { Textarea } from 'components/ui/textarea';
import {
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
    FormControl,
} from 'components/ui/form';
import { FilePenLine } from 'lucide-react';
import ImageUploader from 'components/modules/ImageUploader';
import { api } from 'utils/ApiHelper';
import { SystemResourceType } from 'utils/A1API';
import { DateTimePicker24h } from 'components/ui/data-time-picker';
import LazyThemedEditor from "components/modules/LazyThemedEditor";
import { useTranslation } from 'react-i18next';

interface BasicInfoModuleProps {
    form: any;
    gameID: number;
}

/**
 * 基本信息管理模块
 * 从 EditGameView.tsx 中抽离，提升主组件可读性
 */
export function BasicInfoModule({ form, gameID }: BasicInfoModuleProps) {

    const { t } = useTranslation("game_edit")

    const handleImageUpload = (type: SystemResourceType) => {
        return (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (file) {
                api.system.uploadSystemFile({
                    file: file,
                    resource_type: type,
                    data: gameID.toString(),
                }).then((res) => {
                    if (res.status === 200) {
                        switch (type) {
                            case SystemResourceType.GameIconLight:
                                form.setValue("game_icon_light", `/api/file/download/${res.data.data.file_id}`);
                                break;
                            case SystemResourceType.GameIconDark:
                                form.setValue("game_icon_dark", `/api/file/download/${res.data.data.file_id}`);
                        }
                    }
                })
            }
        }
    };

    return (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
                    <FilePenLine className="h-4 w-4 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold">{t("basic.title")}</h2>
            </div>

            {/* 比赛名称 / 开始结束时间 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* 名称 */}
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center">
                                <FormLabel>{t("basic.name.label")}</FormLabel>
                                <div className="flex-1" />
                                <FormMessage className="text-[14px]" />
                            </div>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormDescription>{t("basic.name.description")}</FormDescription>
                        </FormItem>
                    )}
                />

                {/* 开始时间 */}
                <FormField
                    control={form.control}
                    name={`start_time`}
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>{t("basic.start_time.label")}</FormLabel>
                            <DateTimePicker24h
                                date={field.value}
                                setDate={field.onChange}
                            />
                            <FormDescription>{t("basic.start_time.description")}</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* 结束时间 */}
                <FormField
                    control={form.control}
                    name={`end_time`}
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>{t("basic.end_time.label")}</FormLabel>
                            <DateTimePicker24h
                                date={field.value}
                                setDate={field.onChange}
                            />
                            <FormDescription>{t("basic.end_time.description")}</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* 简介、描述 */}
            <div className="space-y-6">
                <FormField
                    control={form.control}
                    name="summary"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center h-[20px]">
                                <FormLabel>{t("basic.summary.label")}</FormLabel>
                                <div className="flex-1" />
                                <FormMessage className="text-[14px]" />
                            </div>
                            <FormControl>
                                <Textarea {...field} className="h-[100px]" />
                            </FormControl>
                            <FormDescription>{t("basic.summary.description")}</FormDescription>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center h-[20px]">
                                <FormLabel>{t("basic.description.label")}</FormLabel>
                                <div className="flex-1" />
                                <FormMessage className="text-[14px]" />
                            </div>
                            <FormControl>
                                <LazyThemedEditor
                                    value={field.value}
                                    onChange={field.onChange}
                                    language="markdown"
                                    className='h-[500px]'
                                />
                            </FormControl>
                            <FormDescription>{t("basic.description.description")}</FormDescription>
                        </FormItem>
                    )}
                />
            </div>

            {/* 开关设置 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
                <FormField
                    control={form.control}
                    name="practice_mode"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border/50 p-4">
                            <div className="space-y-0.5">
                                <FormLabel>{t("basic.practice.label")}</FormLabel>
                                <FormDescription>{t("basic.practice.description")}</FormDescription>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="require_wp"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border/50 p-4">
                            <div className="space-y-0.5">
                                <FormLabel>{t("basic.wp.label")}</FormLabel>
                                <FormDescription>{t("basic.wp.description")}</FormDescription>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="visible"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border/50 p-4">
                            <div className="space-y-0.5">
                                <FormLabel>{t("basic.visible.label")}</FormLabel>
                                <FormDescription>{t("basic.visible.description")}</FormDescription>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="group_invite_code_enable"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border/50 p-4">
                            <div className="space-y-0.5">
                                <FormLabel>{t("basic.group_invite_code_enable.label")}</FormLabel>
                                <FormDescription>{t("basic.group_invite_code_enable.description")}</FormDescription>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>

            {/* 比赛图标 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
                <FormField
                    control={form.control}
                    name="game_icon_light"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("basic.icon.label")} ({t("basic.icon.light")})</FormLabel>
                            <FormControl>
                                <ImageUploader
                                    src={field.value}
                                    backgroundTheme='light'
                                    onChange={handleImageUpload(SystemResourceType.GameIconLight)}
                                />
                            </FormControl>
                            <FormDescription>{t("basic.icon.label")}</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="game_icon_dark"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("basic.icon.label")} ({t("basic.icon.dark")})</FormLabel>
                            <FormControl>
                                <ImageUploader
                                    src={field.value}
                                    backgroundTheme='dark'
                                    onChange={handleImageUpload(SystemResourceType.GameIconDark)}
                                />
                            </FormControl>
                            <FormDescription>{t("basic.icon.label")}</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>
    );
} 