import React from 'react';

import { Input } from 'components/ui/input';
import {
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
    FormControl,
} from 'components/ui/form';
import { Settings, Upload } from 'lucide-react';
import { useWatch } from 'react-hook-form';
import { toast } from 'react-toastify/unstyled';
import { UseFormReturn } from 'react-hook-form';
import { EditGameFormSchema } from './EditGameSchema';
import * as z from 'zod';
import { api } from 'utils/ApiHelper';
import { AdminFullGameInfo } from 'utils/A1API';
import { Slider } from 'components/ui/slider';
import { DateTimePicker24h } from 'components/ui/data-time-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'components/ui/select';
import { useTranslation } from 'react-i18next';
import { Button } from 'components/ui/button';

interface DetailedSettingsModuleProps {
    form: UseFormReturn<z.infer<typeof EditGameFormSchema>>;
    game_info: AdminFullGameInfo;
    handleDateSelect: (date: Date | undefined, tmType: 'wp_expire_time') => void;
    handleTimeChange: (
        type: 'hour' | 'minute',
        value: string,
        tmType: 'wp_expire_time'
    ) => void;
    clientConfig: any;
}

const writeupFormatOptions = ["pdf", "zip", "doc", "docx", "md", "txt"]

export function DetailedSettingsModule({
    form,
    handleDateSelect: _handleDateSelect,
    game_info,
    handleTimeChange: _handleTimeChange,
    clientConfig,
}: DetailedSettingsModuleProps) {

    const { t } = useTranslation("game_edit")

    // 监听 poster 字段变化，用于实时预览
    const watchedPoster = useWatch({ control: form.control, name: 'poster' });


    // 海报上传处理函数
    const handlePosterUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            toast.error(t("detail.upload.type"));
            return;
        }

        // 检查文件大小 (限制为10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast.error(t("detail.upload.size"));
            return;
        }

        const formData = new FormData();
        formData.append('poster', file);

        api.admin.uploadGamePoster(game_info.game_id, { poster: file }).then((res) => {
            // 更新表单中的poster字段
            form.setValue('poster', res.data.poster_url);
            toast.success(t("detail.upload.success"));
        })

        // 清空文件输入，允许重新选择相同文件
        event.target.value = '';
    };

    return (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center">
                    <Settings className="h-4 w-4 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold">{t("detail.title")}</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 左侧表单 */}
                <div className="space-y-6">
                    {/* 邀请码 */}
                    <FormField
                        control={form.control}
                        name="invite_code"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center h-[20px]">
                                    <FormLabel>{t("detail.invite.title")}</FormLabel>
                                    <div className="flex-1" />
                                    <FormMessage className="text-[14px]" />
                                </div>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormDescription>{t("detail.invite.description")}</FormDescription>
                            </FormItem>
                        )}
                    />

                    {/* 队伍策略 */}
                    <FormField
                        control={form.control}
                        name="team_policy"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center h-[20px]">
                                    <FormLabel>{t("detail.policy.title")}</FormLabel>
                                    <div className="flex-1" />
                                    <FormMessage className="text-[14px]" />
                                </div>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("detail.policy.placeholder")} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="w-full flex">
                                        <SelectItem key="Manual" value="Manual">
                                            {t("detail.policy.manual")}
                                        </SelectItem>
                                        <SelectItem key="Auto" value="Auto">
                                            {t("detail.policy.auto")}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormDescription>
                                    {t("detail.policy.description")}
                                </FormDescription>
                            </FormItem>
                        )}
                    />

                    {/* WP 截止时间 */}
                    <FormField
                        control={form.control}
                        name={`wp_start_time`}
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>{t("detail.wp_start.title")}</FormLabel>
                                <DateTimePicker24h
                                    date={field.value}
                                    setDate={field.onChange}
                                />
                                <FormDescription>{t("detail.wp_start.description")}</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name={`wp_expire_time`}
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>{t("detail.wp_time.title")}</FormLabel>
                                <DateTimePicker24h
                                    date={field.value}
                                    setDate={field.onChange}
                                />
                                <FormDescription>{t("detail.wp_time.description")}</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="wp_formats"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center h-[20px]">
                                    <FormLabel>{t("detail.wp_formats.title")}</FormLabel>
                                    <div className="flex-1" />
                                    <FormMessage />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {writeupFormatOptions.map((fmt) => {
                                        const selected = field.value?.includes(fmt)
                                        return (
                                            <Button
                                                key={fmt}
                                                type="button"
                                                size="sm"
                                                variant={selected ? "default" : "outline"}
                                                className="rounded-full text-xs"
                                                onClick={() => {
                                                    const current = field.value ?? []
                                                    if (selected && current.length === 1) {
                                                        return
                                                    }
                                                    const next = selected ? current.filter((val) => val !== fmt) : [...current, fmt]
                                                    field.onChange(next)
                                                }}
                                            >
                                                {fmt.toUpperCase()}
                                            </Button>
                                        )
                                    })}
                                </div>
                                <FormDescription>{t("detail.wp_formats.description")}</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* 队伍人数限制 */}
                    <FormField
                        control={form.control}
                        name="team_number_limit"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center h-[20px]">
                                    <FormLabel>{t("detail.limit.member.title")}</FormLabel>
                                    <div className="flex-1" />
                                    <FormMessage className="text-[14px]" />
                                </div>
                                <FormControl>
                                    <div className='flex items-center gap-2'>
                                        <Slider
                                            min={1}
                                            max={100}
                                            step={1}
                                            value={[field.value]}
                                            onValueChange={field.onChange}
                                        />
                                        <div className='flex-1' />
                                        <span className='w-10'>{field.value}</span>
                                    </div>
                                </FormControl>
                                <FormDescription>{t("detail.limit.member.description")}</FormDescription>
                            </FormItem>
                        )}
                    />

                    {/* 容器数量限制 */}
                    <FormField
                        control={form.control}
                        name="container_number_limit"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center h-[20px]">
                                    <FormLabel>{t("detail.limit.container.title")}</FormLabel>
                                    <div className="flex-1" />
                                    <FormMessage className="text-[14px]" />
                                </div>
                                <FormControl>
                                    <div className='flex items-center gap-2'>
                                        <Slider
                                            min={1}
                                            max={10}
                                            step={1}
                                            value={[field.value]}
                                            onValueChange={field.onChange}
                                        />
                                        <div className='flex-1' />
                                        <span className='w-10'>{field.value}</span>
                                    </div>
                                </FormControl>
                                <FormDescription>{t("detail.limit.container.description")}</FormDescription>
                            </FormItem>
                        )}
                    />

                    {/* 一血加分比例 */}
                    <FormField
                        control={form.control}
                        name="first_blood_reward"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center h-[20px]">
                                    <FormLabel>{t("detail.blood.1")}</FormLabel>
                                    <div className="flex-1" />
                                    <FormMessage className="text-[14px]" />
                                </div>
                                <FormControl>
                                    <div className='flex items-center gap-2'>
                                        <Slider
                                            min={0}
                                            max={100}
                                            step={1}
                                            value={[field.value]}
                                            onValueChange={field.onChange}
                                        />
                                        <div className='flex-1' />
                                        <span className='w-10'>{field.value}%</span>
                                    </div>
                                </FormControl>
                                <FormDescription>{t("detail.blood.0")}</FormDescription>
                            </FormItem>
                        )}
                    />

                    {/* 二血加分比例 */}
                    <FormField
                        control={form.control}
                        name="second_blood_reward"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center h-[20px]">
                                    <FormLabel>{t("detail.blood.2")}</FormLabel>
                                    <div className="flex-1" />
                                    <FormMessage className="text-[14px]" />
                                </div>
                                <FormControl>
                                    <div className='flex items-center gap-2'>
                                        <Slider
                                            min={0}
                                            max={100}
                                            step={1}
                                            value={[field.value]}
                                            onValueChange={field.onChange}
                                        />
                                        <div className='flex-1' />
                                        <span className='w-10'>{field.value}%</span>
                                    </div>
                                </FormControl>
                                <FormDescription>{t("detail.blood.0")}</FormDescription>
                            </FormItem>
                        )}
                    />

                    {/* 三血加分比例 */}
                    <FormField
                        control={form.control}
                        name="third_blood_reward"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center h-[20px]">
                                    <FormLabel>{t("detail.blood.3")}</FormLabel>
                                    <div className="flex-1" />
                                    <FormMessage className="text-[14px]" />
                                </div>
                                <FormControl>
                                    <div className='flex items-center gap-2'>
                                        <Slider
                                            min={0}
                                            max={100}
                                            step={1}
                                            value={[field.value]}
                                            onValueChange={field.onChange}
                                        />
                                        <div className='flex-1' />
                                        <span className='w-10'>{field.value}%</span>
                                    </div>
                                </FormControl>
                                <FormDescription>{t("detail.blood.0")}</FormDescription>
                            </FormItem>
                        )}
                    />
                </div>

                {/* 右侧海报上传 */}
                <div className="h-fit">
                    <div className="aspect-[4/3] rounded-xl border border-border/50 shadow-md relative overflow-hidden bg-gradient-to-br from-muted/20 to-muted/10 group">
                        <div
                            className="absolute top-0 left-0 w-full h-full bg-cover bg-center z-5"
                            style={{ backgroundImage: `url(${watchedPoster || clientConfig.DefaultBGImage})` }}
                        />
                        <div className="absolute top-0 left-0 w-full h-full opacity-0 group-hover:bg-background group-hover:opacity-85 z-5 transition-all duration-300 flex items-center justify-center cursor-pointer">
                            <div className="flex flex-col items-center gap-3 text-muted-foreground group-hover:text-primary transition-colors duration-300 pointer-events-none">
                                <Upload size={40} />
                                <span className="text-lg font-medium">{t("detail.upload.title")}</span>
                                <span className="text-sm text-center">{t("detail.upload.description")}</span>
                            </div>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-30"
                            onChange={handlePosterUpload}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
} 
