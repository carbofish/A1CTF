import { useEffect, useRef, useState } from 'react';
import { Button } from 'components/ui/button';
import { Form } from 'components/ui/form';
import ThemeSwitcher from "components/ToggleTheme"
import { MacScrollbar } from 'mac-scrollbar';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'react-toastify/unstyled';
import { useGlobalVariableContext } from 'contexts/GlobalVariableContext';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import dayjs from 'dayjs';
import { CalendarIcon, CircleArrowLeft, Save, Settings, Users, PackageSearch, MessageSquareLock, Activity, Info, Plane } from 'lucide-react';
import { EditGameFormSchema } from './game/EditGameSchema';
import { api } from 'utils/ApiHelper';
import { GameTimelineEditor } from './GameTimelineEditor';
import { GameGroupManager } from './GameGroupManager';
import { GameNoticeManager } from './GameNoticeManager';
import { BasicInfoModule } from './game/BasicInfoModule';
import { DetailedSettingsModule } from './game/DetailedSettingsModule';
import { AdminFullGameInfo } from 'utils/A1API';
import { TeamManageView } from './game/TeamManageView';
import { ContainerManageView } from './game/ContainerManageView';
import { useTheme } from 'next-themes';
import { GameEventModule } from './game/GameEventModule';
import { useTranslation } from 'react-i18next';

