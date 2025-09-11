import { MacScrollbar } from "mac-scrollbar";
import { Button } from "../ui/button";
import { CirclePlus, Copy, GalleryVerticalEnd, Pencil, Search, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";

import { useState } from "react";
import useSWR from "swr";
import { api } from "utils/ApiHelper";
import { AdminChallengeSimpleInfo } from "utils/A1API";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { toast } from 'react-toastify/unstyled';

import { ConfirmDialog, DialogOption } from "../dialogs/ConfirmDialog";
import { challengeCategoryColorMap, challengeCategoryIcons } from "utils/ClientAssets";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { copyWithResult } from "utils/ToastUtil";

export function ChallengesManageView() {

    const { t } = useTranslation("challenge_manage")
    const { theme } = useTheme()
    const router = useNavigate()

    const colorMap: { [key: string]: string } = challengeCategoryColorMap

    const cateIcon: { [key: string]: any } = challengeCategoryIcons

    const [curChoicedCategory, setCurChoicedCategory] = useState("all")

    const { data: challenges = [], mutate } = useSWR<AdminChallengeSimpleInfo[]>(
        '/admin/challenges',
        () => api.admin.listChallenge({ size: 1024, offset: 0 }).then(res => res.data.data)
    )

    const [searchContent, setSearchContent] = useState("")
    const [dialogOption, setDialogOption] = useState<DialogOption>({
        isOpen: false,
        message: ""
    })

    const filtedData = challenges.filter((chl) => {
        if (searchContent == "") return curChoicedCategory == "all" || chl.category?.toLowerCase() == curChoicedCategory;
        else return chl.name.toLowerCase().includes(searchContent.toLowerCase()) && (curChoicedCategory == "all" || chl.category?.toLowerCase() == curChoicedCategory)
    })

    return (
        <div className="w-full h-full flex flex-col bg-gradient-to-br from-background to-muted/30">
            <ConfirmDialog settings={dialogOption} setSettings={setDialogOption} />

            {/* Header Section */}
            <div className="backdrop-blur-sm bg-background/80 border-b p-5 lg:p-8 sticky top-0 z-10">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                <GalleryVerticalEnd className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
                                <p className="text-sm text-muted-foreground">{t("dashboard.description", { count: challenges.length })}</p>
                            </div>
                        </div>

                        <div className="flex-1 max-w-md">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={searchContent}
                                    onChange={(e) => setSearchContent(e.target.value)}
                                    placeholder={t("dashboard.placeholder")}
                                    className="pl-10 bg-background/50 backdrop-blur-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={() => router(`/admin/challenges/create`)}
                        variant="outline"
                    >
                        <CirclePlus className="h-4 w-4" />
                        {t("dashboard.add")}
                    </Button>
                </div>
            </div>
            <div className="flex-1 flex overflow-hidden">
                {/* Categories Sidebar */}
                <div className="flex-none overflow-hidden">
                    <MacScrollbar className="h-full" skin={theme == "light" ? "light" : "dark"}
                    >
                        <div className="w-56 flex-none bg-card/50 backdrop-blur-sm border-r p-4">
                            <div className="sticky top-0">
                                <h3 className="font-semibold text-lg mb-4 text-foreground/90 text-center">{t("dashboard.filter")}</h3>
                                <div className="space-y-1">
                                    {Object.keys(cateIcon).map((cat, index) => (
                                        <Button
                                            key={index}
                                            className={`w-full justify-start gap-3 h-11 transition-all duration-200 border ${curChoicedCategory === cat
                                                ? "bg-gradient-to-r from-primary/20 to-primary/10 border-primary/30 text-primary shadow-sm"
                                                : "hover:bg-muted/60 hover:shadow-sm border-transparent"
                                                }`}
                                            variant="ghost"
                                            onClick={() => setCurChoicedCategory(cat)}
                                        >
                                            <div className={`p-1.5 rounded-lg flex-shrink-0 ${curChoicedCategory === cat ? "bg-primary/20" : "bg-muted/40"}`}>
                                                {cateIcon[cat]}
                                            </div>
                                            <span className="font-medium flex-1 text-left truncate">
                                                {cat === "all" ? t("dashboard.all") : cat.substring(0, 1).toUpperCase() + cat.substring(1)}
                                            </span>
                                            <Badge
                                                variant="secondary"
                                                className={`h-6 px-2 text-xs font-semibold flex-shrink-0 ${curChoicedCategory === cat ? "bg-primary/20 text-primary" : ""
                                                    }`}
                                            >
                                                {challenges.filter((res) => (cat == "all" || res.category?.toLowerCase() == cat)).length}
                                            </Badge>
                                        </Button>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </MacScrollbar>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-hidden">
                    {filtedData.length ? (
                        <MacScrollbar className="h-full"
                            skin={theme == "light" ? "light" : "dark"}
                        >
                            <div className="p-6">
                                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                                    {filtedData.map((chal, index) => (
                                        <div
                                            key={index}
                                            className="group bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-300 hover:scale-[1.02] hover:bg-card/80"
                                        >
                                            {/* Challenge Header */}
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colorMap[chal.category?.toLowerCase() || "misc"] || "from-muted/40 to-muted/20"} flex-shrink-0`}>
                                                        {cateIcon[chal.category?.toLowerCase() || "misc"]}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-200">
                                                            {chal.name}
                                                        </h3>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge
                                                                variant="outline"
                                                                className="text-xs font-medium border-muted-foreground/30"
                                                            >
                                                                {chal.category?.toUpperCase() || "MISC"}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Challenge Actions */}
                                            <div className="flex items-center justify-end gap-1 pt-3 border-t border-border/30">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                                                    onClick={() => { copyWithResult(chal?.name || "") }}
                                                    data-tooltip-content={t("dashboard.copy")}
                                                    data-tooltip-id="my-tooltip"
                                                    data-tooltip-place="bottom"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 hover:bg-blue-500/10 hover:text-blue-600 transition-all duration-200"
                                                    onClick={() => router(`/admin/challenges/${chal.challenge_id}`)}
                                                    data-tooltip-content={t("dashboard.edit")}
                                                    data-tooltip-id="my-tooltip"
                                                    data-tooltip-place="bottom"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                                                    onClick={() => {
                                                        setDialogOption((prev) => ({
                                                            ...prev,
                                                            isOpen: true,
                                                            title: t("dashboard.delete.title"),
                                                            message: t("dashboard.delete.message", { name: chal.name }),
                                                            onConfirm: () => {
                                                                api.admin.deleteChallenge(chal.challenge_id).then(() => {
                                                                    toast.success(t("dashboard.delete.success", { name: chal.name }))
                                                                    mutate() // 使用 mutate 重新获取数据
                                                                })
                                                            },
                                                        }))
                                                    }}
                                                    data-tooltip-content={t("dashboard.delete.title")}
                                                    data-tooltip-id="my-tooltip"
                                                    data-tooltip-place="bottom"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </MacScrollbar>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-muted/40 to-muted/20 flex items-center justify-center mb-4">
                                <Search className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">{t("dashboard.empty.title")}</h3>
                            <p className="text-muted-foreground max-w-md">
                                {searchContent ? t("dashboard.empty.search", { content: searchContent }) : t("dashboard.empty.category")}
                            </p>
                            {searchContent && (
                                <Button
                                    variant="ghost"
                                    onClick={() => setSearchContent("")}
                                    className="mt-4"
                                >
                                    {t("dashboard.clear")}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}