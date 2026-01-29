import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "components/ui/form"

import { Input } from "../ui/input";
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "../ui/button";

import { ArrowUpDown, Bitcoin, CircleArrowLeft, Github, Save, ShieldCheck } from "lucide-react"
import { Textarea } from "../ui/textarea";

import { Binary, Bot, Bug, FileSearch, GlobeLock, HardDrive, MessageSquareLock, Radar, Smartphone, SquareCode } from "lucide-react"
import { useEffect, useRef, useState } from "react";
import { MacScrollbar } from "mac-scrollbar";
import { AdminFullGameInfo } from "utils/A1API";
import { api } from "utils/ApiHelper";
import dayjs from "dayjs";
import { toast } from 'react-toastify/unstyled';
import { Switch } from "components/ui/switch"

import {
    ColumnDef,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"

import { Checkbox } from "../ui/checkbox";
import { useNavigate } from "react-router";
import { Slider } from 'components/ui/slider';
import { DateTimePicker24h } from "components/ui/data-time-picker";
import { useTheme } from "next-themes";

export type ChallengeSearchResult = {
    ChallengeID: number,
    Category: string,
    Name: string,
    CreateTime: string
}

export const columns: ColumnDef<ChallengeSearchResult>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "ChallengeID",
        header: "ChallengeID",
        cell: ({ row }) => (
            <div>{row.getValue("ChallengeID")}</div>
        ),
    },
    {
        accessorKey: "Name",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Name
                    <ArrowUpDown />
                </Button>
            )
        },
        cell: ({ row }) => <div>{row.getValue("Name")}</div>,
    },
    {
        accessorKey: "CreateTime",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    CreateTime
                    <ArrowUpDown />
                </Button>
            )
        },
        cell: ({ row }) => <div>{row.getValue("CreateTime")}</div>,
    },
    {
        accessorKey: "Category",
        header: "Category",
        cell: ({ row }) => (
            <div>{row.getValue("Category")}</div>
        ),
    },
    {
        id: "Actions",
        header: "Actions",
        enableHiding: false,
        cell: ({ row: _row }) => {
            return (
                <Button variant={"outline"} size={"sm"} className="select-none" >Select</Button>
            )
        },
    },
]

