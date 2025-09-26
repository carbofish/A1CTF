import { useState, useEffect } from "react";
import { api, createSkipGlobalErrorConfig } from "utils/ApiHelper";
import { SystemSettings, SystemSettingsPartialUpdate } from "utils/A1API"
import { Button } from "components/ui/button";
import { Atom, Bird, Cat, Image, Loader2, Mail, NotepadTextDashed, Save, Siren, UserLock } from "lucide-react";
import { toast } from 'react-toastify/unstyled';
import { MacScrollbar } from "mac-scrollbar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form } from "components/ui/form";
import { useNavigate, useParams } from "react-router";
import { AdminHeader } from "components/admin/AdminHeader";
import AboutPage from "components/admin/AboutPage";
import BasicSettings from "./BasicSettings";
import ResourceSettings from "./ResourceSettings";
import MailSettings from "./MailSettings";
import SecurityPolicySettings from "./SecurityPolicy";
import OtherSettings from "./OtherSettings";
import UserPolicySettings from "./UserPolicy";
import { useTheme } from "next-themes";
import TemplateSettings from "./TemplateSettings";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import { useGlobalVariableContext } from "contexts/GlobalVariableContext";

const systemSettingsSchema = z.object({
    systemName: z.string().optional(),
    systemLogo: z.string().optional(),
    systemSlogan: z.string().optional(),
    systemSummary: z.string().optional(),
    systemFooter: z.string().optional(),
    systemFavicon: z.string().optional(),
    systemICP: z.string().optional(),
    systemOrganization: z.string().optional(),
    systemOrganizationURL: z.string().optional(),
    // 主题设置
    themeColor: z.string().optional(),
    darkModeDefault: z.boolean().optional(),
    allowUserTheme: z.boolean().optional(),

    // 品牌资源
    fancyBackGroundIconWhite: z.string().optional(),
    fancyBackGroundIconBlack: z.string().optional(),

    // 宽度和高度
    fancyBackGroundIconWidth: z.coerce.number().optional(),
    fancyBackGroundIconHeight: z.coerce.number().optional(),

    defaultBGImage: z.string().optional(),
    svgIconLight: z.string().optional(),
    svgIconDark: z.string().optional(),
    svgAltData: z.string().optional(),
    trophysGold: z.string().optional(),
    trophysSilver: z.string().optional(),
    trophysBronze: z.string().optional(),
    schoolLogo: z.string().optional(),
    schoolSmallIcon: z.string().optional(),
    schoolUnionAuthText: z.string().optional(),
    bgAnimation: z.boolean().optional(),

    // SMTP设置
    smtpHost: z.string().optional(),
    smtpPort: z.coerce.number().int().positive().optional(),
    smtpName: z.string().optional(),
    smtpPortType: z.string().optional(),
    smtpUsername: z.string().optional(),
    smtpPassword: z.string().optional(),
    smtpFrom: z.string().optional(),
    smtpEnabled: z.boolean().optional(),

    // 邮件验证模板
    verifyEmailTemplate: z.string().optional(),
    verifyEmailHeader: z.string().optional(),

    // 找回密码模板
    forgetPasswordTemplate: z.string().optional(),
    forgetPasswordHeader: z.string().optional(),

    // 验证码
    captchaEnabled: z.boolean().optional(),

    aboutus: z.string().optional(),

    // 账户激活策略
    accountActivationMethod: z.enum(["auto", "email", "admin"]).optional(),
    registrationEnabled: z.boolean().optional(),

    // 其他系统设置
    defaultLanguage: z.string().optional(),
    timeZone: z.string().optional(),
    maxUploadSize: z.number().int().positive(),
});

export type SystemSettingsValues = z.infer<typeof systemSettingsSchema>;

