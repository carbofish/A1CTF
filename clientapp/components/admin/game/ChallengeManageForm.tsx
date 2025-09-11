import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "components/ui/form"

import { useFieldArray, useWatch } from "react-hook-form";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "components/ui/select"

import { Input } from "components/ui/input";
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "components/ui/button";

import { Bitcoin, Cloud, FileCode, Github, PlusCircle, Save, ScanBarcode, ShieldCheck, TableProperties, Trash2, Upload } from "lucide-react"


import { Binary, Bot, Bug, FileSearch, GlobeLock, HardDrive, MessageSquareLock, Radar, Smartphone, SquareCode } from "lucide-react"
import { useState } from "react";
import { AdminChallengeConfig } from "utils/A1API";
import { api } from "utils/ApiHelper";
import { toast } from 'react-toastify/unstyled';
import { UploadFileDialog } from "components/dialogs/UploadFileDialog";
import { Switch } from "components/ui/switch";
import LazyThemedEditor from "components/modules/LazyThemedEditor";
import useSWR from "swr";

interface ContainerFormProps {
    control: any;
    index: number;
    removeContainer: (index: number) => void;
}

interface AttachmentFormProps {
    control: any;
    index: number;
    form: any;
    removeAttachment: (index: number) => void;
    onFormSubmit: () => Promise<void>;
}

