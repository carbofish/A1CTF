import { File, Pickaxe, ArrowDownUp, FileDown } from "lucide-react";
import { Button } from "components/ui/button";
import { Progress } from "components/ui/progress";
import { AttachmentType, UserAttachmentConfig } from "utils/A1API";
import { useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

interface DownloadInfo {
    size: string;
    progress: number;
    speed: string;
};

const FileDownloader = (
    { attach, setRedirectURL }: { attach: UserAttachmentConfig, setRedirectURL: React.Dispatch<React.SetStateAction<string>> },
) => {

    const [downloadSpeed, setDownloadSpeed] = useState<DownloadInfo>();
    const [downloading, setDownloading] = useState(false);
    const { t } = useTranslation("challenge_view")

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDownloadSpeed = (bytesPerSecond: number): string => {
        if (bytesPerSecond === 0) return '0 B/s';

        const k = 1024;
        const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));

        return Math.round(bytesPerSecond / Math.pow(k, i)).toString() + ' ' + sizes[i];
    };

    const handleDownload = (attach: UserAttachmentConfig) => {


        if (attach.attach_type == AttachmentType.STATICFILE || attach.attach_type == AttachmentType.REMOTEFILE) {
            const fileName = attach.attach_name

            setDownloadSpeed({
                size: "0B",
                progress: 0,
                speed: "0 KB/s",
            });
            setDownloading(true)

            const fetchFile = async (url: string) => {
                try {
                    const response = await fetch(url);
                    const contentLength = response.headers.get("Content-Length") || "0";
                    if (!response.ok) {
                        throw new Error("Network response was not ok");
                    }

                    const reader = response.body!.getReader();
                    const totalBytes = parseInt(contentLength, 10);
                    let receivedBytes = 0;
                    const startTime = Date.now();
                    let lastUpdateTime = startTime;
                    let lastReceivedBytes = 0;

                    const chunks: Uint8Array[] = [];
                    const pump = async () => {
                        const { done, value } = await reader.read();
                        if (done) {
                            const blob = new Blob(chunks as BlobPart[], { type: "application/octet-stream" });
                            const downloadUrl = URL.createObjectURL(blob);

                            setDownloadSpeed({
                                size: formatFileSize(totalBytes),
                                progress: Math.round(Math.min(100, (receivedBytes / totalBytes) * 100)),
                                speed: downloadSpeed?.speed ?? "0 KB/s",
                            });

                            setTimeout(() => {
                                const a = document.createElement("a");
                                a.href = downloadUrl;
                                a.download = dayjs().format("HHmmss") + "_" + fileName;
                                a.click();
                                URL.revokeObjectURL(downloadUrl);
                            }, 300);

                            return;
                        }

                        chunks.push(value);
                        receivedBytes += value.length;

                        const now = Date.now();
                        const timeElapsed = (now - lastUpdateTime) / 1000; // 转换为秒

                        // 每0.5秒更新一次速度显示，避免闪烁
                        if (timeElapsed > 0.5) {
                            const bytesSinceLastUpdate = receivedBytes - lastReceivedBytes;
                            const currentSpeed = bytesSinceLastUpdate / timeElapsed;

                            setDownloadSpeed({
                                size: formatFileSize(totalBytes),
                                progress: Math.round(Math.min(100, (receivedBytes / totalBytes) * 100)),
                                speed: formatDownloadSpeed(currentSpeed),
                            });

                            lastUpdateTime = now;
                            lastReceivedBytes = receivedBytes;
                        }

                        pump();
                    };

                    pump();
                } catch (error) {
                    console.error("Download failed:", error);
                    setDownloading(false)
                }
            };

            if (attach.attach_type == AttachmentType.STATICFILE) {
                fetchFile(`/api/file/download/${attach.attach_hash}`)
            } else {
                fetchFile(attach.attach_url ?? "");
            }
        } else {
            setRedirectURL(attach.attach_url ?? "");
        }
    };

    return (
        <Button variant="secondary" onClick={() => handleDownload(attach)}
            className="p-0 w-full lg:w-[300px] h-[105px] text-md [&_svg]:size-5 transition-all duration-300 hover:bg-foreground/20 select-none disabled:opacity-100"
            disabled={downloading}
            title={attach.attach_name}
        >
            <div className={`flex flex-col p-4 w-full h-full ${!downloading ? "justify-center gap-2" : "justify-between"}`}>
                {downloading ? (
                    <>
                        <div className="flex gap-2 items-center">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <File />
                                <span className="font-bold text-nowrap text-ellipsis">{attach.attach_name} / {downloadSpeed?.size}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-2">
                                <Pickaxe />
                                <span className="font-bold">{downloadSpeed?.progress}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <ArrowDownUp />
                                <span className="font-bold">{downloadSpeed?.speed}</span>
                            </div>
                        </div>
                        <Progress value={downloadSpeed?.progress ?? 0} className="w-full" />
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-2 overflow-hidden">
                            <File />
                            <span className="font-bold text-nowrap text-ellipsis">{attach.attach_name}</span>
                        </div>
                        <div className="flex gap-2 items-center">
                            <FileDown />
                            <span>{t("download")}</span>
                        </div>
                    </>
                )}
            </div>
        </Button>
    )
}

export default FileDownloader;