import { CirclePlus, Search, Trophy } from "lucide-react";
import { MacScrollbar } from "mac-scrollbar";
import { useTheme } from "next-themes";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { UserGameSimpleInfo } from "utils/A1API";
import { api } from "utils/ApiHelper";
import { useNavigate } from "react-router";
import GameCard from "./GameCard";
import { useTranslation } from "react-i18next";
import useSWR from "swr";

export function AdminGameManagePage() {

    const { theme } = useTheme()
    const { t } = useTranslation("game_manage")
    const navigate = useNavigate()
    const [searchContent, setSearchContent] = useState("")

    // TODO 前后端适配分页
    const { data: games = [], isLoading } = useSWR<UserGameSimpleInfo[]>(
        "/admin/games/list",
        () => api.admin.listGames({ size: 1024, offset: 0 }).then(res => res.data.data)
    )

    // 过滤比赛
    const filteredGames = games.filter((game) => {
        if (searchContent === "") return true;
        return game.name.toLowerCase().includes(searchContent.toLowerCase()) ||
            (game.summary && game.summary.toLowerCase().includes(searchContent.toLowerCase()));
    })

    return (
        <div className="w-full h-full flex flex-col bg-gradient-to-br from-background to-muted/30">
            {/* Header Section */}
            <div className="backdrop-blur-sm bg-background/80 border-b p-5 lg:p-8 sticky top-0 z-10">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                <Trophy className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">{t("title")}</h1>
                                <p className="text-sm text-muted-foreground">{t("sub_title", { length: isLoading ? '?' : games.length })}</p>
                            </div>
                        </div>

                        <div className="flex-1 max-w-md">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={searchContent}
                                    onChange={(e) => setSearchContent(e.target.value)}
                                    placeholder={t("search_placeholder")}
                                    className="pl-10 bg-background/50 backdrop-blur-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => navigate(`/admin/games/create`)}
                    >
                        <CirclePlus className="h-4 w-4" />
                        {t("add_game")}
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                {filteredGames.length ? (
                    <MacScrollbar className="h-full" skin={theme == "light" ? "light" : "dark"}>
                        <div className="p-6">
                            <div className={`grid gap-6 ${filteredGames.length > 2 ? "grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3" : "grid-cols-1 lg:grid-cols-2"}`}>
                                {filteredGames.map((game, index) => (
                                    <GameCard game={game} key={index} />
                                ))}
                            </div>
                        </div>
                    </MacScrollbar>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-muted/40 to-muted/20 flex items-center justify-center mb-4">
                            {searchContent ? (
                                <Search className="h-8 w-8 text-muted-foreground" />
                            ) : (
                                <Trophy className="h-8 w-8 text-muted-foreground" />
                            )}
                        </div>
                        <h3 className="text-xl font-semibold mb-2">
                            {searchContent ? t("empty_search") : t("empty_game")}
                        </h3>
                        <p className="text-muted-foreground max-w-md">
                            {searchContent
                                ? t("search_failed", { content: searchContent })
                                : t("create_first")
                            }
                        </p>
                        {searchContent ? (
                            <Button
                                variant="ghost"
                                onClick={() => setSearchContent("")}
                                className="mt-4"
                            >
                                {t("clear_search")}
                            </Button>
                        ) : (
                            <Button
                                onClick={() => navigate(`/admin/games/create`)}
                                className="mt-4"
                            >
                                <CirclePlus className="h-4 w-4" />
                                {t("add_game")}
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}