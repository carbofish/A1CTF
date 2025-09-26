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

import { Input } from "../ui/input";
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "../ui/button";

import { Bitcoin, CircleArrowLeft, Cloud, FileCode, Github, PlusCircle, Save, ScanBarcode, ShieldCheck, TableProperties, Trash2, Upload } from "lucide-react"

import CodeEditor from '@uiw/react-textarea-code-editor';

import { Binary, Bot, Bug, FileSearch, GlobeLock, HardDrive, MessageSquareLock, Radar, Smartphone, SquareCode } from "lucide-react"
import { useState } from "react";
import { MacScrollbar } from "mac-scrollbar";
import { AdminChallengeConfig } from "utils/A1API";
import { api } from "utils/ApiHelper";
import { toast } from 'react-toastify/unstyled';
import { useNavigate } from "react-router";
import { UploadFileDialog } from "components/dialogs/UploadFileDialog";
import { Switch } from "components/ui/switch";
import { useTheme } from "next-themes";
import LazyThemedEditor from "components/modules/LazyThemedEditor";
import { useTranslation, Trans } from "react-i18next";

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

    const { t } = useTranslation("challenge_edit")

    return (
        <div className="border p-6 mb-4 rounded-lg hover:shadow-lg transition-shadow duration-300 gap-4 flex flex-col">
            <div className="flex justify-between items-center mb-2">
                <span className="font-md font-semibold">{t("container.label")} [{index + 1}]</span>
                <Button variant="destructive" type="button" onClick={() => removeContainer(index)}>
                    {t("container.delete")}
                </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={control}
                    name={`container_config.${index}.name`}
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center h-[20px]">
                                <FormLabel>{t("container.name")}</FormLabel>
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
                                <FormLabel>{t("container.image")}</FormLabel>
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
                            <FormLabel>{t("container.env.label")}</FormLabel>
                            <div className="flex-1" />
                            <FormMessage className="text-[14px]" />
                        </div>
                        <FormControl>
                            <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormDescription>
                            <Trans
                                ns='challenge_edit'
                                i18nKey="container.env.description"
                                components={{ a: <a className="hover:underline hover:cursor-pointer underline-offset-2 text-red-400" /> }}
                            />
                        </FormDescription>
                    </FormItem>
                )}
            />
            <div className="flex flex-col gap-2">
                <div className="flex items-center h-[20px] mb-4">
                    <FormLabel>{t("container.cmd.label")}</FormLabel>
                    <div className="flex-1" />
                    <Button
                        variant="outline"
                        onClick={() => appendCommand("")}
                    ><PlusCircle />{t("container.cmd.add")}</Button>
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
                    {t("container.cmd.description")}
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
                                <FormLabel>{t("container.limit.cpu.label")}</FormLabel>
                                <div className="flex-1" />
                                <FormMessage className="text-[14px]" />
                            </div>
                            <FormControl>
                                <Input {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormDescription>
                                {t("container.limit.cpu.description")}
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
                                <FormLabel>{t("container.limit.cpu.label")}</FormLabel>
                                <div className="flex-1" />
                                <FormMessage className="text-[14px]" />
                            </div>
                            <FormControl>
                                <Input {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormDescription>
                                {t("container.limit.mem.description")}
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
                                <FormLabel>{t("container.limit.store.label")}</FormLabel>
                                <div className="flex-1" />
                                <FormMessage className="text-[14px]" />
                            </div>
                            <FormControl>
                                <Input {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormDescription>
                                {t("container.limit.store.description")}
                            </FormDescription>
                        </FormItem>
                    )}
                />
            </div>
            <div className="mt-4">
                <div className="flex items-center mb-3">
                    <span className="text-md font-semibold">{t("container.port.label")}</span>
                    <div className="flex-1" />
                    <Button
                        type="button"
                        variant={"outline"}
                        className="[&_svg]:size-5"
                        onClick={() => appendPort({ name: "", port: 0 })}
                    >
                        <PlusCircle />
                        {t("container.port.add")}
                    </Button>
                </div>
                <span className="text-sm text-foreground/50">{t("container.port.description")}</span>
                <div className="h-4" />
                {portFields.map((port, portIndex) => (
                    <div key={port.id} className="flex gap-2 items-end mb-2">
                        <FormField
                            control={control}
                            name={`container_config.${index}.expose_ports.${portIndex}.name`}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <div className="flex items-center w- h-[20px]">
                                        <FormLabel>{t("container.port.name")}</FormLabel>
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
                                        <FormLabel>{t("container.port.num")}</FormLabel>
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
                            {t("container.port.delete")}
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

    const { t } = useTranslation("challenge_edit")

    return (
        <div className="border p-6 mb-4 rounded-lg hover:shadow-lg transition-shadow duration-300">
            <div className="flex justify-between items-center mb-2">
                <span className="font-md font-semibold">{t("attachment.label")} [{index + 1}]</span>
                <Button variant="destructive" type="button" onClick={() => removeAttachment(index)}>
                    {t("attachment.delete")}
                </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={control}
                    name={`attachments.${index}.attach_name`}
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center h-[20px]">
                                <FormLabel>{t("attachment.name")}</FormLabel>
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
                                <FormLabel>{t("attachment.type.label")}</FormLabel>
                                <div className="flex-1" />
                                <FormMessage className="text-[14px]" />
                            </div>
                            <Select onValueChange={(e) => {
                                field.onChange(e)

                            }} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("attachment.type.select")} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="w-full flex">
                                    <SelectContent className="w-full flex">
                                        <SelectItem value="STATICFILE">
                                            <div className="w-full flex gap-2 items-center h-[25px]">
                                                <ScanBarcode />
                                                <span className="text-[12px] font-bold">{t("attachment.type.static")}</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="DYNAMICFILE" disabled>
                                            <div className="w-full flex gap-2 items-center h-[25px]">
                                                <FileCode />
                                                <span className="text-[12px] font-bold">{t("attachment.type.dynamic")}</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="REMOTEFILE">
                                            <div className="w-full flex gap-2 items-center h-[25px]">
                                                <Cloud />
                                                <span className="text-[12px] font-bold">{t("attachment.type.remote")}</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="ATTACHMENTPOOR" disabled>
                                            <div className="w-full flex gap-2 items-center h-[25px]">
                                                <TableProperties />
                                                <span className="text-[12px] font-bold">{t("attachment.type.pool")}</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                {t("attachment.type.select")}
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
                                <FormLabel>{t("attachment.url")}</FormLabel>
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
                <div className="grid grid-cols-8 gap-4 items-end">
                    <div className="col-span-7">
                        <FormField
                            control={control}
                            name={`attachments.${index}.attach_hash`}
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center h-[20px]">
                                        <FormLabel>{t("attachment.id")}</FormLabel>
                                        <div className="flex-1" />
                                        <FormMessage className="text-[14px]" />
                                    </div>
                                    <FormControl>
                                        <Input {...field} value={field.value ?? ""} placeholder={t("attachment.placeholder")} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
                    <UploadFileDialog
                        maxSize={500} // 设置最大文件大小为500MB
                        onUploadSuccess={async (fileId, fileName) => {
                            // 上传成功后自动填充文件ID和文件名
                            form.setValue(`attachments.${index}.attach_hash`, fileId);
                            form.setValue(`attachments.${index}.attach_name`, fileName);
                            toast.success(t("attachment.upload.success", { name: fileName }));

                            // 自动保存表单
                            try {
                                await onFormSubmit();
                                // toast.success("题目信息已自动保存");
                            } catch (error) {
                                toast.error(t("attachment.upload.failed"));
                                const _ = error;
                            }
                        }}
                    >
                        <Button type="button" className="[&_svg]:size-4">
                            <Upload />
                            {t("attachment.upload.label")}
                        </Button>
                    </UploadFileDialog>
                </div>
            )}
        </div>
    );
}