function ContainerForm({ control, index, removeContainer }: ContainerFormProps) {
    const {
        fields: portFields,
        append: appendPort,
        remove: removePort,
    } = useFieldArray({
        control,
        name: `container_config.${index}.expose_ports`,
    });

    const {
        fields: commands,
        append: appendCommand,
        remove: removeCommand,
    } = useFieldArray({
        control,
        name: `container_config.${index}.command`,
    });

    return (
        <div className="border p-6 mb-4 rounded-lg hover:shadow-lg transition-shadow duration-300 flex flex-col gap-4">
            <div className="flex justify-between items-center mb-2">
                <span className="font-md font-semibold">容器 {index + 1}</span>
                <Button variant="destructive" type="button" onClick={() => removeContainer(index)}>
                    删除容器
                </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={control}
                    name={`container_config.${index}.name`}
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center h-[20px]">
                                <FormLabel>容器名称</FormLabel>
                                <div className="flex-1" />
                                <FormMessage className="text-[14px]" />
                            </div>
                            <FormControl>
                                <Input {...field} value={field.value ?? ""} />
                            </FormControl>
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name={`container_config.${index}.image`}
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center h-[20px]">
                                <FormLabel>镜像名称</FormLabel>
                                <div className="flex-1" />
                                <FormMessage className="text-[14px]" />
                            </div>
                            <FormControl>
                                <Input {...field} value={field.value ?? ""} />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>
            <FormField
                control={control}
                name={`container_config.${index}.env`}
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center h-[20px]">
                            <FormLabel>环境变量</FormLabel>
                            <div className="flex-1" />
                            <FormMessage className="text-[14px]" />
                        </div>
                        <FormControl>
                            <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormDescription>
                            键值对的形式, 用逗号隔开, 如: KEY=VALUE,KEY2=VALUE2, 支持<a className="hover:underline hover:cursor-pointer underline-offset-2 text-red-400">模板变量</a>
                        </FormDescription>
                    </FormItem>
                )}
            />
            <div className="flex flex-col gap-2">
                <div className="flex items-center h-[20px] mb-4">
                    <FormLabel>启动命令</FormLabel>
                    <div className="flex-1" />
                    <Button
                        variant="outline"
                        onClick={() => appendCommand("")}
                    ><PlusCircle />添加启动命令</Button>
                </div>
                {commands.length ? (
                    commands.map((_, commandIndex) => (
                        <FormField
                            key={commandIndex}
                            control={control}
                            name={`container_config.${index}.command.${commandIndex}`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <div className="flex w-full gap-1 items-center">
                                            <Input {...field} value={field.value ?? ""} />
                                            <div className="flex-1" />
                                            <Button
                                                variant="outline" className="text-red-400"
                                                size="icon"
                                                onClick={() => {
                                                    removeCommand(commandIndex)
                                                }}
                                            ><Trash2 /></Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-[14px]" />
                                </FormItem>
                            )}
                        />
                    ))
                ) : (
                    <></>
                )}
                <FormDescription>
                    例如 bash -c "time" 你就需要创建三个 bash, -c, time
                </FormDescription>
            </div>

            {/* <span className="text-md font-semibold mt-4">资源限制</span> */}
            <div className="grid grid-cols-3 gap-4 mt-4">
                <FormField
                    control={control}
                    name={`container_config.${index}.cpu_limit`}
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center h-[20px]">
                                <FormLabel>CPU 资源限制 (毫核)</FormLabel>
                                <div className="flex-1" />
                                <FormMessage className="text-[14px]" />
                            </div>
                            <FormControl>
                                <Input {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormDescription>
                                1000 毫核 为 1 核心
                            </FormDescription>
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name={`container_config.${index}.memory_limit`}
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center h-[20px]">
                                <FormLabel>内存限制 (M)</FormLabel>
                                <div className="flex-1" />
                                <FormMessage className="text-[14px]" />
                            </div>
                            <FormControl>
                                <Input {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormDescription>
                                单位为 MB
                            </FormDescription>
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name={`container_config.${index}.storage_limit`}
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center h-[20px]">
                                <FormLabel>存储限制 (M)</FormLabel>
                                <div className="flex-1" />
                                <FormMessage className="text-[14px]" />
                            </div>
                            <FormControl>
                                <Input {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormDescription>
                                单位为 MB
                            </FormDescription>
                        </FormItem>
                    )}
                />
            </div>
            <div className="mt-4">
                <div className="flex items-center mb-3">
                    <span className="text-md font-semibold">端口暴露</span>
                    <div className="flex-1" />
                    <Button
                        type="button"
                        variant={"outline"}
                        onClick={() => appendPort({ name: "", port: 0 })}
                    >
                        <PlusCircle />
                        添加端口
                    </Button>
                </div>
                <span className="text-sm text-foreground/50">端口名称是你需要映射出来的端口的名称, 这会显示给选手, 端口号是容器内服务的端口, A1CTF会自动映射随机端口到宿主机上, 注意！一道题的不同容器不能同时暴露相同的端口! 比如: 容器1和容器2同时要求暴露80端口, 这会导致映射出问题! 请你在制作docker的时候选择不同的监听端口</span>
                <div className="h-4" />
                {portFields.map((port, portIndex) => (
                    <div key={port.id} className="flex gap-2 items-end mb-2">
                        <FormField
                            control={control}
                            name={`container_config.${index}.expose_ports.${portIndex}.name`}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <div className="flex items-center w- h-[20px]">
                                        <FormLabel>端口名称</FormLabel>
                                        <div className="flex-1" />
                                        <FormMessage className="text-[14px]" />
                                    </div>
                                    <FormControl>
                                        <Input {...field} value={field.value ?? ""} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name={`container_config.${index}.expose_ports.${portIndex}.port`}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <div className="flex items-center w- h-[20px]">
                                        <FormLabel>端口号</FormLabel>
                                        <div className="flex-1" />
                                        <FormMessage className="text-[14px]" />
                                    </div>
                                    <FormControl>
                                        <Input type="number" {...field} value={field.value ?? 0} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <Button variant="destructive" type="button" onClick={() => removePort(portIndex)}>
                            删除端口
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function AttachmentForm({ control, index, form, removeAttachment, onFormSubmit }: AttachmentFormProps) {

    const attachType = useWatch({
        control,
        name: `attachments.${index}.attach_type`, // Watch the specific field
    });

    return (
        <div className="border p-6 mb-4 rounded-lg hover:shadow-lg transition-shadow duration-300">
            <div className="flex justify-between items-center mb-2">
                <span className="font-md font-semibold">附件 {index + 1}</span>
                <Button variant="destructive" type="button" onClick={() => removeAttachment(index)}>
                    删除附件
                </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={control}
                    name={`attachments.${index}.attach_name`}
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center h-[20px]">
                                <FormLabel>附件名称</FormLabel>
                                <div className="flex-1" />
                                <FormMessage className="text-[14px]" />
                            </div>
                            <FormControl>
                                <Input {...field} value={field.value ?? ""} />
                            </FormControl>
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name={`attachments.${index}.attach_type`}
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center h-[20px]">
                                <FormLabel>附件类型</FormLabel>
                                <div className="flex-1" />
                                <FormMessage className="text-[14px]" />
                            </div>
                            <Select onValueChange={(e) => {
                                field.onChange(e)

                            }} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择附件类型" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="w-full flex">
                                    <SelectContent className="w-full flex">
                                        <SelectItem value="STATICFILE">
                                            <div className="w-full flex gap-2 items-center h-[25px]">
                                                <ScanBarcode />
                                                <span className="text-[12px] font-bold">静态附件</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="DYNAMICFILE" disabled>
                                            <div className="w-full flex gap-2 items-center h-[25px]">
                                                <FileCode />
                                                <span className="text-[12px] font-bold">动态附件</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="REMOTEFILE">
                                            <div className="w-full flex gap-2 items-center h-[25px]">
                                                <Cloud />
                                                <span className="text-[12px] font-bold">远程附件</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="ATTACHMENTPOOR" disabled>
                                            <div className="w-full flex gap-2 items-center h-[25px]">
                                                <TableProperties />
                                                <span className="text-[12px] font-bold">附件池(随机)</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                请选择一个类别
                            </FormDescription>
                        </FormItem>
                    )}
                />
            </div>
            {attachType == "REMOTEFILE" && (
                <FormField
                    control={control}
                    name={`attachments.${index}.attach_url`}
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center h-[20px]">
                                <FormLabel>附件下载地址</FormLabel>
                                <div className="flex-1" />
                                <FormMessage className="text-[14px]" />
                            </div>
                            <FormControl>
                                <Input {...field} value={field.value ?? ""} />
                            </FormControl>
                        </FormItem>
                    )}
                />
            )}

            {attachType == "STATICFILE" && (
                <FormField
                    control={control}
                    name={`attachments.${index}.attach_hash`}
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center h-[20px]">
                                <FormLabel>附件ID</FormLabel>
                                <div className="flex-1" />
                                <FormMessage className="text-[14px]" />
                            </div>
                            <FormControl>
                                <div className="flex gap-2 items-center">
                                    <Input {...field} value={field.value ?? ""} className="flex-1" placeholder="上传文件后自动填充" />
                                    <UploadFileDialog
                                        maxSize={500} // 设置最大文件大小为500MB
                                        onUploadSuccess={async (fileId, fileName) => {
                                            // 上传成功后自动填充文件ID和文件名
                                            form.setValue(`attachments.${index}.attach_hash`, fileId);
                                            form.setValue(`attachments.${index}.attach_name`, fileName);
                                            toast.success(`文件 "${fileName}" 上传成功`);

                                            // 自动保存表单
                                            try {
                                                await onFormSubmit();
                                                // toast.success("题目信息已自动保存");
                                            } catch (error) {
                                                toast.error("自动保存失败，请手动保存");
                                                const _ = error
                                            }
                                        }}
                                    >
                                        <Button variant="outline" className="flex-none">
                                            <Upload />
                                            上传附件
                                        </Button>
                                    </UploadFileDialog>
                                </div>
                            </FormControl>
                        </FormItem>
                    )}
                />
            )}
        </div>
    );
}