export function CreateGameView() {

    const categories: { [key: string]: any } = {
        "MISC": <Radar size={21} />,
        "CRYPTO": <MessageSquareLock size={21} />,
        "PWN": <Bug size={21} />,
        "WEB": <GlobeLock size={21} />,
        "REVERSE": <Binary size={21} />,
        "FORENSICS": <FileSearch size={21} />,
        "BLOCKCHAIN": <Bitcoin size={21} />,
        "HARDWARE": <HardDrive size={21} />,
        "MOBILE": <Smartphone size={21} />,
        "PPC": <SquareCode size={21} />,
        "AI": <Bot size={21} />,
        "PENTEST": <ShieldCheck size={21} />,
        "OSINT": <Github size={21} />
    };

    const writeupFormatOptions = ["pdf", "zip", "doc", "docx", "md", "txt"]

    const formSchema = z.object({
        name: z.string().min(2, { message: "名字最短要两个字符" }),
        summary: z.string().optional(),
        description: z.string().optional(),
        poster: z.string().optional(),
        invite_code: z.string().optional(),
        start_time: z.date().optional(),
        end_time: z.date().optional(),
        practice_mode: z.boolean(),
        team_number_limit: z.number(),
        container_number_limit: z.number(),
        require_wp: z.boolean(),
        wp_start_time: z.date().optional(),
        wp_expire_time: z.date().optional(),
        wp_formats: z.array(z.string()).min(1),
        stages: z.array(
            z.object({
                stage_name: z.string().nonempty(),
                start_time: z.date(),
                end_time: z.date(),
            })
        ),
        visible: z.boolean(),
        challenges: z.array(
            z.object({
                challenge_id: z.number(),
                socre: z.number(),
                solved: z.number(),
                challenge_name: z.string(),
                category: z.enum(Object.keys(categories) as [string, ...string[]], {
                    errorMap: () => ({ message: "需要选择一个有效的题目类别" })
                }),
                judge_config: z.object({
                    judge_type: z.enum(["DYNAMIC", "SCRIPT"], {
                        errorMap: () => ({ message: "需要选择一个有效的题目类别" })
                    }),
                    judge_script: z.string().optional(),
                    flag_template: z.string().optional(),
                })
            })
        )
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            summary: "",
            description: "",
            poster: "",
            invite_code: "",
            start_time: new Date(),
            end_time: new Date(),
            practice_mode: false,
            team_number_limit: 3,
            container_number_limit: 3,
            require_wp: false,
            wp_start_time: undefined,
            wp_expire_time: new Date(),
            wp_formats: ["pdf"],
            visible: false,
            stages: [],
            challenges: []
        }
    })

    const format_date = (dt: Date) => {
        return dt.toISOString()
    }

    function onSubmit(values: z.infer<typeof formSchema>) {
        const finalData = {
            game_id: 0,
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
            wp_start_time: values.wp_start_time ? format_date(values.wp_start_time) : undefined,
            wp_expire_time: format_date(values.wp_expire_time ?? new Date()),
            wp_formats: values.wp_formats && values.wp_formats.length ? values.wp_formats : ["pdf"],
            stages: [],
            visible: values.visible,
            challenges: [],
            team_policy: "Auto"
        };

        api.admin.createGame(finalData as AdminFullGameInfo).then((_res) => {
            toast.success("创建成功")
        })
    }

    const router = useNavigate()

    const curKeyWord = useRef("")
    const [searchResult, setSearchResult] = useState<ChallengeSearchResult[]>([])
    const [rowSelection, setRowSelection] = useState({})
    const [_loadingHover, setLoadingHover] = useState(false)
    const lastInputTime = useRef(0)

    const [_totalCount, setTotalCount] = useState(0);

    const table = useReactTable<ChallengeSearchResult>({
        data: searchResult,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onRowSelectionChange: setRowSelection,
        state: {
            rowSelection,
        },
    })

    useEffect(() => {
        table.setPageSize(5)
        const inputListener = setInterval(() => {
            const curTimeStamp = dayjs().valueOf()
            if (lastInputTime.current != 0 && (curTimeStamp - lastInputTime.current) > 500) {
                lastInputTime.current = 0
                api.admin.searchChallenges({ keyword: curKeyWord.current }).then((res) => {
                    setSearchResult(res.data.data.map((c) => ({
                        "Category": c.category,
                        "ChallengeID": c.challenge_id || 0,
                        "Name": c.name,
                        "CreateTime": c.create_time
                    })))
                    setTotalCount(res.data.data.length)
                    setLoadingHover(false)
                })
            }
        }, 200)

        return () => {
            clearInterval(inputListener)
        }
    }, [])

    const { theme } = useTheme()

    return (
        <div className="absolute w-screen h-screen bg-background items-center justify-center flex select-none overflow-x-hidden overflow-hidden">
            <Form {...form}>
                <MacScrollbar className="h-full w-full flex flex-col items-center"
                    skin={theme == "light" ? "light" : "dark"}
                >
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-20 pt-20 w-[80%] flex flex-col">
                        <div className="flex">
                            <Button type="button" variant={"default"} onClick={() => {
                                router(`/admin/games`)
                            }}>
                                <CircleArrowLeft />
                                Back to games
                            </Button>
                        </div>
                        <span className="text-3xl font-bold">Create a game</span>
                        <span className="text-lg font-semibold">基本信息</span>
                        <div className="flex gap-10 items-center">
                            <div className="w-1/3">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center h-[20px]">
                                                <FormLabel>比赛名称</FormLabel>
                                                <div className="flex-1" />
                                                <FormMessage className="text-[14px]" />
                                            </div>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                请填写比赛名称
                                            </FormDescription>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="w-1/3">
                                <FormField
                                    control={form.control}
                                    name={`start_time`}
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>开始时间</FormLabel>
                                            <DateTimePicker24h
                                                date={field.value}
                                                setDate={field.onChange}
                                            />
                                            <FormDescription>
                                                请选择比赛开始时间
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="w-1/3">
                                <FormField
                                    control={form.control}
                                    name={`end_time`}
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>结束时间</FormLabel>
                                            <DateTimePicker24h
                                                date={field.value}
                                                setDate={field.onChange}
                                            />
                                            <FormDescription>
                                                请选择比赛结束时间
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                        <FormField
                            control={form.control}
                            name="summary"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center h-[20px]">
                                        <FormLabel>比赛简介</FormLabel>
                                        <div className="flex-1" />
                                        <FormMessage className="text-[14px]" />
                                    </div>
                                    <FormControl>
                                        <Textarea {...field} className="h-[100px]" />
                                    </FormControl>
                                    <FormDescription>
                                        比赛简介
                                    </FormDescription>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center h-[20px]">
                                        <FormLabel>比赛详细信息</FormLabel>
                                        <div className="flex-1" />
                                        <FormMessage className="text-[14px]" />
                                    </div>
                                    <FormControl>
                                        <Textarea {...field} className="h-[300px]" />
                                    </FormControl>
                                    <FormDescription>
                                        比赛详细信息
                                    </FormDescription>
                                </FormItem>
                            )}
                        />
                        <div className="flex gap-10 items-center">
                            <div className="w-1/3">
                                <FormField
                                    control={form.control}
                                    name="practice_mode"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-y-0 justify-between rounded-lg border p-3 shadow-sm">
                                            <div className="space-y-0.5 mb-[-1px]">
                                                <FormLabel>练习模式</FormLabel>
                                                <FormDescription>
                                                    是否开启练习模式
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
                            <div className="w-1/3">
                                <FormField
                                    control={form.control}
                                    name="require_wp"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-y-0 justify-between rounded-lg border p-3 shadow-sm">
                                            <div className="space-y-0.5 mb-[-1px]">
                                                <FormLabel>WriteUP</FormLabel>
                                                <FormDescription>
                                                    是否需要提交 WriteUP
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
                            <div className="w-1/3">
                                <FormField
                                    control={form.control}
                                    name="visible"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-y-0 justify-between rounded-lg border p-3 shadow-sm">
                                            <div className="space-y-0.5 mb-[-1px]">
                                                <FormLabel>是否可见</FormLabel>
                                                <FormDescription>
                                                    比赛是否可见
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
                        </div>
                        <span className="text-lg font-semibold">详细设置</span>
                        <div className="flex gap-10 items-center">
                            <div className="w-1/2 flex flex-col gap-6">
                                <FormField
                                    control={form.control}
                                    name="invite_code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center h-[20px]">
                                                <FormLabel>邀请码</FormLabel>
                                                <div className="flex-1" />
                                                <FormMessage className="text-[14px]" />
                                            </div>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                不需要请留空
                                            </FormDescription>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="wp_start_time"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>WriteUp开始时间</FormLabel>
                                            <DateTimePicker24h
                                                date={field.value}
                                                setDate={field.onChange}
                                            />
                                            <FormDescription>
                                                设置允许提交 WriteUp 的开始时间
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`wp_expire_time`}
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>WriteUp截至时间</FormLabel>
                                            <DateTimePicker24h
                                                date={field.value}
                                                setDate={field.onChange}
                                            />
                                            <FormDescription>
                                                请选择 WriteUp 截止时间
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="wp_formats"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>WriteUp格式</FormLabel>
                                            <div className="flex flex-wrap gap-2 mt-2">
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
                                                                if (selected && current.length === 1) return
                                                                const next = selected ? current.filter((val) => val !== fmt) : [...current, fmt]
                                                                field.onChange(next)
                                                            }}
                                                        >
                                                            {fmt.toUpperCase()}
                                                        </Button>
                                                    )
                                                })}
                                            </div>
                                            <FormDescription>选择允许提交的文件格式</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="w-1/2 flex flex-col gap-6">
                                <FormField
                                    control={form.control}
                                    name="team_number_limit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center h-[20px]">
                                                <FormLabel>队伍人数限制</FormLabel>
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
                                                        onValueChange={(v) => field.onChange(v[0])}
                                                    />
                                                    <div className='flex-1' />
                                                    <span className='w-8'>{field.value}</span>
                                                </div>
                                            </FormControl>
                                            <FormDescription>
                                                队伍人数限制
                                            </FormDescription>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="container_number_limit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center h-[20px]">
                                                <FormLabel>队伍容器数量限制</FormLabel>
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
                                                        onValueChange={(v) => field.onChange(v[0])}
                                                    />
                                                    <div className='flex-1' />
                                                    <span className='w-8'>{field.value}</span>
                                                </div>
                                            </FormControl>
                                            <FormDescription>
                                                队伍容器数量限制
                                            </FormDescription>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="flex">
                            <Button type="submit">
                                <Save />
                                提交
                            </Button>
                        </div>
                    </form>
                </MacScrollbar>
            </Form>
        </div>
    );
}
