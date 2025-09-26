import { Button } from "components/ui/button";
import copy from "copy-to-clipboard";
import dayjs from "dayjs";
import i18n from "i18n";
import { CalendarClock, CircleX, FileType2, LetterText, MailCheck, PackageOpen, Text } from "lucide-react";
import { Dispatch, SetStateAction, useState, useEffect } from "react";
import { toast } from "react-toastify/unstyled";
import { toast as OldToast } from 'sonner'

function ToastWrapper({
    t,
    duration,
    children,
}: {
    t: string | number;
    duration: number;
    children: React.ReactNode;
}) {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        const start = Date.now();
        const timer = setInterval(() => {
            const elapsed = Date.now() - start;
            const percent = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(percent);

            if (elapsed >= duration) {
                clearInterval(timer);
                OldToast.dismiss(t);
            }
        }, 100);

        return () => clearInterval(timer);
    }, [t, duration]);

    return (
        <div className="bg-background/90 border rounded-2xl w-full relative overflow-hidden">
            {/* 顶部进度条 */}
            <div className="absolute top-0 left-0 w-full h-1 bg-muted">
                <div
                    className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-green-500 transition-all duration-100 ease-linear"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* 内容 */}
            <div className="flex flex-col justify-center gap-2 p-4">
                {children}
            </div>
        </div>
    );
}

export function toastNewNotice({
    title,
    time,
    openNotices,
}: {
    title: string;
    time: string;
    openNotices: Dispatch<SetStateAction<boolean>>;
}) {
    const DURATION = 60000;
    OldToast.custom(
        (t) => (
            <ToastWrapper t={t} duration={DURATION}>
                <div className="flex gap-2 items-center">
                    <MailCheck size={20} className="flex-none" />
                    <span className="text-sm">{i18n.t("toast.notice.title")}</span>
                </div>
                <div className="flex gap-2 items-center">
                    <CalendarClock size={20} />
                    <span className="text-sm">{time}</span>
                </div>
                <div className="flex gap-2">
                    <FileType2 size={20} className="flex-none" />
                    <span className="text-sm">
                        {title.substring(0, Math.min(title.length, 50)) +
                            (title.length > 50 ? "…" : "")}
                    </span>
                </div>
                <div className="flex gap-4 mt-2 justify-center">
                    <Button
                        variant="outline"
                        className="flex"
                        onClick={() => {
                            OldToast.dismiss(t);
                            setTimeout(() => openNotices(true), 300);
                        }}
                    >
                        <div className="flex items-center gap-1">
                            <PackageOpen />
                            <span>{i18n.t("toast.notice.open")}</span>
                        </div>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => OldToast.dismiss(t)}
                        className="flex items-center gap-1"
                    >
                        <CircleX /> {i18n.t("close")}
                    </Button>
                </div>
            </ToastWrapper>
        ),
        {
            duration: DURATION,
            position: "top-center",
        }
    );
}

export function toastNewHint({
    challenges,
    time,
}: {
    challenges: string[];
    time: number;
    openNotices: Dispatch<SetStateAction<boolean>>;
}) {
    const DURATION = 60000;
    OldToast.custom(
        (t) => (
            <ToastWrapper t={t} duration={DURATION}>
                <div className="flex gap-2 items-center">
                    <Text size={20} className="flex-none" />
                    <span className="text-sm">{i18n.t("toast.hint.title")}</span>
                </div>
                <div className="flex gap-2 items-center">
                    <CalendarClock size={20} />
                    <span className="text-sm">
                        {dayjs(time * 1000).format("YYYY-MM-DD HH:mm:ss")}
                    </span>
                </div>
                <div className="flex gap-2">
                    <LetterText size={20} className="flex-none" />
                    <span className="text-sm">
                        {i18n.t("toast.hint.content", { name: challenges.join(", ") })}
                    </span>
                </div>
                <div className="flex gap-4 mt-2 justify-center">
                    <Button variant="outline" onClick={() => OldToast.dismiss(t)}>
                        <CircleX /> {i18n.t("close")}
                    </Button>
                </div>
            </ToastWrapper>
        ),
        {
            duration: DURATION,
            position: "top-center",
        }
    );
}

export const copyWithResult = (text: any, field: string = "") => {
    const t: string = text?.toString() ?? ""
    if (field.length > 0) field += " "
    t.length > 0 ? (copy(t) ?
        toast.success(`${field}${i18n.t("toast.copy.success")}`) :
        toast.error(`${field}${i18n.t("toast.copy.failed")}`)) : toast.error(`${field}${i18n.t("toast.copy.failed")}`)
};