export function ChallengeManageFormWrapper({ challenge_id }: { challenge_id: number }) {
    const { data: challengeInfo = null } = useSWR<AdminChallengeConfig>(
        `/api/admin/challenge/${challenge_id}`,
        () => api.admin.getChallengeInfo(challenge_id).then((res => res.data.data))
    )

    if (!challengeInfo) {
        return <></>
    }

    return <ChallengeManageForm challengeInfo={challengeInfo} />
}

export function ChallengeManageForm({ challengeInfo }: { challengeInfo: AdminChallengeConfig }) {

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

    const formSchema = z.object({
        name: z.string().min(2, { message: "名字最短要两个字符" }),
        description: z.string(),
        create_time: z.date().optional(),
        challenge_id: z.number().optional(),
        category: z.enum(Object.keys(categories) as [string, ...string[]], {
            errorMap: () => ({ message: "需要选择一个有效的题目类别" })
        }),
        judge_config: z.object({
            judge_type: z.enum(["DYNAMIC", "SCRIPT"], {
                errorMap: () => ({ message: "需要选择一个有效的题目类别" })
            }),
            judge_script: z.string().optional(),
            flag_template: z.string().optional(),
        }),
        allow_wan: z.boolean(),
        allow_dns: z.boolean(),
        flag_type: z.enum(["FlagTypeDynamic", "FlagTypeStatic"]),
        // 新增 container_config 部分
        container_config: z.array(
            z.object({
                name: z.string().min(1, { message: "请输入容器名称" }),
                image: z.string().min(1, { message: "请输入镜像地址" }),
                command: z.array(
                    z.string()
                ).nullable(),
                env: z.string().nullable(),
                expose_ports: z.array(
                    z.object({
                        name: z.string().min(1, { message: "请输入端口名称" }),
                        port: z.coerce.number({ invalid_type_error: "请输入数字" })
                            .min(1, { message: "端口号不能小于 1" })
                            .max(65535, { message: "端口号不能大于 65535" })
                    })
                ),
                cpu_limit: z.coerce.number({ invalid_type_error: "请输入 CPU 限制" }),
                memory_limit: z.coerce.number({ invalid_type_error: "请输入内存限制" }),
                storage_limit: z.coerce.number({ invalid_type_error: "请输入存储空间限制" })
            })
        ),
        attachments: z.array(
            z.object({
                attach_hash: z.string().nullable(),
                attach_name: z.string().min(2, { message: "附件名称最少2个字符" }),
                attach_type: z.enum(["STATICFILE", "DYNAMICFILE", "REMOTEFILE", "ATTACHMENTPOOR"], {
                    errorMap: () => ({ message: "需要选择一个有效的附件类型" })
                }),
                attach_url: z.string().nullable(),
                download_hash: z.string().nullable(),
                generate_script: z.string().nullable(),
            })
        )
    });

    const env_to_string = (data: { name: string, value: string }[]) => {

        let env = ""
        data.forEach((item) => {
            env += `${item.name}=${item.value},`
        })
        return env.substring(0, env.length - 1)
    }

    const string_to_env = (data: string): { name: string, value: string }[] => {
        const env: { name: string, value: string }[] = []

        data.split(",").forEach((item) => {
            const [name, value] = item.split("=")
            env.push({ name, value })
        })

        return env
    }

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: challengeInfo?.name,
            description: challengeInfo?.description,
            category: challengeInfo?.category,
            challenge_id: 0,
            allow_wan: challengeInfo?.allow_wan,
            allow_dns: challengeInfo?.allow_dns,
            judge_config: {
                judge_type: challengeInfo?.judge_config.judge_type,
                judge_script: challengeInfo?.judge_config.judge_script || "",
                flag_template: challengeInfo?.judge_config.flag_template
            },
            flag_type: challengeInfo?.flag_type,
            container_config: challengeInfo?.container_config.map((e) => ({
                name: e.name,
                image: e.image,
                command: e.command || [],
                env: e.env ? env_to_string(e.env) : "",
                expose_ports: e.expose_ports.map((e2) => (
                    {
                        name: e2.name,
                        port: e2.port,
                    }
                )),
                cpu_limit: e.cpu_limit,
                memory_limit: e.memory_limit,
                storage_limit: e.storage_limit
            })) || [],
            attachments: challengeInfo?.attachments?.map((e) => ({
                attach_hash: e.attach_hash || "",
                attach_name: e.attach_name || "",
                attach_type: e.attach_type || "",
                download_hash: "",
                attach_url: e.attach_url || "",
                generate_script: e.generate_script || ""
            })) || []
        }
    })

    const {
        fields: containerFields,
        append: appendContainer,
        remove: removeContainer,
    } = useFieldArray({
        control: form.control,
        name: "container_config",
    });

    const {
        fields: attachmentsFields,
        append: appendAttachment,
        remove: removeAttachment,
    } = useFieldArray({
        control: form.control,
        name: "attachments",
    });

    const [_showScript, setShowScript] = useState(false);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const finalData = {
            attachments: values.attachments,
            category: values.category.toUpperCase(),
            challenge_id: challengeInfo?.challenge_id,
            allow_wan: values.allow_wan,
            allow_dns: values.allow_dns,
            container_config: values.container_config.map((e) => ({
                name: e.name,
                image: e.image,
                command: e.command,
                env: (e.env && e.env != "") ? string_to_env(e.env || "") : [],
                expose_ports: e.expose_ports,
                cpu_limit: e.cpu_limit,
                memory_limit: e.memory_limit,
                storage_limit: e.storage_limit
            })),
            create_time: challengeInfo?.create_time,
            description: values.description,
            judge_config: values.judge_config,
            name: values.name,
            flag_type: values.flag_type
        };

        api.admin.updateChallenge(challengeInfo?.challenge_id ?? 0, finalData as AdminChallengeConfig).then(() => {
            toast.success("更新成功");
        })
    }

    return (
        <Form {...form}>
            <div className="space-y-8 w-full">
                <div className="flex gap-10 items-center">
                    <div className="w-1/3">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center h-[20px]">
                                        <FormLabel>题目名称</FormLabel>
                                        <div className="flex-1" />
                                        <FormMessage className="text-[14px]" />
                                    </div>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        请填写题目名称
                                    </FormDescription>
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="w-1/3">
                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center h-[20px]">
                                        <FormLabel>题目类型</FormLabel>
                                        <div className="flex-1" />
                                        <FormMessage className="text-[14px]" />
                                    </div>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="选择一个题目类别" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="w-full flex">
                                            {Object.keys(categories).map((category) => (
                                                <SelectItem key={category} value={category}>
                                                    <div className="w-full flex gap-2 items-center h-[30px]">
                                                        {categories[category]}
                                                        <span className="text-[14px] font-bold">{category.toUpperCase()}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        请选择一个评测模式
                                    </FormDescription>
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="w-1/3">
                        <FormField
                            control={form.control}
                            name="judge_config.judge_type"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center h-[20px]">
                                        <FormLabel>评测模式</FormLabel>
                                        <div className="flex-1" />
                                        <FormMessage className="text-[14px]" />
                                    </div>
                                    <Select onValueChange={(e) => {
                                        field.onChange(e)
                                        if (e === "SCRIPT") {
                                            setShowScript(true);
                                        } else {
                                            setShowScript(false);
                                        }
                                    }} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="选择一个评测模式" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="w-full flex">
                                            <SelectItem value="DYNAMIC">
                                                <div className="w-full flex gap-2 items-center h-[25px]">
                                                    <ScanBarcode />
                                                    <span className="text-[12px] font-bold">文字匹配</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="SCRIPT" disabled>
                                                <div className="w-full flex gap-2 items-center h-[25px]">
                                                    <FileCode />
                                                    <span className="text-[12px] font-bold">脚本匹配</span>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        请选择一个类别
                                    </FormDescription>
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center h-[20px]">
                                <FormLabel>题目简介</FormLabel>
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
                            <FormDescription>
                                题目简介
                            </FormDescription>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="flag_type"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center h-[20px]">
                                <FormLabel>Flag类型</FormLabel>
                                <div className="flex-1" />
                                <FormMessage className="text-[14px]" />
                            </div>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择一个Flag类型" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="w-full flex">
                                    <SelectItem key="FlagTypeDynamic" value="FlagTypeDynamic">
                                        <div className="w-full flex gap-2 items-center h-[30px]">
                                            <span className="text-[14px] font-bold">动态Flag (强制启用Leet)</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem key="FlagTypeStatic" value="FlagTypeStatic">
                                        <div className="w-full flex gap-2 items-center h-[30px]">
                                            <span className="text-[14px] font-bold">静态Flag (无反作弊)</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                请务必正确选择 Flag 类型, 在动态 Flag 模式下平台回使用Leet为每只队伍生成不同但是看起来相似的 Flag, 请你不要使用过短的 Flag
                            </FormDescription>
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-3 gap-4 mt-4">
                    <FormField
                        control={form.control}
                        name="allow_wan"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border/50 p-4 shadow-sm bg-background/30">
                                <div className="space-y-0.5">
                                    <FormLabel>允许外网</FormLabel>
                                    <FormDescription>
                                        如果关闭, 则容器无法访问外部网络
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
                    <FormField
                        control={form.control}
                        name="allow_dns"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border/50 p-4 shadow-sm bg-background/30">
                                <div className="space-y-0.5">
                                    <FormLabel>DNS出网</FormLabel>
                                    <FormDescription>
                                        只有不出网时该选项才生效
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

                {/* 动态容器列表 */}
                <div className="mt-6">
                    <div className="flex items-center mb-4">
                        <span className="text-lg font-semibold">容器列表</span>
                        <div className="flex-1" />
                        <Button
                            type="button"
                            variant={"outline"}
                            onClick={() =>
                                appendContainer({
                                    name: "",
                                    image: "",
                                    command: null,
                                    env: null,
                                    expose_ports: [],
                                    cpu_limit: 100,
                                    memory_limit: 64,
                                    storage_limit: 128
                                })
                            }
                        >
                            <PlusCircle />
                            添加容器
                        </Button>
                    </div>
                    {containerFields.length > 0 ? containerFields.map((container, index) => (
                        <ContainerForm
                            key={container.id}
                            control={form.control}
                            index={index}
                            removeContainer={removeContainer}
                        />
                    )) : (
                        <span className="text-sm text-foreground/70">还没有容器哦</span>
                    )}
                </div>

                <div className="mt-6">
                    <div className="flex items-center mb-4">
                        <span className="text-lg font-semibold">附件列表</span>
                        <div className="flex-1" />
                        <Button
                            type="button"
                            variant={"outline"}
                            onClick={() =>
                                appendAttachment({
                                    attach_hash: null,
                                    attach_name: "",
                                    attach_type: "STATICFILE",
                                    attach_url: "",
                                    download_hash: "",
                                    generate_script: ""
                                })
                            }
                        >
                            <PlusCircle />
                            添加附件
                        </Button>
                    </div>
                    {attachmentsFields.length > 0 ? attachmentsFields.map((attachment, index) => (
                        <AttachmentForm
                            key={index}
                            control={form.control}
                            index={index}
                            form={form}
                            removeAttachment={removeAttachment}
                            onFormSubmit={async () => {
                                return new Promise<void>((resolve, reject) => {
                                    form.handleSubmit(
                                        async (values) => {
                                            try {
                                                await onSubmit(values);
                                                resolve();
                                            } catch (error) {
                                                reject(error);
                                            }
                                        },
                                        (errors) => {
                                            reject(new Error('Form validation failed'));
                                            const _ = errors
                                        }
                                    )();
                                });
                            }}
                        />
                    )) : (
                        <span className="text-sm text-foreground/70">还没有附件哦</span>
                    )}
                </div>

                <div className="flex">
                    <Button
                        variant="outline"
                        onClick={form.handleSubmit(onSubmit)}
                    >
                        <Save />
                        提交
                    </Button>
                </div>
            </div>
        </Form>
    );
}