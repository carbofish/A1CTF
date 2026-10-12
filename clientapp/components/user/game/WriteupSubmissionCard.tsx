import React, { useCallback, useEffect, useRef, useState } from "react"
import { Eye, Loader2, UploadCloud } from "lucide-react"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "components/ui/dialog"

import { toast } from 'react-toastify/unstyled';
import { TeamWriteupInfo } from "utils/A1API";
import { api } from "utils/ApiHelper";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";

interface WriteupSubmissionCardProps {
    gameID: number
    initialRequire?: boolean
    initialDeadline?: string
    initialStart?: string
    initialFormats?: string[]
    initialMaxSize?: number
}

const DEFAULT_WRITEUP_MAX_SIZE_MB = 50

export const WriteupSubmissionCard: React.FC<WriteupSubmissionCardProps> = ({ gameID, initialRequire, initialDeadline, initialStart, initialFormats, initialMaxSize }) => {
    const { t } = useTranslation("game_view")
    const [writeup, setWriteup] = useState<TeamWriteupInfo | null>(null)
    const [requireWriteup, setRequireWriteup] = useState<boolean>(initialRequire ?? false)
    const [deadline, setDeadline] = useState<string | undefined>(initialDeadline)
    const [startTime, setStartTime] = useState<string | undefined>(initialStart)
    const [formats, setFormats] = useState<string[]>(initialFormats ?? [])
    const [maxSizeMB, setMaxSizeMB] = useState<number>(initialMaxSize ?? DEFAULT_WRITEUP_MAX_SIZE_MB)
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [fetched, setFetched] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setRequireWriteup(initialRequire ?? false)
        setDeadline(initialDeadline)
        setStartTime(initialStart)
        setFormats(initialFormats ?? [])
        setMaxSizeMB(initialMaxSize ?? DEFAULT_WRITEUP_MAX_SIZE_MB)
    }, [initialRequire, initialDeadline, initialStart, initialFormats, initialMaxSize])

    const loadWriteupInfo = useCallback(() => {
        setLoading(true)
        api.user.userGetGameWriteup(gameID).then((res) => {
            const payload = res.data?.data as {
                writeup?: TeamWriteupInfo | null
                require_wp: boolean
                wp_expire_time: string
                wp_start_time?: string
                wp_formats?: string[]
                wp_max_size?: number
            }
            if (!payload) return
            setWriteup(payload.writeup ?? null)
            setRequireWriteup(payload.require_wp)
            setDeadline(payload.wp_expire_time)
            setStartTime(payload.wp_start_time)
            setFormats(payload.wp_formats ?? [])
            setMaxSizeMB(payload.wp_max_size ?? DEFAULT_WRITEUP_MAX_SIZE_MB)
            setFetched(true)
        }).finally(() => setLoading(false))
    }, [gameID])

    useEffect(() => {
        loadWriteupInfo()
    }, [loadWriteupInfo])

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        // 上传前先本地校验体积，避免白传一遍
        if (file.size > maxSizeMB * 1024 * 1024) {
            toast.error(t("writeup_card.file_too_large", { size: maxSizeMB }))
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
            return
        }

        setUploading(true)
        api.user.userUploadGameWriteupFile(gameID, { file }).then((response) => {
            const fileId = response.data?.file_id
            if (!fileId) {
                throw new Error("invalid_file_id")
            }
            return api.user.userSubmitGameWriteup(gameID, { file_id: fileId })
        }).then(() => {
            toast.success(t("writeup_card.submit_success"))
            loadWriteupInfo()
        }).catch(() => {
            // handled globally
        }).finally(() => {
            setUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        })
    }

    const formattedDeadline = deadline ? dayjs(deadline).format("YYYY-MM-DD HH:mm") : undefined
    const startMoment = startTime ? dayjs(startTime) : undefined
    const formattedStart = startMoment ? startMoment.format("YYYY-MM-DD HH:mm") : undefined
    const startReady = !startMoment || dayjs().isAfter(startMoment)
    // WriteUp 截止时间独立于比赛结束时间
    const deadlinePassed = !!deadline && dayjs().isAfter(dayjs(deadline))
    const allowedFormatsDisplay = (formats?.length ? formats.join("/").toUpperCase() : "PDF/ZIP/DOC/DOCX/MD/TXT")
    const uploadAccept = (formats?.length
        ? formats.map((fmt) => `.${fmt.toLowerCase()}`).join(",")
        : ".pdf,.zip,.md,.doc,.docx,.txt")

    if (!requireWriteup && fetched && !loading) {
        return null
    }

    return (
        <div className="rounded-2xl border border-border/50 bg-background/60 p-4 shadow-sm shadow-black/5">
            <div className="flex items-center justify-between gap-3">
                <p className="text-base font-semibold text-foreground">{t("writeup_card.title")}</p>
                {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
                {formattedDeadline ? t("writeup_card.deadline", { time: formattedDeadline }) : t("writeup_card.deadline_unknown")}
            </p>
            {startMoment && !startReady ? (
                <p className="mt-2 text-xs text-amber-600">
                    {t("writeup_card.start_not_ready", { time: formattedStart })}
                </p>
            ) : null}
            {deadlinePassed ? (
                <p className="mt-2 text-xs text-amber-600">
                    {t("writeup_card.deadline_passed")}
                </p>
            ) : null}
            {writeup ? (
                <div className="mt-3 rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between gap-3">
                        <span>{t("writeup_card.last_submitted", { time: dayjs(writeup.submitted_at).format("YYYY-MM-DD HH:mm") })}</span>
                        <button
                            className="flex items-center gap-1 text-primary hover:text-primary/80"
                            onClick={() => setShowPreview(true)}
                            type="button"
                        >
                            <Eye className="h-3.5 w-3.5" />
                            <span>{t("writeup_card.view")}</span>
                        </button>
                    </div>
                </div>
            ) : (
                <p className="mt-3 text-xs text-muted-foreground">{t("writeup_card.not_submitted")}</p>
            )}
            <div className="mt-4 flex flex-col gap-2">
                <button
                    type="button"
                    disabled={uploading || !startReady || deadlinePassed}
                    className="flex items-center justify-center gap-2 rounded-xl bg-primary/90 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary disabled:opacity-70"
                    onClick={() => fileInputRef.current?.click()}
                >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                    {uploading ? t("writeup_card.uploading") : (writeup ? t("writeup_card.replace") : t("writeup_card.upload"))}
                </button>
                <p className="text-[0.7rem] text-muted-foreground">
                    {t("writeup_card.allowed_formats_with_size", { formats: allowedFormatsDisplay, size: maxSizeMB })}
                </p>
            </div>
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={uploadAccept}
                onChange={handleFileChange}
            />

            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="flex h-[92vh] w-[min(1400px,96vw)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
                    <DialogHeader className="px-6 py-4 pr-12 border-b shrink-0">
                        <DialogTitle className="flex items-center justify-between gap-4">
                            <span className="truncate">{t("writeup_card.preview_title")}</span>
                            <span className="text-sm font-normal text-muted-foreground truncate max-w-[min(45vw,360px)]">
                                {writeup?.file_name}
                            </span>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden min-h-0">
                        {writeup?.url && (
                            <iframe
                                src={writeup.url}
                                className="h-full w-full border-0"
                                title="Writeup Preview"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
