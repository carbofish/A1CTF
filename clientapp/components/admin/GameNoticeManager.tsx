import { useState, useEffect } from 'react';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from 'components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from 'components/ui/alert-dialog';
import { Badge } from 'components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'components/ui/card';
import { MacScrollbar } from 'mac-scrollbar';
import { useTheme } from 'next-themes';
import { toast } from 'react-toastify/unstyled';
import { api } from 'utils/ApiHelper';
import { AdminNoticeItem } from 'utils/A1API';
import { PlusCircle, Trash2, MessageSquare, Calendar, AlertCircle, Eye } from 'lucide-react';
import dayjs from 'dayjs';
import LazyThemedEditor from "components/modules/LazyThemedEditor";
import { useTranslation, Trans } from 'react-i18next';
import LazyMdxCompoents from 'components/modules/LazyMdxCompoents';
import useSWR from 'swr';

interface GameNoticeManagerProps {
    gameId: number;
}

export function GameNoticeManager({ gameId }: GameNoticeManagerProps) {
    const { t } = useTranslation("game_edit")
    const { t: commonT } = useTranslation()
    const { theme } = useTheme();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [selectedNotice, setSelectedNotice] = useState<AdminNoticeItem | null>(null);
    const [createForm, setCreateForm] = useState({
        title: '',
        content: ''
    });

    // 截取文本内容，限制显示长度
    const truncateContent = (content: string, maxLength: number = 100) => {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    };

    // 加载公告列表
    const { data: notices = [], isLoading: loading, mutate: loadNotices } = useSWR<AdminNoticeItem[]>(
        `/api/admin/game/${gameId}/notices/list`,
        () => api.admin.adminListGameNotices(gameId, {
            game_id: gameId,
            size: 100,  // 不太可能超过100个公告...吧？
            offset: 0
        }).then(res => res.data.data))

    // 创建公告
    const handleCreateNotice = async () => {
        if (!createForm.title.trim() || !createForm.content.trim()) {
            toast.error(t("notice.empty"));
            return;
        }

        api.admin.adminCreateGameNotice(gameId, {
            title: createForm.title,
            content: createForm.content
        }).then(() => {
            toast.success(t("notice.create.success"));
            setCreateForm({ title: '', content: '' });
            setIsCreateDialogOpen(false);
            loadNotices();
        })
    };

    // 删除公告
    const handleDeleteNotice = async (noticeId: number) => {
        api.admin.adminDeleteGameNotice({
            notice_id: noticeId
        }).then(() => {
            toast.success(t("notice.delete.success"));
            loadNotices();
        })
    };

    // 查看公告详情
    const handleViewNotice = (notice: AdminNoticeItem) => {
        setSelectedNotice(notice);
        setIsViewDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* 操作栏 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                        {t("notice.title", { count: notices.length })}
                    </span>
                </div>

                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                            <PlusCircle className="h-4 w-4" />
                            {t("notice.create.button")}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[60%]">
                        <DialogHeader>
                            <DialogTitle>{t("notice.create.dialog")}</DialogTitle>
                            <DialogDescription>
                                {t("notice.create.description")}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 overflow-hidden px-1">
                            <div>
                                <label className="text-sm font-medium mb-2 block">{t("notice.create.title.label")}</label>
                                <Input
                                    value={createForm.title}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder={t("notice.create.title.placeholder")}
                                    className="bg-background/50"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">{t("notice.create.content")}</label>
                                <LazyThemedEditor
                                    value={createForm.content}
                                    onChange={(value) => setCreateForm(prev => ({ ...prev, content: value ?? "" }))}
                                    language="markdown"
                                    className='h-[500px]'
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" type='button' onClick={() => setIsCreateDialogOpen(false)}>
                                    {commonT("cancel")}
                                </Button>
                                <Button onClick={handleCreateNotice} type='button'>
                                    {commonT("confirm")}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* 公告列表 */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : notices.length === 0 ? (
                    <div className="text-center py-12">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">{t("notice.list.empty")}</h3>
                        <p className="text-muted-foreground">{t("notice.list.first")}</p>
                    </div>
                ) : (
                    <div className="space-y-4 pr-4">
                        {notices.map((notice) => (
                            <Card key={notice.notice_id} className="group hover:shadow-md transition-all duration-200 bg-card/60 backdrop-blur-sm border-border/50">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors duration-200">
                                                {notice.title}
                                            </CardTitle>
                                            <CardDescription className="flex items-center gap-2 mt-2">
                                                <Calendar className="h-4 w-4" />
                                                {dayjs(notice.create_time).format('YYYY-MM-DD HH:mm:ss')}
                                                <Badge variant="secondary" className="ml-2">
                                                    {notice.content.length} {t("notice.char")}
                                                </Badge>
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                type='button'
                                                className="hover:bg-blue-500/10 hover:text-blue-600"
                                                onClick={() => handleViewNotice(notice)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        type='button'
                                                        className="hover:bg-destructive/10 hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>{t("notice.delete.title")}</AlertDialogTitle>
                                                        <AlertDialogDescription>

                                                            <Trans
                                                                ns='game_edit'
                                                                i18nKey="notice.delete.confirm"
                                                                values={{ title: notice.title }}
                                                                components={{ s: <strong /> }}
                                                            />
                                                            <br />
                                                            {t("notice.delete.description")}
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>{commonT("cancel")}</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDeleteNotice(notice.notice_id)}
                                                            className="bg-destructive hover:bg-destructive/90"
                                                        >
                                                            {commonT("confirm")}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {truncateContent(notice.content)}
                                        {notice.content.length > 100 && (
                                            <Button
                                                variant="link"
                                                type='button'
                                                className="p-0 h-auto text-primary text-sm ml-1"
                                                onClick={() => handleViewNotice(notice)}
                                            >
                                                {t("notice.more")}
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* 公告详情查看对话框 */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="sm:max-w-[70vw] max-h-[90vh] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            {selectedNotice?.title}
                        </DialogTitle>
                        <DialogDescription className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t("notice.time")}: {selectedNotice ? dayjs(selectedNotice.create_time).format('YYYY-MM-DD HH:mm:ss') : ''}
                            <Badge variant="secondary" className="ml-2">
                                {selectedNotice?.content.length} {t("notice.char")}
                            </Badge>
                        </DialogDescription>
                    </DialogHeader>
                    <MacScrollbar className="max-h-[70vh]" skin={theme === "dark" ? "dark" : "light"}>
                        <div className="p-4 bg-muted/30 rounded-lg">
                            <LazyMdxCompoents source={selectedNotice?.content ?? "empty"} />
                        </div>
                    </MacScrollbar>
                </DialogContent>
            </Dialog>
        </div>
    );
} 