export function EditChallengeView({ challenge_info, isCreate = false }: { challenge_info: AdminChallengeConfig, isCreate?: boolean }) {

    const { t } = useTranslation("challenge_edit")

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
        name: z.string().min(2, { message: t("form.name.error") }),
        description: z.string(),
        create_time: z.date().optional(),
        challenge_id: z.number().optional(),
        category: z.enum(Object.keys(categories) as [string, ...string[]], {
            errorMap: () => ({ message: t("form.category.error") })
        }),
        judge_config: z.object({
            judge_type: z.enum(["DYNAMIC", "SCRIPT"], {
                errorMap: () => ({ message: t("form.judge.error") })
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
                name: z.string().min(1, { message: t("container.error.name") }),
                image: z.string().min(1, { message: t("container.error.image") }),
                command: z.array(z.string()).nullable(),
                env: z.string().nullable(),
                expose_ports: z.array(
                    z.object({
                        name: z.string().min(1, { message: t("container.error.port.name") }),
                        port: z.coerce.number({ invalid_type_error: t("container.error.port.num") })
                            .min(1, { message: t("container.error.port.min") })
                            .max(65535, { message: t("container.error.port.max") })
                    })
                ),
                cpu_limit: z.coerce.number({ invalid_type_error: t("container.error.cpu") }),
                memory_limit: z.coerce.number({ invalid_type_error: t("container.error.mem") }),
                storage_limit: z.coerce.number({ invalid_type_error: t("container.error.store") })
            })
        ),
        attachments: z.array(
            z.object({
                attach_hash: z.string().nullable(),
                attach_name: z.string().min(2, { message: t("attachment.error.name") }),
                attach_type: z.enum(["STATICFILE", "DYNAMICFILE", "REMOTEFILE", "ATTACHMENTPOOR"], {
                    errorMap: () => ({ message: t("attachment.error.type") })
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
            name: challenge_info.name,
            description: challenge_info.description,
            category: challenge_info.category,
            challenge_id: 0,
            allow_wan: challenge_info.allow_wan,
            allow_dns: challenge_info.allow_dns,
            judge_config: {
                judge_type: challenge_info.judge_config.judge_type,
                judge_script: challenge_info.judge_config.judge_script || "",
                flag_template: challenge_info.judge_config.flag_template
            },
            flag_type: challenge_info.flag_type,
            container_config: challenge_info.container_config.map((e) => ({
                name: e.name,
                image: e.image,
                command: e.command ?? [],
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
            attachments: challenge_info.attachments?.map((e) => ({
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

    const [showScript, setShowScript] = useState(false);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const finalData = {
            attachments: values.attachments,
            category: values.category.toUpperCase(),
            challenge_id: challenge_info.challenge_id,
            allow_wan: values.allow_wan,
            allow_dns: values.allow_dns,
            container_config: values.container_config.map((e) => ({
                name: e.name,
                image: e.image,
                command: e.command ? e.command : [],
                env: (e.env && e.env != "") ? string_to_env(e.env || "") : [],
                expose_ports: e.expose_ports,
                cpu_limit: e.cpu_limit,
                memory_limit: e.memory_limit,
                storage_limit: e.storage_limit
            })),
            create_time: challenge_info.create_time,
            description: values.description,
            judge_config: values.judge_config,
            name: values.name,
            flag_type: values.flag_type
        };

        if (isCreate) {
            api.admin.createChallenge(finalData as AdminChallengeConfig).then(() => {
                toast.success(t("success.create"))
            })
        } else {
            api.admin.updateChallenge(challenge_info.challenge_id!, finalData as AdminChallengeConfig).then(() => {
                toast.success(t("success.update"));
            })
        }
    }

    const router = useNavigate()
    const { theme } = useTheme()

    return (
        <div className="absolute w-screen h-screen bg-background items-center justify-center flex select-none overflow-x-hidden overflow-hidden">
            <Form {...form}>
                <MacScrollbar className="h-full w-full flex flex-col items-center"
                    skin={theme == "light" ? "light" : "dark"}
                >
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-20 pt-20 w-[80%] flex flex-col">
                        <div className="flex ml-auto">
                            <Button type="button" variant={"default"} onClick={() => {
                                router(`/admin/challenges`)
                            }}>
                                <CircleArrowLeft />
                                {t("back")}
                            </Button>
                        </div>
                        <span className="text-3xl font-bold">{isCreate ? t("title.create") : `${t("title.update")} - ${challenge_info.name}`}</span>
                        <span className="text-lg font-semibold">基本信息</span>
                        <div className="flex gap-10 items-center">
                            <div className="w-1/3">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center h-[20px]">
                                                <FormLabel>{t("form.name.label")}</FormLabel>
                                                <div className="flex-1" />
                                                <FormMessage className="text-[14px]" />
                                            </div>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                {t("form.name.description")}
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
                                                <FormLabel>{t("form.category.label")}</FormLabel>
                                                <div className="flex-1" />
                                                <FormMessage className="text-[14px]" />
                                            </div>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t("form.category.description")} />
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
                                                {t("form.category.description")}
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
                                                <FormLabel>{t("form.judge.label")}</FormLabel>
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
                                                        <SelectValue placeholder={t("form.judge.description")} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="w-full flex">
                                                    <SelectItem value="DYNAMIC">
                                                        <div className="w-full flex gap-2 items-center h-[25px]">
                                                            <ScanBarcode />
                                                            <span className="text-[12px] font-bold">{t("form.judge.text")}</span>
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="SCRIPT" disabled>
                                                        <div className="w-full flex gap-2 items-center h-[25px]">
                                                            <FileCode />
                                                            <span className="text-[12px] font-bold">{t("form.judge.script.name")}</span>
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                {t("form.judge.description")}
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
                                        <FormLabel>{t("form.description.label")}</FormLabel>
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
                                        {t("form.description.description")}
                                    </FormDescription>
                                </FormItem>
                            )}
                        />
                        {showScript ? (
                            <FormField
                                control={form.control}
                                name="judge_config.judge_script"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center h-[20px]">
                                            <FormLabel>{t("form.judge.script.label")}</FormLabel>
                                            <div className="flex-1" />
                                            <FormMessage className="text-[14px]" />
                                        </div>
                                        <FormControl>
                                            <CodeEditor
                                                value={field.value}
                                                language="js"
                                                placeholder={t("form.judge.script.placeholder")}
                                                onChange={(evn) => field.onChange(evn.target.value)}
                                                padding={15}
                                                style={{
                                                    // backgroundColor: "#f5f5f5",
                                                    minHeight: 200,
                                                    borderRadius: 5,
                                                    // fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
                                                }}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            {t("form.judge.script.description")}
                                        </FormDescription>
                                    </FormItem>
                                )}
                            />
                        ) : (
                            <>
                                <FormField
                                    control={form.control}
                                    name="flag_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center h-[20px]">
                                                <FormLabel>{t("form.flag.label")}</FormLabel>
                                                <div className="flex-1" />
                                                <FormMessage className="text-[14px]" />
                                            </div>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t("form.flag.placeholder")} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="w-full flex">
                                                    <SelectItem key="FlagTypeDynamic" value="FlagTypeDynamic">
                                                        <div className="w-full flex gap-2 items-center h-[30px]">
                                                            <span className="text-[14px] font-bold">{t("form.flag.dynamic")}</span>
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem key="FlagTypeStatic" value="FlagTypeStatic">
                                                        <div className="w-full flex gap-2 items-center h-[30px]">
                                                            <span className="text-[14px] font-bold">{t("form.flag.static")}</span>
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                {t("form.flag.description")}
                                            </FormDescription>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="judge_config.flag_template"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center h-[20px]">
                                                <FormLabel>Flag</FormLabel>
                                                <div className="flex-1" />
                                                <FormMessage className="text-[14px]" />
                                            </div>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <div className="flex flex-col text-[12px] text-foreground/60">
                                                <Trans
                                                    ns='challenge_edit'
                                                    i18nKey="form.flag.info"
                                                    components={{
                                                        span: <span />,
                                                        br: <br />
                                                    }}
                                                />
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

                        {/* 动态容器列表 */}
                        <div className="mt-6">
                            <div className="flex items-center mb-4">
                                <span className="text-lg font-semibold">{t("container.list")}</span>
                                <div className="flex-1" />
                                <Button
                                    type="button"
                                    variant={"outline"}
                                    className="[&_svg]:size-5"
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
                                    {t("container.add")}
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
                                <span className="text-sm text-foreground/70">{t("container.empty")}</span>
                            )}
                        </div>

                        {containerFields.length > 0 && <div className="grid grid-cols-3 gap-4 mt-4">
                            <FormField
                                control={form.control}
                                name="allow_wan"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border/50 p-4 shadow-sm bg-background/30">
                                        <div className="space-y-0.5">
                                            <FormLabel>{t("container.wan.label")}</FormLabel>
                                            <FormDescription>
                                                {t("container.wan.description")}
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
                                            <FormLabel>{t("container.dns.label")}</FormLabel>
                                            <FormDescription>
                                                {t("container.dns.description")}
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
                        </div>}

                        <div className="mt-6">
                            <div className="flex items-center mb-4">
                                <span className="text-lg font-semibold">{t("attachment.list")}</span>
                                <div className="flex-1" />
                                <Button
                                    type="button"
                                    variant={"outline"}
                                    className="[&_svg]:size-5"
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
                                    {t("attachment.add")}
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
                                <span className="text-sm text-foreground/70">{t("attachment.empty")}</span>
                            )}
                        </div>

                        <div className="flex">
                            <Button type="submit">
                                <Save />
                                {isCreate ? t("title.create") : t("title.update")}
                            </Button>
                        </div>
                    </form>
                </MacScrollbar>
            </Form>
        </div>
    );
}