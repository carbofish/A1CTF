import { Avatar, AvatarImage, AvatarFallback } from "components/ui/avatar";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "components/ui/tabs"
import { Skeleton } from "components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "components/ui/card";
import { Badge } from "components/ui/badge";
import dayjs from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import { Download, X, Calculator, AlertTriangle, Ban, Gift, Trophy, Target, Users, Award, TrendingUp, Clock, AtSign } from "lucide-react";
import { MacScrollbar } from "mac-scrollbar";
import { Tooltip } from "react-tooltip";
import { Button } from "components/ui/button";
import { useTheme } from "next-themes";
import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState, useMemo } from "react";

import ReactECharts from 'echarts-for-react';
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
} from 'components/ui/chart';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell } from 'recharts';
import { TeamScore, TeamTimelineLowCost, UserFullGameInfo, UserSimpleGameChallenge } from "utils/A1API";
import useSWR from "swr";
import { api } from "utils/ApiHelper";
import { useScoreboardTimeLine } from "hooks/UseScoreboard";

export default function TeamScoreDetailPage(
    {
        showUserDetail,
        setShowUserDetail,
        gameInfo,
        challenges
    }: {
        showUserDetail: TeamScore,
        setShowUserDetail: Dispatch<SetStateAction<TeamScore>>
        gameInfo: UserFullGameInfo | undefined,
        challenges: Record<string, UserSimpleGameChallenge[]>
    }
) {

    const { theme } = useTheme()
    const personalChartRef = useRef<ReactECharts>(null)

    const { teamTimeLine, teamTimeLineLoading } = useScoreboardTimeLine(gameInfo?.game_id ?? 0, showUserDetail.team_id ?? 0)

    const [personalChartOption, setPersonalChartOption] = useState<echarts.EChartsOption>()

    // 颜色配置
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C', '#8DD1E1', '#D084D0'];

    const getChallenge = (id: number): UserSimpleGameChallenge | undefined => {
        let target: UserSimpleGameChallenge | undefined
        if (challenges) {
            Object.values(challenges).forEach((es) => {
                const tmp = es.find((e) => e.challenge_id == id)
                if (tmp) target = tmp;
            })
        }
        return target
    }

    // 获取分数修正类型的图标和颜色
    const getAdjustmentTypeInfo = (type: string) => {
        switch (type) {
            case 'cheat':
                return {
                    icon: <Ban className="w-5 h-5" />,
                    color: 'text-red-500',
                    label: '作弊扣分'
                };
            case 'reward':
                return {
                    icon: <Gift className="w-5 h-5" />,
                    color: 'text-green-500',
                    label: '奖励加分'
                };
            case 'other':
                return {
                    icon: <AlertTriangle className="w-5 h-5" />,
                    color: 'text-yellow-500',
                    label: '其他调整'
                };
            default:
                return {
                    icon: <Calculator className="w-5 h-5" />,
                    color: 'text-gray-500',
                    label: '未知'
                };
        }
    }

    // 计算题目类别分配数据
    const categoryData = useMemo(() => {
        if (!challenges) return [];

        // 获取所有可能的题目类型
        const allCategories = new Set<string>();
        Object.keys(challenges).forEach((e) => {
            allCategories.add(e.toString().toUpperCase())
        })

        const categoryCount: Record<string, number> = {};
        const categoryScore: Record<string, number> = {};

        // 初始化所有类型为0
        allCategories.forEach(category => {
            categoryCount[category] = 0;
            categoryScore[category] = 0;
        });

        // 统计已解出的题目
        if (showUserDetail.solved_challenges) {
            showUserDetail.solved_challenges.forEach(solved => {
                const challenge = getChallenge(solved.challenge_id || 0);
                if (challenge?.category) {
                    const category = challenge.category;
                    categoryCount[category] = (categoryCount[category] || 0) + 1;
                    categoryScore[category] = (categoryScore[category] || 0) + (challenge.cur_score || 0);
                }
            });
        }

        return Array.from(allCategories).map(category => ({
            category,
            count: categoryCount[category] || 0,
            score: categoryScore[category] || 0,
            fullMark: Math.max(...Object.values(categoryCount)) || 1
        }));
    }, [showUserDetail.solved_challenges, challenges]);

    // 计算成员得分数据
    const memberScoreData = useMemo(() => {
        if (!showUserDetail.solved_challenges) return [];

        const memberScores: Record<string, number> = {};

        showUserDetail.solved_challenges.forEach(solved => {
            const solver = solved.solver || 'Unknown';
            const challenge = getChallenge(solved.challenge_id || 0);
            memberScores[solver] = (memberScores[solver] || 0) + (challenge?.cur_score || 0) + (solved.blood_reward || 0);
        });

        return Object.entries(memberScores).map(([name, score]) => ({
            name,
            value: score
        }));
    }, [showUserDetail.solved_challenges]);

    // 计算题目分数占比数据
    const challengeScoreData = useMemo(() => {
        if (!showUserDetail.solved_challenges) return [];

        return showUserDetail.solved_challenges.map(solved => {
            const challenge = getChallenge(solved.challenge_id || 0);
            return {
                name: challenge?.challenge_name || 'Unknown',
                value: (challenge?.cur_score || 0) + (solved.blood_reward || 0),
                category: challenge?.category || 'MISC'
            };
        }).sort((a, b) => b.value - a.value);
    }, [showUserDetail.solved_challenges]);

    useEffect(() => {
        if (teamTimeLineLoading) return
        if (!gameInfo) return

        if (!showUserDetail.team_id) {
            setPersonalChartOption((data) => ({
                ...data,
                series: []
            }))
            return
        }

        const current = dayjs()
        const end = dayjs(gameInfo.end_time).diff(current) > 0 ? current : dayjs(gameInfo.end_time)

        let timeBase = teamTimeLine?.time_base

        for (let i = 0; i < (teamTimeLine?.scores?.length || 0); i++) {
            if (teamTimeLine?.times) {
                teamTimeLine.times[i] += timeBase || 0;
                timeBase = teamTimeLine.times[i];
            }
        }

        setPersonalChartOption({
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                borderWidth: 0,
                textStyle: {
                    fontSize: 12,
                    color: theme == "dark" ? "#121212" : "#FFFFFF",
                },
                backgroundColor: theme == "dark" ? "#FFFFFF" : "#121212"
            },
            title: {
                left: 'center',
                text: `${showUserDetail.team_name} - 记分榜`,
                textStyle: {
                    color: theme == "dark" ? "#FFFFFF" : "#121212",
                }
            },
            toolbox: {
                show: false,
                feature: {
                    dataZoom: {
                        yAxisIndex: 'none'
                    },
                    restore: {},
                    saveAsImage: {}
                }
            },
            xAxis: {
                type: 'time',
                min: dayjs(gameInfo?.start_time).toDate(),
                max: dayjs(gameInfo?.end_time).toDate(),
                splitLine: {
                    show: false,
                },
            },
            yAxis: {
                type: 'value',
                boundaryGap: [0, '100%'],
                max: (value: any) => (Math.floor(value.max / 1000) + 1) * 1000,
                splitLine: {
                    show: true,
                },
            },
            dataZoom: [
                {
                    type: 'inside',
                    start: 0,
                    end: 100,
                    xAxisIndex: 0,
                    filterMode: 'none'
                },
                {
                    start: 0,
                    end: 100,
                    xAxisIndex: 0,
                    showDetail: false,
                }
            ],
            series: [
                {
                    type: 'line',
                    step: 'end',
                    data: [],
                    markLine:
                        dayjs(gameInfo.end_time).diff(dayjs(), 's') < 0
                            ? undefined
                            : {
                                symbol: 'none',
                                data: [
                                    {
                                        xAxis: +end.toDate(),
                                        // lineStyle: {
                                        //     color: colorScheme === 'dark' ? "#FFFFFF" : "#000000",
                                        //     wight: 2,
                                        // },
                                        label: {
                                            textBorderWidth: 0,
                                            fontWeight: 500,
                                            color: theme === 'dark' ? '#94a3b8' : '#64748b',
                                            formatter: (time: any) => dayjs(time.value).format('YYYY-MM-DD HH:mm'),
                                        },
                                    },
                                ],
                            },
                },
                ...([teamTimeLine].map((team) => ({
                    name: team?.team_name,
                    type: 'line',
                    showSymbol: false,
                    step: 'end',
                    data: [
                        [+new Date(dayjs(gameInfo.start_time).toDate()), 0],
                        ...(team?.scores?.map((score, idx) => [team?.times?.[idx] || 0, score || 0]) || []),
                        [+end.toDate(), (team?.scores && team.scores[team.scores.length - 1]) || 0]
                    ],
                    lineStyle: {
                        width: 3
                    },
                    smooth: true,
                }) as echarts.SeriesOption) || [])
            ] as echarts.SeriesOption[]
        })
    }, [teamTimeLine])

    return (
        <AnimatePresence>
            {showUserDetail.team_id && (
                <motion.div className='absolute top-0 left-0 w-full h-full flex items-center justify-center z-30'
                    initial={{
                        backdropFilter: "blur(0px)"
                    }}
                    animate={{
                        backdropFilter: "blur(12px)"
                    }}
                    exit={{
                        backdropFilter: "blur(0px)"
                    }}
                >
                    <MacScrollbar className='w-full h-full' skin={theme == "light" ? "light" : "dark"} suppressScrollX>
                        <div className='min-h-full flex items-center justify-center py-8'>
                            <motion.div className='absolute top-10 right-10 z-10'
                                initial={{
                                    opacity: 0
                                }}
                                animate={{
                                    opacity: 1
                                }}
                                exit={{
                                    opacity: 0
                                }}
                            >
                                <div className='flex gap-2'>
                                    <Button className='w-[50px] h-[50px] [&_svg]:size-8 rounded-lg' variant="default"
                                        onClick={() => {
                                            setShowUserDetail({})
                                        }}
                                    >
                                        <X />
                                    </Button>
                                </div>
                            </motion.div>
                            <motion.div className='w-full px-8'
                                initial={{
                                    opacity: 0
                                }}
                                animate={{
                                    opacity: 1
                                }}
                                exit={{
                                    opacity: 0
                                }}
                            >
                                <Tooltip id="challengeTooltip2" opacity={0.9} className='z-[200]' />
                                <div className='flex flex-row h-full w-full gap-6'>
                                    <div className="flex flex-col w-full h-full gap-4 lg:basis-3/5 lg:overflow-hidden pb-5">
                                        {/* 队伍基本信息卡片 */}
                                        <Card className="bg-background/50 shadow-none">
                                            <CardContent className="p-6">
                                                <div className='flex items-center gap-4 mb-4'>
                                                    <Avatar className="select-none w-16 h-16 ring-2 ring-primary/20">
                                                        {showUserDetail.team_avatar ? (
                                                            <>
                                                                <AvatarImage src={showUserDetail.team_avatar || "#"} alt="team avatar" />
                                                                <AvatarFallback><Skeleton className="h-16 w-16 rounded-full" /></AvatarFallback>
                                                            </>
                                                        ) : (
                                                            <div className='w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center'>
                                                                <span className='text-primary-foreground text-xl font-bold'> {showUserDetail.team_name?.substring(0, 2)} </span>
                                                            </div>
                                                        )}
                                                    </Avatar>
                                                    <div className='flex-1'>
                                                        <div className="flex gap-2 items-center">
                                                            <h2 className='text-2xl font-bold text-foreground mb-1'>{showUserDetail.team_name}</h2>
                                                            {showUserDetail.group_id && (
                                                                <Badge className="text-sm bg-primary/10 hover:bg-primary/10 text-primary font-medium select-none">
                                                                    # {showUserDetail.group_name}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className='text-sm text-muted-foreground italic'>
                                                            "{showUserDetail.team_slogan || "They didn't say anything."}"
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* 统计信息网格 */}
                                                <div className='grid grid-cols-2 gap-4 select-none'>
                                                    <div className='flex items-center gap-3 p-3 rounded-lg bg-muted/90'>
                                                        <div className='p-2 rounded-full bg-yellow-500/20'>
                                                            <Trophy className='w-5 h-5 text-yellow-600' />
                                                        </div>
                                                        <div>
                                                            <p className='text-sm text-muted-foreground'>排名</p>
                                                            <p className='text-xl font-bold text-foreground'>#{showUserDetail.rank}</p>
                                                        </div>
                                                    </div>

                                                    <div className='flex items-center gap-3 p-3 rounded-lg bg-muted/90'>
                                                        <div className='p-2 rounded-full bg-green-500/20'>
                                                            <Target className='w-5 h-5 text-green-600' />
                                                        </div>
                                                        <div>
                                                            <p className='text-sm text-muted-foreground'>解题数</p>
                                                            <p className='text-xl font-bold text-foreground'>{showUserDetail?.solved_challenges?.length ?? 0}</p>
                                                        </div>
                                                    </div>

                                                    <div className='flex items-center gap-3 p-3 rounded-lg bg-muted/90'>
                                                        <div className='p-2 rounded-full bg-blue-500/20'>
                                                            <Award className='w-5 h-5 text-blue-600' />
                                                        </div>
                                                        <div>
                                                            <p className='text-sm text-muted-foreground'>总分</p>
                                                            <p className='text-xl font-bold text-foreground'>{showUserDetail.score} pts</p>
                                                        </div>
                                                    </div>

                                                    <div className='flex items-center gap-3 p-3 rounded-lg bg-muted/90'>
                                                        <div className='p-2 rounded-full bg-purple-500/20'>
                                                            <Users className='w-5 h-5 text-purple-600' />
                                                        </div>
                                                        <div>
                                                            <p className='text-sm text-muted-foreground'>成员数</p>
                                                            <p className='text-xl font-bold text-foreground'>{showUserDetail.team_members?.length ?? 0}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* 数据分析图表区域 */}
                                        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 select-none'>
                                            {/* 题目分数占比饼图 */}
                                            <Card className="bg-background/50 shadow-none">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-lg flex items-center gap-2">
                                                        <Award className="w-5 h-5" />
                                                        题目分数占比
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="">
                                                    {challengeScoreData.length > 0 ? (
                                                        <ChartContainer
                                                            config={challengeScoreData.reduce((config, item, index) => {
                                                                config[item.name] = {
                                                                    label: item.name,
                                                                    color: COLORS[index % COLORS.length],
                                                                };
                                                                return config;
                                                            }, {} as ChartConfig)}
                                                            className="h-full"
                                                        >
                                                            <PieChart>
                                                                <Pie
                                                                    data={challengeScoreData}
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    outerRadius={80}
                                                                    fill="#8884d8"
                                                                    dataKey="value"
                                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                                                                    labelLine={false}
                                                                >
                                                                    {challengeScoreData.map((entry, index) => (
                                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                    ))}
                                                                </Pie>
                                                                <ChartTooltip
                                                                    content={<ChartTooltipContent />}
                                                                />
                                                            </PieChart>
                                                        </ChartContainer>
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                                            暂无数据
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>

                                            {/* 成员得分饼图 */}
                                            <Card className="bg-background/50 shadow-none">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-lg flex items-center gap-2">
                                                        <Users className="w-5 h-5" />
                                                        成员贡献
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="">
                                                    {memberScoreData.length > 0 ? (
                                                        <ChartContainer
                                                            config={memberScoreData.reduce((config, item, index) => {
                                                                config[item.name] = {
                                                                    label: item.name,
                                                                    color: COLORS[index % COLORS.length],
                                                                };
                                                                return config;
                                                            }, {} as ChartConfig)}
                                                            className="h-full"
                                                        >
                                                            <PieChart>
                                                                <Pie
                                                                    data={memberScoreData}
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    outerRadius={80}
                                                                    fill="#8884d8"
                                                                    dataKey="value"
                                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                                    labelLine={false}
                                                                >
                                                                    {memberScoreData.map((entry, index) => (
                                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                    ))}
                                                                </Pie>
                                                                <ChartTooltip
                                                                    content={<ChartTooltipContent />}
                                                                />
                                                                {/* <ChartLegend content={<ChartLegendContent />} /> */}
                                                            </PieChart>
                                                        </ChartContainer>
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                                            暂无数据
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </div>
                                        <Card className="w-full h-full flex flex-col bg-background/50 shadow-none">
                                            <CardHeader className="pb-3 select-none">
                                                <CardTitle className="text-xl font-bold flex items-center gap-2">
                                                    <Calculator className="w-5 h-5" />
                                                    详细记录
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="flex-1 overflow-hidden p-0">
                                                <Tabs defaultValue="solved" className="w-full h-full flex flex-col">
                                                    <div className="px-6 select-none">
                                                        <TabsList className="grid w-full grid-cols-2 mb-4">
                                                            <TabsTrigger value="solved" className="flex items-center gap-2">
                                                                <Target className="w-4 h-4" />
                                                                解题记录 ({showUserDetail.solved_challenges?.length || 0})
                                                            </TabsTrigger>
                                                            <TabsTrigger value="adjustments" className="flex items-center gap-2">
                                                                <AlertTriangle className="w-4 h-4" />
                                                                分数修正 ({showUserDetail.score_adjustments?.length || 0})
                                                            </TabsTrigger>
                                                        </TabsList>
                                                    </div>
                                                    <TabsContent value="solved" className="flex-1 overflow-hidden px-6 pb-6">
                                                        <div className='h-full overflow-hidden'>
                                                            <MacScrollbar className='w-full h-full overflow-y-auto' skin={theme == "light" ? "light" : "dark"} suppressScrollX>
                                                                <div className='space-y-3 pr-2'>
                                                                    {showUserDetail.solved_challenges?.map((e, index) => {
                                                                        const challenge = getChallenge(e.challenge_id || 0);
                                                                        return (
                                                                            <Card key={`solved-problem-${index}`} className='p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-l-4 border-l-green-500 hover:shadow-md transition-all duration-200'>
                                                                                <div className='flex justify-between items-start'>
                                                                                    <div className='flex-1'>
                                                                                        <div className='flex items-center gap-2 mb-2'>
                                                                                            <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 select-none">
                                                                                                #{e.rank}
                                                                                            </Badge>
                                                                                            <h4 className='font-semibold text-foreground text-lg'>{challenge?.challenge_name}</h4>
                                                                                        </div>
                                                                                        <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                                                                                            <div className='flex items-center gap-1'>
                                                                                                <Users className='w-4 h-4' />
                                                                                                <span>{e.solver}</span>
                                                                                            </div>
                                                                                            <div className='flex items-center gap-1'>
                                                                                                <Clock className='w-4 h-4' />
                                                                                                <span>{dayjs(e.solve_time).format('MM-DD HH:mm:ss')}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className='text-right select-none'>
                                                                                        <div className='bg-green-500 text-white px-3 py-1 rounded-full font-bold text-sm'>
                                                                                            +{challenge?.cur_score} pts
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </Card>
                                                                        );
                                                                    })}
                                                                    {(!showUserDetail.solved_challenges || showUserDetail.solved_challenges.length === 0) && (
                                                                        <div className='flex flex-col items-center justify-center h-32 text-muted-foreground'>
                                                                            <Target className='w-12 h-12 mb-2 opacity-50' />
                                                                            <p>暂无解题记录</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </MacScrollbar>
                                                        </div>
                                                    </TabsContent>

                                                    <TabsContent value="adjustments" className="flex-1 overflow-hidden px-6 pb-6">
                                                        <div className='h-full overflow-hidden'>
                                                            <MacScrollbar className='w-full h-full overflow-y-auto' skin={theme == "light" ? "light" : "dark"} suppressScrollX>
                                                                <div className='space-y-3 pr-2'>
                                                                    {showUserDetail.score_adjustments?.map((adj, index) => {
                                                                        const typeInfo = getAdjustmentTypeInfo(adj.adjustment_type);
                                                                        const isPositive = adj.score_change >= 0;
                                                                        return (
                                                                            <Card key={`score-adjustment-${index}`} className={`p-4 border-l-4 hover:shadow-md transition-all duration-200 ${isPositive
                                                                                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-l-blue-500'
                                                                                : 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 border-l-red-500'
                                                                                }`}>
                                                                                <div className='flex justify-between items-start'>
                                                                                    <div className='flex-1'>
                                                                                        <div className='flex items-center gap-2 mb-2'>
                                                                                            <div className={`p-1 rounded-full ${isPositive ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-red-100 dark:bg-red-900/30'
                                                                                                }`}>
                                                                                                <span className={typeInfo.color}>
                                                                                                    {typeInfo.icon}
                                                                                                </span>
                                                                                            </div>
                                                                                            <h4 className='font-semibold text-foreground text-lg'>{typeInfo.label}</h4>
                                                                                        </div>
                                                                                        <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                                                                                            <div className='flex items-center gap-1'>
                                                                                                <AtSign className='w-4 h-4' />
                                                                                                <span>{adj.reason}</span>
                                                                                            </div>
                                                                                            <div className='flex items-center gap-1'>
                                                                                                <Clock className='w-4 h-4' />
                                                                                                <span>{dayjs(adj.created_at).format('MM-DD HH:mm:ss')}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className='text-right'>
                                                                                        <div className={`px-3 py-1 rounded-full font-bold text-sm text-white select-none ${isPositive ? 'bg-blue-500' : 'bg-red-500'
                                                                                            }`}>
                                                                                            {adj.score_change >= 0 ? '+' : ''}{adj.score_change} pts
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </Card>
                                                                        );
                                                                    })}
                                                                    {(!showUserDetail.score_adjustments || showUserDetail.score_adjustments.length === 0) && (
                                                                        <div className='flex flex-col items-center justify-center h-32 text-muted-foreground'>
                                                                            <Calculator className='w-12 h-12 mb-2 opacity-50' />
                                                                            <p>暂无分数修正记录</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </MacScrollbar>
                                                        </div>
                                                    </TabsContent>
                                                </Tabs>
                                            </CardContent>
                                        </Card>
                                    </div>
                                    <div className="h-full basis-2/5 overflow-hidden hidden lg:flex flex-col gap-4 pb-5 select-none">
                                        {/* 题目类别雷达图 */}
                                        <Card className="bg-background/50 shadow-none">
                                            <CardHeader className="">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Target className="w-5 h-5" />
                                                    解题分布
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="">
                                                {categoryData.length > 0 ? (
                                                    <ChartContainer
                                                        config={{
                                                            count: {
                                                                label: "解题数量",
                                                                color: "var(--chart-1)",
                                                            },
                                                        } satisfies ChartConfig}
                                                        className="h-full"
                                                    >
                                                        <RadarChart data={categoryData}>
                                                            <PolarGrid />
                                                            <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
                                                            <PolarRadiusAxis angle={90} domain={[0, 'dataMax']} tick={{ fontSize: 10 }} />
                                                            <ChartTooltip
                                                                content={<ChartTooltipContent />}
                                                            />
                                                            <ChartLegend content={<ChartLegendContent />} />
                                                            <Radar
                                                                name="解题数量"
                                                                dataKey="count"
                                                                stroke="var(--color-count)"
                                                                fill="var(--color-count)"
                                                                fillOpacity={0.3}
                                                                strokeWidth={2}
                                                            />
                                                        </RadarChart>
                                                    </ChartContainer>
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                                        暂无数据
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        {/* 个人积分图表 */}
                                        <Card className='flex-shrink-0 bg-background/50 shadow-none'>
                                            <CardHeader className="pb-2">
                                                <div className='flex items-center justify-between'>
                                                    <CardTitle className='text-xl font-bold flex items-center gap-2'>
                                                        <TrendingUp className='w-5 h-5' />
                                                        积分变化趋势
                                                    </CardTitle>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="aspect-[16/8]">
                                                {personalChartOption && (
                                                    <ReactECharts
                                                        ref={personalChartRef}
                                                        option={personalChartOption}
                                                        notMerge={false}
                                                        lazyUpdate={true}
                                                        style={{
                                                            height: "100%"
                                                        }}
                                                        opts={{
                                                            renderer: 'svg'
                                                        }}
                                                        theme={"theme_name"}
                                                    // onChartReady={this.onChartReadyCallback}
                                                    // onEvents={EventsDict}
                                                    // opts={}
                                                    />
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </MacScrollbar>
                </motion.div>
            )}
        </AnimatePresence>
    )
}