export function EditGameView({ game_info }: { game_info: AdminFullGameInfo }) {

    const { action } = useParams();

    const { t } = useTranslation("game_manage")

    const navigate = useNavigate()

    const [formEdited, setFormEdited] = useState(false)

    // 添加状态来管理当前选中的模块
    const [activeModule, setActiveModule] = useState(action || 'events');

    useEffect(() => {
        if (!modules.filter(m => m.id == action).length) {
            navigate("/404")
            return
        }
        setActiveModule(action || "events")
    }, [action])

    const { theme } = useTheme()
    const { clientConfig } = useGlobalVariableContext()

    const form = useForm<z.infer<typeof EditGameFormSchema>>({
        resolver: zodResolver(EditGameFormSchema),
        defaultValues: {
            name: game_info.name,
            summary: game_info.summary || "",
            description: game_info.description || "",
            poster: game_info.poster || "",
            invite_code: game_info.invite_code || "",
            start_time: game_info.start_time ? dayjs(game_info.start_time).toDate() : new Date(),
            end_time: game_info.end_time ? dayjs(game_info.end_time).toDate() : new Date(),
            practice_mode: game_info.practice_mode,
            team_number_limit: game_info.team_number_limit,
            container_number_limit: game_info.container_number_limit,
            require_wp: game_info.require_wp,
            game_icon_light: game_info.game_icon_light || "",
            game_icon_dark: game_info.game_icon_dark || "",
            wp_expire_time: game_info.wp_expire_time ? dayjs(game_info.wp_expire_time).toDate() : new Date(),
            visible: game_info.visible,
            first_blood_reward: game_info.first_blood_reward,
            second_blood_reward: game_info.second_blood_reward,
            third_blood_reward: game_info.third_blood_reward,
            team_policy: game_info.team_policy,
            group_invite_code_enable: game_info.group_invite_code_enable,
            stages: game_info.stages ? game_info.stages.map((stage) => ({
                stage_name: stage.stage_name,
                start_time: dayjs(stage.start_time).toDate(),
                end_time: dayjs(stage.end_time).toDate(),
            })) : [],
            challenges: game_info.challenges?.map((challenge) => ({
                challenge_id: challenge.challenge_id,
                challenge_name: challenge.challenge_name,
                category: challenge.category,
                total_score: challenge.total_score,
                cur_score: challenge.cur_score,
                enable_blood_reward: challenge.enable_blood_reward,
                minimal_score: challenge.minimal_score,
                solve_count: challenge.solve_count || 0,
                hints: challenge.hints?.map((hint) => ({
                    content: hint.content,
                    create_time: dayjs(hint.create_time).toDate(),
                    visible: hint.visible
                })),
                visible: challenge.visible || false,
                belong_stage: challenge.belong_stage!,
                judge_config: {
                    judge_type: challenge.judge_config?.judge_type,
                    judge_script: challenge.judge_config?.judge_script || "",
                    flag_template: challenge.judge_config?.flag_template || "",
                }
            }))
        }
    })

    const formJsonRef = useRef<string>("")

    useEffect(() => {
        const json = JSON.stringify(form.watch())
        if (json !== formJsonRef.current) {
            if (formJsonRef.current === "") {
                formJsonRef.current = json
                setFormEdited(false)
            } else {
                setFormEdited(true)
            }
        } else {
            setFormEdited(false)
        }
    }, [form.watch()])

    const format_date = (dt: Date) => {
        return dt.toISOString();
    }

    function onSubmit(values: z.infer<typeof EditGameFormSchema>) {
        const finalData = {
            game_id: game_info.game_id,
            name: values.name,
            summary: values.summary,
            description: values.description,
            poster: values.poster,
            invite_code: values.invite_code,
            start_time: format_date(values.start_time ?? new Date()),
            end_time: format_date(values.end_time ?? new Date()),
            practice_mode: values.practice_mode,
            team_number_limit: values.team_number_limit,
            container_number_limit: values.container_number_limit,
            require_wp: values.require_wp,
            wp_expire_time: format_date(values.wp_expire_time ?? new Date()),
            stages: values.stages,
            visible: values.visible,
            team_policy: values.team_policy,
            challenges: values.challenges,
            group_invite_code_enable: values.group_invite_code_enable,
            first_blood_reward: values.first_blood_reward,
            second_blood_reward: values.second_blood_reward,
            third_blood_reward: values.third_blood_reward
        };

        if (!formEdited) return
        api.admin.updateGame(game_info.game_id, finalData as any as AdminFullGameInfo).then(() => {
            toast.success(t("update_success"))
            setFormEdited(false)
            formJsonRef.current = ""
            game_info.name = finalData.name
        })
    }

    const router = useNavigate()

    function handleDateSelect(date: Date | undefined, tm_type: "start_time" | "end_time" | "wp_expire_time") {
        if (date) {
            form.setValue(tm_type, date);
        }
    }

    function handleTimeChange(type: "hour" | "minute", value: string, tm_type: "start_time" | "end_time" | "wp_expire_time") {
        const field_name = tm_type;
        const currentDate = form.getValues(field_name) || new Date();
        const newDate = new Date(currentDate);

        if (type === "hour") {
            const hour = parseInt(value, 10);
            newDate.setHours(hour);
        } else if (type === "minute") {
            newDate.setMinutes(parseInt(value, 10));
        }

        form.setValue(field_name, newDate);
    }

    // 定义模块配置
    const modules = [
        {
            id: "events",
            name: t("events"),
            icon: <Activity className="h-4 w-4" />
        },
        {
            id: 'basic',
            name: t("basic"),
            icon: <Info className="h-4 w-4" />
        },
        {
            id: 'settings',
            name: t("settings"),
            icon: <Settings className="h-4 w-4" />
        },
        {
            id: 'timeline',
            name: t("timeline"),
            icon: <CalendarIcon className="h-4 w-4" />
        },
        {
            id: 'groups',
            name: t("groups"),
            icon: <Users className="h-4 w-4" />
        },
        {
            id: 'notices',
            name: t("notices"),
            icon: <MessageSquareLock className="h-4 w-4" />
        },
        // {
        //     id: 'challenges',
        //     name: '题目设置',
        //     icon: <Trophy className="h-4 w-4" />
        // },
        {
            id: "teams",
            name: t("teams"),
            icon: <Users className="h-4 w-4" />
        },
        {
            id: "containers",
            name: t("containers"),
            icon: <PackageSearch className="h-4 w-4" />
        }
    ];

    return (
        <Form {...form}>
            {/* Header Section */}
            <div className="absolute top-0 z-10 backdrop-blur-sm bg-background/20 border-b px-6 w-full h-15 flex flex-col justify-center">
                <div className="flex items-center justify-between select-none">
                    <div className="flex items-center gap-4">
                        <span className="font-bold text-lg">{t("title")}</span>
                        <div className="h-8 w-px bg-border" />
                        <div className='flex gap-2 items-center'>
                            <span className="text-lg text-muted-foreground">
                                {game_info.name}
                            </span>
                        </div>
                    </div>
                    <div className='flex gap-3 items-center'>
                        {
                            formEdited && (
                                <span className='text-red-500'>* {t("edited")}</span>
                            )
                        }
                        <Button
                            type="submit"
                            form="game-edit-form"
                            onClick={form.handleSubmit(onSubmit)}
                        >
                            <Save className="h-4 w-4" />
                            {t("save")}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router(`/admin/games`)}
                            className=""
                        >
                            <CircleArrowLeft className="h-4 w-4" />
                            {t("back")}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-9 w-9 p-0"
                            onClick={() => window.open(`/games/${game_info.game_id}/info`)}
                            data-tooltip-content={t("goto")}
                            data-tooltip-id="my-tooltip"
                            data-tooltip-place="bottom"
                        >
                            <Plane className="h-4 w-4" />
                        </Button>
                        <ThemeSwitcher />
                    </div>
                </div>
            </div>

            <div className="flex gap-6 w-full h-full overflow-hidden">
                {/* 左侧模块导航 */}
                <div className="w-64 flex-none border-r-1 select-none">
                    <div className="px-6 pt-23">
                        <h3 className="font-semibold text-lg mb-4 text-foreground/90">{t("left_title")}</h3>
                        <div className="space-y-2">
                            {modules.map((module) => (
                                <Button
                                    key={module.id}
                                    type="button"
                                    className='w-full h-10 flex justify-start gap-2'
                                    variant={activeModule === module.id ? "default" : "ghost"}
                                    onClick={() => {
                                        navigate(`/admin/games/${game_info.game_id}/${module.id}`)
                                    }}
                                >
                                    {module.icon}
                                    <span className="font-medium">{module.name}</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 右侧内容区域 */}
                <div className="flex-1 overflow-hidden">
                    <MacScrollbar
                        className="h-full"
                        skin={theme == "light" ? "light" : "dark"}
                    >
                        <div className="pl-6 pr-10 pt-22 pb-8">
                            {activeModule === 'events' && (
                                <GameEventModule />
                            )}


                            {/* 基本信息 Section */}
                            {activeModule === 'basic' && (
                                <BasicInfoModule
                                    form={form}
                                    gameID={game_info.game_id}
                                />
                            )}

                            {/* 详细设置 Section */}
                            {activeModule === 'settings' && (
                                <DetailedSettingsModule
                                    form={form}
                                    game_info={game_info}
                                    handleDateSelect={(date) => handleDateSelect(date, "wp_expire_time")}
                                    handleTimeChange={(type, val) => handleTimeChange(type as any, val, "wp_expire_time")}
                                    clientConfig={clientConfig}
                                />
                            )}

                            {/* 比赛时间线和题目分配 */}
                            {activeModule === 'timeline' && (
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center">
                                            <CalendarIcon className="h-4 w-4 text-purple-600" />
                                        </div>
                                        <h2 className="text-xl font-semibold">{t("timeline_title")}</h2>
                                    </div>
                                    <GameTimelineEditor
                                        form={form}
                                    />
                                </div>
                            )}

                            {/* 分组管理 */}
                            {activeModule === 'groups' && (
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center">
                                            <Users className="h-4 w-4 text-orange-600" />
                                        </div>
                                        <h2 className="text-xl font-semibold">{t("groups_title")}</h2>
                                    </div>
                                    <GameGroupManager gameId={game_info.game_id} />
                                </div>
                            )}

                            {/* 公告管理 */}
                            {activeModule === 'notices' && (
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
                                            <MessageSquareLock className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <h2 className="text-xl font-semibold">{t("notices_title")}</h2>
                                    </div>
                                    <GameNoticeManager gameId={game_info.game_id} />
                                </div>
                            )}

                            {/* 题目设置 */}
                            {/* {activeModule === 'challenges' && (
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center">
                                            <Trophy className="h-4 w-4 text-red-600" />
                                        </div>
                                        <h2 className="text-xl font-semibold">题目设置</h2>
                                    </div>
                                    <EditGameChallengesModule
                                        form={form}
                                        game_info={game_info}
                                    />
                                </div>
                            )} */}

                            {/* 队伍管理 */}
                            {activeModule === 'teams' && (
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
                                            <Users className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <h2 className="text-xl font-semibold">{t("teams_title")}</h2>
                                    </div>
                                    <TeamManageView
                                        gameId={game_info.game_id}
                                    />
                                </div>
                            )}

                            {/* 容器管理 */}
                            {activeModule === 'containers' && (
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center">
                                            <PackageSearch className="h-4 w-4 text-green-600" />
                                        </div>
                                        <h2 className="text-xl font-semibold">{t("containers_title")}</h2>
                                    </div>
                                    <ContainerManageView
                                        gameId={game_info.game_id}
                                    />
                                </div>
                            )}
                        </div>
                    </MacScrollbar>
                </div>
            </div>
        </Form>
    );
}