export const AdminSettingsPage = () => {
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(false)
    const { action } = useParams()
    const [dataLoaded, setDataLoaded] = useState(false)
    const [activeModule, setActiveModule] = useState(action)
    const { theme } = useTheme()
    const { t } = useTranslation("system_settings")
    const { refreshClientConfig } = useGlobalVariableContext()

    useEffect(() => {
        if (!modules.filter(m => m.id == action).length) {
            navigate("/404")
            return
        }
        setActiveModule(action)
    }, [action])

    // 创建表单
    const form = useForm<SystemSettingsValues>({
        resolver: zodResolver(systemSettingsSchema),
        defaultValues: {
            systemName: "A1CTF",
            systemLogo: "",
            systemSlogan: "A Modern CTF Platform",
            systemSummary: "",
            systemICP: "",
            systemOrganization: "A1CTF",
            systemOrganizationURL: "https://github.com/carbofish/A1CTF",
            systemFooter: "© 2025 A1CTF Team",
            systemFavicon: "",
            themeColor: "blue",
            darkModeDefault: true,
            allowUserTheme: true,

            // 品牌资源
            fancyBackGroundIconWhite: "/images/ctf_white.png",
            fancyBackGroundIconBlack: "/images/ctf_black.png",
            defaultBGImage: "/images/defaultbg.jpg",
            svgIconLight: "/images/A1natas.svg",
            svgIconDark: "/images/A1natas_white.svg",
            svgAltData: "A1natas",
            trophysGold: "/images/trophys/gold_trophy.png",
            trophysSilver: "/images/trophys/silver_trophy.png",
            trophysBronze: "/images/trophys/copper_trophy.png",
            schoolLogo: "/images/A1natas.svg",
            schoolSmallIcon: "/images/A1natas.svg",
            schoolUnionAuthText: "Union Auth",
            bgAnimation: false,

            // 宽度和高度
            fancyBackGroundIconWidth: 241.2,
            fancyBackGroundIconHeight: 122.39,

            smtpHost: "",
            smtpPort: 587,
            smtpName: "",
            smtpPortType: "starttls",
            smtpUsername: "",
            smtpPassword: "",
            smtpFrom: "",
            smtpEnabled: false,

            // 邮件验证模板
            verifyEmailTemplate: "",
            verifyEmailHeader: "",
            // 找回密码模板
            forgetPasswordTemplate: "",
            forgetPasswordHeader: "",

            aboutus: "",

            captchaEnabled: false,
            accountActivationMethod: "email",
            registrationEnabled: true,
            defaultLanguage: "zh-CN",
            timeZone: "Asia/Shanghai",
            maxUploadSize: 10,
        }
    });

    // 获取系统设置
    useSWR(
        "/api/admin/system/settings",
        () => api.system.getSystemSettings(createSkipGlobalErrorConfig()).then(res => {
            res.data.data && form.reset(res.data.data)
            return res.data.data
        }).catch((_) => {
            toast.error(t("fetch_error"))
        }).finally(() => {
            setDataLoaded(true)
        })
    )

    // 保存系统设置
    const onSubmit = async (values: SystemSettingsValues) => {

        setIsLoading(true)
        try {
            await api.system.updateSystemSettings(values as SystemSettingsPartialUpdate, createSkipGlobalErrorConfig())
            await refreshClientConfig() // 获取最新的 client config
            toast.success(t("update_success"))
        } catch (err) {
            console.error(t("update_error"), err)
            toast.error(t("update_error"))
        } finally {
            setIsLoading(false)
        }
    };

    const modules = [
        {
            id: "basic",
            name: "",
            icon: <Atom className="h-4 w-4" />
        },
        {
            id: 'resource',
            name: "",
            icon: <Image className="h-4 w-4" />
        },
        {
            id: 'mail',
            name: "",
            icon: <Mail className="h-4 w-4" />
        },
        {
            id: 'template',
            name: "",
            icon: <NotepadTextDashed className="h-4 w-4" />
        },
        {
            id: 'security',
            name: "",
            icon: <Siren className="h-4 w-4" />
        },
        {
            id: 'account-policy',
            name: "",
            icon: <UserLock className="h-4 w-4" />
        },
        {
            id: 'others',
            name: "",
            icon: <Cat className="h-4 w-4" />
        },
        {
            id: "aboutus",
            name: "",
            icon: <Bird className="h-4 w-4" />
        },
    ];

    modules.forEach((module) => {
        module.name = t(`sidebar.${module.id}`)
    })

    return (
        <div className="w-screen h-screen flex flex-col">
            <AdminHeader />
            <Form {...form}>
                <div className="w-full h-full overflow-hidden gap-2 flex">
                    <div className="w-64 flex-none border-r-1 select-none h-full">
                        <div className="px-6 pt-10">
                            <h3 className="font-semibold text-lg mb-4 text-foreground/90">{t("sidebar.title")}</h3>
                            <div className="space-y-2">
                                {modules.map((module) => (
                                    <Button
                                        key={module.id}
                                        type="button"
                                        className='w-full h-10 flex justify-start gap-2 cursor-pointer'
                                        variant={activeModule === module.id ? "default" : "ghost"}
                                        onClick={() => navigate(`/admin/system/${module.id}`)}
                                    >
                                        {module.icon}
                                        <span className="font-medium">{module.name}</span>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-1 h-full overflow-hidden">
                        {activeModule == "aboutus" ? (
                            <div className="w-full h-full">
                                {dataLoaded && <AboutPage
                                    form={form}
                                    onSubmit={onSubmit}
                                />}
                            </div>
                        ) : (
                            <MacScrollbar className="w-full h-full overflow-hidden select-none"
                                skin={theme == "light" ? "light" : "dark"}
                            >
                                <div className="p-10 flex flex-col gap-4">
                                    {dataLoaded && (
                                        <>
                                            {activeModule == "basic" && (
                                                <BasicSettings
                                                    form={form}
                                                />
                                            )}

                                            {activeModule == "resource" && (
                                                <ResourceSettings
                                                    form={form}
                                                />
                                            )}

                                            {activeModule == "mail" && (
                                                <MailSettings
                                                    form={form}
                                                />
                                            )}

                                            {activeModule == "template" && (
                                                <TemplateSettings
                                                    form={form}
                                                />
                                            )}

                                            {activeModule == "security" && (
                                                <SecurityPolicySettings
                                                    form={form}
                                                />
                                            )}

                                            {activeModule == "account-policy" && (
                                                <UserPolicySettings
                                                    form={form}
                                                />
                                            )}

                                            {activeModule == "others" && (
                                                <OtherSettings
                                                    form={form}
                                                />
                                            )}

                                            <div className="w-full mt-4">
                                                <Button
                                                    type="button"
                                                    onClick={form.handleSubmit(onSubmit)}
                                                    disabled={isLoading}
                                                >
                                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save />}
                                                    {isLoading ? t("saving") : t("save")}
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </MacScrollbar>
                        )}
                    </div>
                </div>
            </Form>
        </div>
    );
};

export default AdminSettingsPage; 