import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { MacScrollbar } from 'mac-scrollbar';
import { useTheme } from 'next-themes';
import { toast } from 'react-toastify/unstyled';
import dayjs from 'dayjs';
import {
    Plus,
    Edit,
    Trash2,
    Calculator,
    AlertTriangle,
    Gift,
    Ban,
    Search,
    Users,
    CircleArrowLeft
} from 'lucide-react';

import { api } from 'utils/ApiHelper';
import { ScoreAdjustmentInfo, CreateScoreAdjustmentPayload, AdminListTeamItem } from 'utils/A1API';
import { useTranslation } from 'react-i18next';

interface Team {
    team_id: number;
    team_name: string;
}

export function ScoreAdjustmentManagePage() {

    const { t } = useTranslation("score_manage")
    const { t: commonT } = useTranslation()
    const { game_id } = useParams<{ game_id: string }>();
    const navigate = useNavigate();
    const { theme } = useTheme();

    const [adjustments, setAdjustments] = useState<ScoreAdjustmentInfo[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // 队伍搜索相关状态
    const [teamSearchTerm, setTeamSearchTerm] = useState('');
    const [teamSearchResults, setTeamSearchResults] = useState<Team[]>([]);
    const [isSearchingTeams, setIsSearchingTeams] = useState(false);
    const [showTeamDropdown, setShowTeamDropdown] = useState(false);

    // 创建/编辑对话框状态
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingAdjustment, setEditingAdjustment] = useState<ScoreAdjustmentInfo | null>(null);
    const [formData, setFormData] = useState<CreateScoreAdjustmentPayload>({
        team_id: 0,
        adjustment_type: 'other',
        score_change: 0,
        reason: ''
    });

    // 分数输入框的显示值
    const [scoreInputValue, setScoreInputValue] = useState('0');

    // 删除确认对话框状态
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingAdjustmentId, setDeletingAdjustmentId] = useState<number | null>(null);
    const [deletingAdjustmentInfo, setDeletingAdjustmentInfo] = useState<ScoreAdjustmentInfo | null>(null);

    const gameId = parseInt(game_id || '0');

    // 搜索队伍
    const searchTeams = useCallback(async (searchTerm: string) => {
        if (!searchTerm.trim()) {
            setTeamSearchResults([]);
            return;
        }

        setIsSearchingTeams(true);

        api.admin.adminListTeams({
            game_id: gameId,
            size: 1000,
            offset: 0,
            search: searchTerm
        }).then((res) => {
            const teamList = res.data.data?.map((team: AdminListTeamItem) => ({
                team_id: team.team_id,
                team_name: team.team_name
            })) || [];

            setTeamSearchResults(teamList);
        }).finally(() => {
            setIsSearchingTeams(false);
        })
    }, [gameId]);

    // 队伍搜索防抖
    useEffect(() => {
        const timer = setTimeout(() => {
            if (teamSearchTerm) {
                searchTeams(teamSearchTerm);
            } else {
                setTeamSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [teamSearchTerm, searchTeams]);

    // 点击外部区域关闭下拉菜单
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.team-search-container')) {
                setShowTeamDropdown(false);
            }
        };

        if (showTeamDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showTeamDropdown]);

    // 加载数据
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [adjustmentsRes, teamsRes] = await Promise.all([
                api.admin.getGameScoreAdjustments(gameId),
                api.admin.adminListTeams({
                    game_id: gameId,
                    size: 1000,
                    offset: 0
                })
            ]);

            setAdjustments(adjustmentsRes.data.data || []);

            // 转换队伍数据格式
            const teamList = teamsRes.data.data?.map((team: AdminListTeamItem) => ({
                team_id: team.team_id,
                team_name: team.team_name
            })) || [];
            setTeams(teamList);
        } catch (error) {
            console.error(`${t("error")}:`, error);
            toast.error(t("error"));
        } finally {
            setLoading(false);
        }
    }, [gameId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // 获取调整类型的显示信息
    const getAdjustmentTypeInfo = (type: string) => {
        switch (type) {
            case 'cheat':
                return {
                    label: t("cheat"),
                    icon: <Ban className="w-3 h-3" />,
                    variant: 'destructive' as const,
                    color: 'text-red-500'
                };
            case 'reward':
                return {
                    label: t("reward"),
                    icon: <Gift className="w-3 h-3" />,
                    variant: 'default' as const,
                    color: 'text-green-500'
                };
            case 'other':
                return {
                    label: t("other"),
                    icon: <AlertTriangle className="w-3 h-3" />,
                    variant: 'secondary' as const,
                    color: 'text-yellow-500'
                };
            default:
                return {
                    label: t("unknow"),
                    icon: <AlertTriangle className="w-3 h-3" />,
                    variant: 'secondary' as const,
                    color: 'text-gray-500'
                };
        }
    };

    // 过滤调整记录
    const filteredAdjustments = adjustments.filter(adj =>
        adj.team_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adj.reason.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 创建调整记录
    const handleCreate = async () => {
        api.admin.createScoreAdjustment(gameId, formData).then(() => {
            toast.success(t("create.success"));
            setDialogOpen(false);
            resetForm();
            loadData();
        })
    };

    // 更新调整记录
    const handleUpdate = async () => {
        if (!editingAdjustment) return;

        api.admin.updateScoreAdjustment(gameId, editingAdjustment.adjustment_id, {
            adjustment_type: formData.adjustment_type,
            score_change: formData.score_change,
            reason: formData.reason
        }).then(() => {
            toast.success(t("update.success"));
            setDialogOpen(false);
            setEditingAdjustment(null);
            loadData();
        })
    };

    // 删除调整记录
    const handleDelete = async (adjustmentId: number) => {
        api.admin.deleteScoreAdjustment(gameId, adjustmentId).then(() => {
            toast.success(t("delete.success"));
            loadData();
        })
    };

    // 确认删除
    const confirmDelete = () => {
        if (deletingAdjustmentId !== null) {
            handleDelete(deletingAdjustmentId);
            setDeleteDialogOpen(false);
            setDeletingAdjustmentId(null);
            setDeletingAdjustmentInfo(null);
        }
    };

    // 重置表单
    const resetForm = () => {
        setFormData({
            team_id: 0,
            adjustment_type: 'other',
            score_change: 0,
            reason: ''
        });
        setScoreInputValue('0');
        setTeamSearchTerm('');
        setTeamSearchResults([]);
        setShowTeamDropdown(false);
    };

    // 打开编辑对话框
    const openEditDialog = (adjustment: ScoreAdjustmentInfo) => {
        setEditingAdjustment(adjustment);
        setFormData({
            team_id: adjustment.team_id,
            adjustment_type: adjustment.adjustment_type,
            score_change: adjustment.score_change,
            reason: adjustment.reason
        });
        setScoreInputValue(adjustment.score_change.toString());
        setDialogOpen(true);
    };

    // 打开创建对话框
    const openCreateDialog = () => {
        setEditingAdjustment(null);
        resetForm();
        setDialogOpen(true);
    };

    // 选择队伍
    const selectTeam = (team: Team) => {
        setFormData(prev => ({ ...prev, team_id: team.team_id }));
        setTeamSearchTerm(team.team_name);
        setShowTeamDropdown(false);
        setTeamSearchResults([]);
    };

    // 获取选中队伍的名称
    const getSelectedTeamName = () => {
        if (editingAdjustment) {
            return editingAdjustment.team_name;
        }
        const selectedTeam = teams.find(t => t.team_id === formData.team_id);
        return selectedTeam?.team_name || teamSearchTerm || '';
    };

    return (
        <div className="w-full h-full flex flex-col bg-gradient-to-br from-background to-muted/30">
            {/* Header */}
            <div className="backdrop-blur-sm bg-background/80 border-b p-5 lg:p-8 sticky top-0 z-10">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate(`/admin/games`)}
                            className="bg-background/50 backdrop-blur-sm"
                        >
                            <CircleArrowLeft className="h-4 w-4" />
                            {t("back")}
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                <Calculator className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">{t("title")}</h1>
                                <p className="text-sm text-muted-foreground">{t("detail")}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("search")}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={openCreateDialog} className="flex items-center gap-2">
                                    <Plus className="w-4 h-4" />
                                    {t("create.title")}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>
                                        {editingAdjustment ? t("update.dialog") : t("create.dialog")}
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    {!editingAdjustment && (
                                        <div className="space-y-2">
                                            <Label htmlFor="team">{t("team.label")}</Label>
                                            <div className="relative team-search-container">
                                                <div className="relative">
                                                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder={t("team.search")}
                                                        value={teamSearchTerm}
                                                        onChange={(e) => {
                                                            setTeamSearchTerm(e.target.value);
                                                            setShowTeamDropdown(true);
                                                        }}
                                                        onFocus={() => setShowTeamDropdown(true)}
                                                        className="pl-10"
                                                    />
                                                </div>

                                                {/* 队伍搜索下拉列表 */}
                                                {showTeamDropdown && (teamSearchResults.length > 0 || isSearchingTeams) && (
                                                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                                        {isSearchingTeams ? (
                                                            <div className="p-3 text-center text-sm text-muted-foreground">
                                                                {t("team.searching")}
                                                            </div>
                                                        ) : teamSearchResults.length > 0 ? (
                                                            teamSearchResults.map((team) => (
                                                                <div
                                                                    key={team.team_id}
                                                                    className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                                                                    onClick={() => selectTeam(team)}
                                                                >
                                                                    <div className="font-medium">{team.team_name}</div>
                                                                    <div className="text-xs text-muted-foreground">ID: {team.team_id}</div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="p-3 text-center text-sm text-muted-foreground">
                                                                {t("team.empty")}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* 显示已选择的队伍 */}
                                            {formData.team_id > 0 && (
                                                <div className="text-sm text-muted-foreground">
                                                    {t("team.selected")}: {getSelectedTeamName()} (ID: {formData.team_id})
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {editingAdjustment && (
                                        <div className="space-y-2">
                                            <Label>{t("team.label")}</Label>
                                            <div className="p-3 bg-muted rounded-md">
                                                <div className="font-medium">{editingAdjustment.team_name}</div>
                                                <div className="text-xs text-muted-foreground">ID: {editingAdjustment.team_id}</div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="type">{t("type")}</Label>
                                        <Select
                                            value={formData.adjustment_type}
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, adjustment_type: value as any }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cheat">{t("cheat")}</SelectItem>
                                                <SelectItem value="reward">{t("rewart")}</SelectItem>
                                                <SelectItem value="other">{t("other")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="score">{t("change.label")}</Label>
                                        <Input
                                            id="score"
                                            type="number"
                                            step="0.1"
                                            value={scoreInputValue}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setScoreInputValue(value);

                                                // 如果是空值，设为0
                                                if (value === '') {
                                                    setFormData(prev => ({ ...prev, score_change: 0 }));
                                                    return;
                                                }

                                                // 如果是有效数字，更新状态
                                                const numValue = parseFloat(value);
                                                if (!isNaN(numValue)) {
                                                    setFormData(prev => ({ ...prev, score_change: numValue }));
                                                }
                                                // 对于 '-', '.', '-.' 等中间状态，只更新显示值，不更新数字状态
                                            }}
                                            placeholder={t("change.placeholder")}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="reason">{t("reason.label")}</Label>
                                        <Textarea
                                            id="reason"
                                            value={formData.reason}
                                            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                                            placeholder={t("reason.placeholder")}
                                            rows={3}
                                        />
                                    </div>

                                    <div className="flex gap-2 pt-4">
                                        <Button
                                            variant="outline"
                                            onClick={() => setDialogOpen(false)}
                                            className="flex-1"
                                        >
                                            {commonT("cancel")}
                                        </Button>
                                        <Button
                                            onClick={editingAdjustment ? handleUpdate : handleCreate}
                                            className="flex-1"
                                            disabled={!formData.team_id || !formData.reason}
                                        >
                                            {editingAdjustment ? t("update.title") : t("create.title")}
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                <MacScrollbar className="h-full" skin={theme === "light" ? "light" : "dark"}>
                    <div className="p-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calculator className="w-5 h-5" />
                                    {t("history.title")}
                                    <Badge variant="outline" className="ml-auto">
                                        {t("history.count", { count: filteredAdjustments.length })}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="text-muted-foreground">{commonT("loading")}</div>
                                    </div>
                                ) : filteredAdjustments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <Calculator className="w-12 h-12 text-muted-foreground mb-4" />
                                        <h3 className="text-lg font-medium mb-2">{t("history.empty.1")}</h3>
                                        <p className="text-muted-foreground mb-4">
                                            {searchTerm ? t("history.empty.2") : t("history.empty.3")}
                                        </p>
                                        {!searchTerm && (
                                            <Button onClick={openCreateDialog}>
                                                <Plus className="w-4 h-4 mr-2" />
                                                {t("create.empty")}
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t("id")}</TableHead>
                                                <TableHead>{t("team.label")}</TableHead>
                                                <TableHead>{t("type")}</TableHead>
                                                <TableHead>{t("change.label")}</TableHead>
                                                <TableHead>{t("reason.label")}</TableHead>
                                                <TableHead>{t("operation.time")}</TableHead>
                                                <TableHead>{t("operation.operator")}</TableHead>
                                                <TableHead className="text-right">{t("operation.label")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredAdjustments.map((adjustment) => {
                                                const typeInfo = getAdjustmentTypeInfo(adjustment.adjustment_type);
                                                return (
                                                    <TableRow key={adjustment.adjustment_id}>
                                                        <TableCell className="font-mono">
                                                            #{adjustment.adjustment_id}
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            {adjustment.team_name}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={typeInfo.variant} className="flex items-center gap-1 w-fit">
                                                                {typeInfo.icon}
                                                                {typeInfo.label}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className={`font-medium ${adjustment.score_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {adjustment.score_change >= 0 ? '+' : ''}{adjustment.score_change}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="max-w-xs">
                                                            <div className="truncate" title={adjustment.reason}>
                                                                {adjustment.reason}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {dayjs(adjustment.created_at).format('YYYY-MM-DD HH:mm:ss')}
                                                        </TableCell>
                                                        <TableCell className="text-sm">
                                                            {adjustment.created_by_username}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center gap-2 justify-end">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => openEditDialog(adjustment)}
                                                                    className="h-8 w-8 p-0"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setDeletingAdjustmentId(adjustment.adjustment_id);
                                                                        setDeletingAdjustmentInfo(adjustment);
                                                                        setDeleteDialogOpen(true);
                                                                    }}
                                                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </MacScrollbar>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <div>{t("delete.dialog")}</div>
                            {deletingAdjustmentInfo && (
                                <div className="mt-3 p-3 bg-muted rounded-md text-sm">
                                    <div><strong>{t("id")}:</strong> #{deletingAdjustmentInfo.adjustment_id}</div>
                                    <div><strong>{t("team.label")}:</strong> {deletingAdjustmentInfo.team_name}</div>
                                    <div><strong>{t("change.label")}:</strong> {deletingAdjustmentInfo.score_change >= 0 ? '+' : ''}{deletingAdjustmentInfo.score_change}</div>
                                    <div><strong>{t("reason.label")}:</strong> {deletingAdjustmentInfo.reason}</div>
                                </div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setDeleteDialogOpen(false);
                            setDeletingAdjustmentId(null);
                            setDeletingAdjustmentInfo(null);
                        }}>
                            {commonT("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {commonT("confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
} 