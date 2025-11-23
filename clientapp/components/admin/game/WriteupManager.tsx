import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { AdminTeamWriteupInfo } from "utils/A1API";
import { api } from "utils/ApiHelper";
import { Button } from "components/ui/button";
import { Download, Loader2, FileText, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

interface WriteupManagerProps {
    gameID: number
}

export const WriteupManager: React.FC<WriteupManagerProps> = ({ gameID }) => {
    const { t } = useTranslation("game_manage")
    const [writeups, setWriteups] = useState<AdminTeamWriteupInfo[]>([])
    const [selected, setSelected] = useState<AdminTeamWriteupInfo | null>(null)
    const [loading, setLoading] = useState(false)

    const loadWriteups = useCallback(() => {
        setLoading(true)
        api.instance.get<{
            code: number
            data: AdminTeamWriteupInfo[]
        }>(`/api/admin/writeups/${gameID}`)
            .then((res) => {
                console.log('[DEBUG] WriteupManager raw response:', res)
                console.log('[DEBUG] WriteupManager res.data:', res?.data)
                console.log('[DEBUG] WriteupManager res.data.data:', res?.data?.data)
                
                const raw = res?.data?.data ?? res?.data ?? []
                console.log('[DEBUG] WriteupManager raw:', raw)
                
                const items = Array.isArray(raw)
                    ? raw
                    : Array.isArray(raw?.data)
                        ? raw.data
                        : []
                console.log('[DEBUG] WriteupManager items:', items)
                
                setWriteups(items)
                setSelected(items[0] ?? null)
            })
            .catch((err) => {
                console.error('[ERROR] WriteupManager fetch failed:', err)
            })
            .finally(() => setLoading(false))
    }, [gameID])

    useEffect(() => {
        loadWriteups()
    }, [loadWriteups])

    const selectedInfo = useMemo(() => {
        if (!selected) return null
        const submittedAt = dayjs(selected.submitted_at).format("YYYY-MM-DD HH:mm")
        const sizeInMb = (selected.file_size / (1024 * 1024)).toFixed(2)
        return {
            ...selected,
            submittedAt,
            sizeInMb
        }
    }, [selected])

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">{t("writeups_title")}</h2>
                        <p className="text-sm text-muted-foreground">{t("writeups_description")}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={loadWriteups}>
                        <Loader2 className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        {t("writeups_refresh")}
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => window.open(`/api/admin/writeups/${gameID}/all`, "_blank")}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        {t("writeups_download_all")}
                    </Button>
                </div>
            </div>
            {loading ? (
                <div className="flex h-[60vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : writeups.length === 0 ? (
                <div className="flex h-[60vh] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 text-muted-foreground">
                    <FileText className="h-10 w-10" />
                    <p>{t("writeups_empty")}</p>
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
                    <div className="w-full space-y-3 lg:max-h-[85vh] lg:overflow-auto lg:pr-1">
                        {writeups.map((writeup) => (
                            <button
                                type="button"
                                key={writeup.writeup_id}
                                onClick={() => setSelected(writeup)}
                                className={`w-full rounded-2xl border p-4 text-left transition ${
                                    selected?.writeup_id === writeup.writeup_id
                                        ? "border-primary bg-primary/5"
                                        : "border-border/60 hover:border-border"
                                }`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold">{writeup.display_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            #{writeup.team_id} · {writeup.team_name}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="flex min-h-[85vh] flex-1 rounded-2xl border border-border/60 bg-muted/10 p-4">
                        {selectedInfo ? (
                            <div className="flex w-full flex-1 flex-col">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <p className="text-lg font-semibold">{selectedInfo.display_name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            #{selectedInfo.team_id} · {selectedInfo.team_name} · {selectedInfo.sizeInMb} MB
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {t("writeups_submitted_at", { time: selectedInfo.submittedAt })}
                                        </p>
                                    </div>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => window.open(selectedInfo.url, "_blank")}
                                    >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        {t("writeups_view")}
                                    </Button>
                                </div>
                                <div className="mt-4 flex-1 rounded-xl border border-border/40 bg-background">
                                    <iframe
                                        src={selectedInfo.url}
                                        className="h-full min-h-[80vh] w-full rounded-xl"
                                        title={selectedInfo.display_name}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex h-full min-h-[80vh] w-full items-center justify-center text-muted-foreground">
                                {t("writeups_preview_placeholder")}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
