import { useState } from 'react';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Textarea } from 'components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from 'components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from 'components/ui/table';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from 'components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify/unstyled';
import { api } from 'utils/ApiHelper';
import { PlusCircle, Pencil, Trash2, Clipboard } from 'lucide-react';
import AlertConformer from 'components/modules/AlertConformer';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { AdminGameGroupItem } from 'utils/A1API';
import copy from 'copy-to-clipboard';
import useSWR from 'swr';

interface GameGroupManagerProps {
    gameId: number;
}

export function GameGroupManager({ gameId }: GameGroupManagerProps) {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<AdminGameGroupItem | null>(null);

    const { t } = useTranslation("game_edit")
    const { t: commonT } = useTranslation()

    const groupFormSchema = z.object({
        group_name: z.string().min(1, t("group.error.empty")).max(100, t("group.error.long1")),
        description: z.string().max(500, t("group.error.long2")).optional(),
    });

    type GroupFormData = z.infer<typeof groupFormSchema>;

    const createForm = useForm<GroupFormData>({
        resolver: zodResolver(groupFormSchema),
        defaultValues: {
            group_name: '',
            description: '',
        },
    });

    const editForm = useForm<GroupFormData>({
        resolver: zodResolver(groupFormSchema),
        defaultValues: {
            group_name: '',
            description: '',
        },
    });

    // 加载分组列表
    const {
        data: groups = [],
        isLoading: loading,
        mutate: loadGroups
    } = useSWR<AdminGameGroupItem[]>(
        `/api/admin/game/${gameId}/groups`,
        () => api.admin.adminGetGameGroups(gameId).then((res) => res.data.data)
    )


    // 创建分组
    const handleCreateGroup = async (data: GroupFormData) => {

        api.admin.adminCreateGameGroup(gameId, {
            group_name: data.group_name,
            description: data.description || '',
        }).then(() => {
            toast.success(t("group.add.success"));
            setIsCreateDialogOpen(false);
            createForm.reset();
            loadGroups();
        })
    };

    // 更新分组
    const handleUpdateGroup = async (data: GroupFormData) => {
        if (!editingGroup) return;

        api.admin.adminUpdateGameGroup(gameId, editingGroup.group_id, {
            group_name: data.group_name,
            description: data.description || '',
        }).then(() => {
            toast.success(t("group.edit.success"));
            setIsEditDialogOpen(false);
            setEditingGroup(null);
            editForm.reset();
            loadGroups();
        })
    };

    // 删除分组
    const handleDeleteGroup = async (groupId: number) => {
        api.admin.adminDeleteGameGroup(gameId, groupId).then(() => {
            toast.success(t("group.delete_success"));
            loadGroups();
        })
    };

    // 编辑分组
    const handleEditGroup = (group: AdminGameGroupItem) => {
        setEditingGroup(group);
        editForm.setValue('group_name', group.group_name);
        editForm.setValue('description', group.group_description || '');
        setIsEditDialogOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t("group.title")}</h3>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            <PlusCircle className="w-4 h-4" />
                            {t("group.add.button")}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t("group.add.title")}</DialogTitle>
                            <DialogDescription>
                                {t("group.add.description")}
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...createForm}>
                            <form onSubmit={createForm.handleSubmit(handleCreateGroup)} className="space-y-4">
                                <FormField
                                    control={createForm.control}
                                    name="group_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className='h-[20px] flex items-center'>
                                                <FormLabel>{t("group.add.name.label")}</FormLabel>
                                            </div>
                                            <FormControl>
                                                <Input placeholder={t("group.add.name.placeholder")} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={createForm.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className='h-[20px] flex items-center'>
                                                <FormLabel>{t("group.add.info.label")} ({t("group.option")})</FormLabel>
                                            </div>
                                            <FormControl>
                                                <Textarea
                                                    placeholder={t("group.add.info.placeholder")}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                                        {commonT("cancel")}
                                    </Button>
                                    <Button type="submit">{commonT("confirm")}</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* 分组列表 */}
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("group.group_id")}</TableHead>
                            <TableHead>{t("group.add.name.label")}</TableHead>
                            <TableHead>{t("group.add.info.label")}</TableHead>
                            <TableHead>{t("group.time")}</TableHead>
                            <TableHead>{t("group.invite_code")}</TableHead>
                            <TableHead>{t("group.people_count")}</TableHead>
                            <TableHead className="text-right">{t("action")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8">
                                    {commonT("loading")}
                                </TableCell>
                            </TableRow>
                        ) : groups.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    {t("group.empty")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            groups.map((group) => (
                                <TableRow key={group.group_id}>
                                    <TableCell className="font-medium">{group.group_id}</TableCell>
                                    <TableCell className="font-medium">{group.group_name}</TableCell>
                                    <TableCell className="max-w-xs truncate">
                                        {group.group_description || '-'}
                                    </TableCell>
                                    <TableCell>
                                        {dayjs(group.created_at).format('YYYY-MM-DD HH:mm:ss')}
                                    </TableCell>
                                    <TableCell>
                                        {group.invite_code || "NULL"}
                                    </TableCell>
                                    <TableCell>
                                        {group.people_count || "NULL"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                type="button"
                                                onClick={() => handleEditGroup(group)}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                type="button"
                                                onClick={() => {
                                                    copy(group.invite_code || "");
                                                    toast.success(t("group.copy_success"));
                                                }}
                                            >
                                                <Clipboard className="w-4 h-4" />
                                            </Button>
                                            <AlertConformer
                                                title={t("group.timeline.delete.title")}
                                                description={t("group.timeline.delete.description")}
                                                type="danger"
                                                onConfirm={() => handleDeleteGroup(group.group_id)}
                                            >
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    type="button"
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </AlertConformer>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* 编辑分组对话框 */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("group.edit.title")}</DialogTitle>
                        <DialogDescription>
                            {t("group.edit.description")}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...editForm}>
                        <form onSubmit={editForm.handleSubmit(handleUpdateGroup)} className="space-y-4">
                            <FormField
                                control={editForm.control}
                                name="group_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className='h-[20px] flex items-center'>
                                            <FormLabel>{t("group.add.name.label")}</FormLabel>
                                        </div>
                                        <FormControl>
                                            <Input placeholder={t("group.add.name.placeholder")} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editForm.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className='h-[20px] flex items-center'>
                                            <FormLabel>{t("group.add.info.label")} ({t("group.option")})</FormLabel>
                                        </div>
                                        <FormControl>
                                            <Textarea
                                                placeholder={t("group.add.info.placeholder")}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                    {commonT("cancel")}
                                </Button>
                                <Button type="submit">{commonT("confirm")}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
} 