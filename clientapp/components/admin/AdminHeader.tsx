import { Cable, ContactRound, Dices, Flag, Home, Settings } from "lucide-react";
import { Button } from "../ui/button";
import { useLocation, useNavigate } from "react-router";
import ThemeSwitcher from "components/ToggleTheme";
import { useTranslation } from "react-i18next";
import { useGlobalVariableContext } from "contexts/GlobalVariableContext";

export function AdminHeader() {

    const path = useLocation().pathname;
    const navigate = useNavigate()

    const { clientConfig } = useGlobalVariableContext()
    const { t } = useTranslation("admin")

    const get_button_style = function (regex: string) {
        return path.match(regex) ? "default" : "ghost";
    }

    const move_to_page = function (name: string) {
        if (path != name) navigate(`/admin/${name}`)
    }

    return (
        <header className="h-14 backdrop-blur-sm select-none flex-shrink-0">
            <div className="w-full h-full flex items-center px-4 border-b-[1px] gap-2">
                <div className="flex gap-2 items-center mr-4"
                    onClick={() => move_to_page("")}
                >
                    <img
                        src={clientConfig?.SVGIconLight ?? "/images/A1natas.svg"}
                        alt={clientConfig?.systemName ?? "A1CTF"}
                        width={32}
                        height={32}
                        className="dark:invert"
                    />
                    <span className="text-lg font-bold">{clientConfig?.systemName ?? "A1CTF"} {t("title")}</span>
                </div>
                <Button variant={get_button_style("^/admin/games.*")} onClick={() => move_to_page("games")} className="font-bold"><Flag />{t("games")}</Button>
                <Button variant={get_button_style("^/admin/challenges.*")} onClick={() => move_to_page("challenges")} className="font-bold"><Dices />{t("challenges")}</Button>
                <Button variant={get_button_style("^/admin/users.*")} onClick={() => move_to_page("users")} className="font-bold"><ContactRound />{t("users")}</Button>
                <Button variant={get_button_style("^/admin/logs.*")} onClick={() => move_to_page("logs")} className="font-bold"><Cable />{t("logs")}</Button>
                <div className="flex-1" />
                <Button variant={get_button_style("^/admin/system/.*")} onClick={() => move_to_page("system/basic")} className="font-bold"><Settings />{t("system")}</Button>
                <Button variant={get_button_style("^/$")} onClick={() => navigate("/")} className="font-bold"><Home />{t("home")}</Button>
                <ThemeSwitcher />
            </div>
        </header>
    )
}