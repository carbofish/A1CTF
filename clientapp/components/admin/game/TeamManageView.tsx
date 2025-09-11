import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"

import { ArrowLeft, ArrowRight, ArrowUpDown, ChevronDown, MoreHorizontal, LockIcon, CheckIcon, TrashIcon, UnlockIcon, ClipboardList, RefreshCw, Copy } from "lucide-react"

import * as React from "react"

import { Button } from "components/ui/button"
import { Checkbox } from "components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "components/ui/dropdown-menu"

import { Input } from "components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "components/ui/table"


import { Badge } from "../../ui/badge";
import { ParticipationStatus } from "utils/A1API";

import { api } from "utils/ApiHelper";
import AvatarUsername from "../../modules/AvatarUsername";
import { toast } from 'react-toastify/unstyled';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "components/ui/avatar"
import { copyWithResult } from "utils/ToastUtil"
import { useTranslation } from "react-i18next"
import useSWR from "swr"

export type TeamModel = {
    team_id: number,
    team_name: string,
    team_avatar: string | null,
    team_slogan: string | null,
    members: {
        avatar: string | null,
        user_name: string,
        user_id: string
    }[],
    status: ParticipationStatus,
    score: number
}

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description
}) => {
    const { t } = useTranslation()
    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm}>{t("confirm")}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export function TeamManageView(
    {
        gameId,
    }: {
        gameId: number
    }
) {
    const { t } = useTranslation("game_edit")
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
        []
    )
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    const [pageSize, _setPageSize] = React.useState(30);
    const [curPage, setCurPage] = React.useState(0);
    const [totalCount, setTotalCount] = React.useState(0);
    const [searchKeyword, setSearchKeyword] = React.useState("");
    const [debouncedSearchKeyword, setDebouncedSearchKeyword] = React.useState("");

    // 对话框状态
    const [confirmDialog, setConfirmDialog] = React.useState({
        isOpen: false,
        title: "",
        description: "",
        onConfirm: () => { },
    });

    // 防抖处理搜索关键词
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchKeyword(searchKeyword);
            setCurPage(0); // 重置到第一页
        }, 200); // 200ms 防抖延迟

        return () => clearTimeout(timer);
    }, [searchKeyword]);

    // 处理队伍状态变更
    const handleUpdateTeamStatus = (teamId: number, action: 'approve' | 'ban' | 'unban') => {
        // 根据不同操作调用不同API
        let apiCall;
        let loadingMessage;

        switch (action) {
            case 'approve':
                apiCall = api.admin.adminApproveTeam({ team_id: teamId, game_id: gameId });
                loadingMessage = `${t("team.approve.loading")}...`
                break;
            case 'ban':
                apiCall = api.admin.adminBanTeam({ team_id: teamId, game_id: gameId });
                loadingMessage = `${t("team.ban.loading")}...`
                break;
            case 'unban':
                apiCall = api.admin.adminUnbanTeam({ team_id: teamId, game_id: gameId });
                loadingMessage = `${t("team.unban.loading")}...`
                break;
        }

        // 使用toast.promise包装API调用
        toast.promise(apiCall, {
            pending: loadingMessage,
            success: {
                render({ data: _data }) {
                    fetchTeams(); // 刷新数据
                    return t("team.refresh.success")
                },
            },
            error: t("team.refresh.error")
        });
    };

    // 处理队伍删除
    const handleDeleteTeam = (teamId: number) => {
        setConfirmDialog({
            isOpen: true,
            title: t("team.delete.title"),
            description: t("team.delete.description"),
            onConfirm: () => {
                toast.promise(
                    api.admin.adminDeleteTeam({ team_id: teamId, game_id: gameId }),
                    {
                        pending: `${t("team.delete.pending")}...`,
                        success: {
                            render({ data: _data }) {
                                fetchTeams(); // 刷新数据
                                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                return t("team.delete.success")
                            },
                        },
                        error: t("team.delete.error")
                    }
                );
            }
        });
    };

    // 设置队伍为已批准状态
    const handleApproveTeam = (teamId: number) => {
        handleUpdateTeamStatus(teamId, 'approve');
    };

    // 设置队伍为已禁赛状态
    const handleBanTeam = (teamId: number) => {
        setConfirmDialog({
            isOpen: true,
            title: t("team.ban.title"),
            description: t("team.ban.description"),
            onConfirm: () => {
                handleUpdateTeamStatus(teamId, 'ban');
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    // 设置队伍从禁赛状态解锁
    const handleUnbanTeam = (teamId: number) => {
        setConfirmDialog({
            isOpen: true,
            title: t("team.unban.title"),
            description: t("team.unban.description"),
            onConfirm: () => {
                handleUpdateTeamStatus(teamId, 'unban');
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    // 获取状态对应的颜色和中文显示
    const getStatusColorAndText = (status: ParticipationStatus) => {
        switch (status) {
            case ParticipationStatus.Approved:
                return { color: "#52C41A", text: t("team.status.approved") };
            case ParticipationStatus.Pending:
                return { color: "#FAAD14", text: t("team.status.pending") };
            case ParticipationStatus.Banned:
                return { color: "#FF4D4F", text: t("team.status.banned") };
            case ParticipationStatus.Rejected:
                return { color: "#F5222D", text: t("team.status.rejected") };
            case ParticipationStatus.Participated:
                return { color: "#1890FF", text: t("team.status.accepted") };
            default:
                return { color: "#D9D9D9", text: t("team.status.default") };
        }
    };

    const columns: ColumnDef<TeamModel>[] = [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "team_name",
            header: t("events.filter.team"),
            cell: ({ row }) => {
                const avatar_url = row.original.team_avatar;
                return (
                    <div className="flex gap-3 items-center">
                        <AvatarUsername avatar_url={avatar_url} username={row.getValue("team_name") as string} />
                        {row.getValue("team_name")}
                    </div>
                )
            },
        },
        {
            accessorKey: "status",
            header: t("events.submit.status"),
            cell: ({ row }) => {
                const status = row.getValue("status") as ParticipationStatus;
                const { color, text } = getStatusColorAndText(status);
                return (
                    <div className="w-full flex">
                        <Badge
                            className="capitalize px-[10px] flex justify-center select-none"
                            style={{ backgroundColor: color }}
                        >
                            {text}
                        </Badge>
                    </div>
                )
            },
        },
        {
            accessorKey: "score",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t("team.score")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div>{row.getValue("score")}</div>,
        },
        {
            accessorKey: "members",
            header: t("team.member"),
            cell: ({ row }) => {
                const members = row.original.members;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div className="*:data-[slot=avatar]:ring-background cursor-pointer flex -space-x-2 *:data-[slot=avatar]:ring-2">
                                {members.map((member, index) => (
                                    <Avatar key={index}>
                                        <AvatarImage src={member.avatar ?? ""} />
                                        <AvatarFallback className="select-none">{member.user_name.substring(0, 2)}</AvatarFallback>
                                    </Avatar>
                                ))}
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-background/5 backdrop-blur-sm px-4 py-2 flex flex-col gap-2 mt-2 select-none">
                            <span className="text-sm">{t("team.list")}</span>
                            <div className="flex flex-col gap-2">
                                {members.map((member) => (
                                    <div key={member.user_id} className="flex items-center gap-1">
                                        <Avatar>
                                            <AvatarImage src={member.avatar ?? ""} />
                                            <AvatarFallback className="select-none">{member.user_name.substring(0, 2)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm mr-1">{member.user_name}</span>
                                        <Button variant="outline" size="icon" className="w-6 h-6 rounded-sm [&_svg]:size-3"
                                            onClick={() => {
                                                copyWithResult(member.user_name)
                                            }}
                                        >
                                            <Copy />
                                        </Button>
                                        <Badge
                                            variant="outline"
                                            className="text-xs select-none hover:bg-blue/10 hover:border-blue/30 cursor-pointer transition-all duration-200 rounded-md px-2 py-1 font-mono"
                                            onClick={() => {
                                                copyWithResult(member.user_id, t("team.user_id"))
                                            }}
                                        >
                                            #{member.user_id}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
        {
            accessorKey: "team_slogan",
            header: t("team.slogan"),
            cell: ({ row }) => <div>{row.getValue("team_slogan") || ""}</div>,
        },
        {
            id: "actions",
            header: t("action"),
            enableHiding: false,
            cell: ({ row }) => {
                const team = row.original;

                return (
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleApproveTeam(team.team_id)}
                            disabled={team.status !== ParticipationStatus.Pending}
                            data-tooltip-id="my-tooltip"
                            data-tooltip-content={t("team.approve.title")}
                            data-tooltip-place="top"
                        >
                            <span className="sr-only">{t("team.approve.name")}</span>
                            <CheckIcon className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">{t("team.menu.title")}</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" >
                                <DropdownMenuLabel>{t("action")}</DropdownMenuLabel>
                                <DropdownMenuItem
                                    onClick={() => {
                                        copyWithResult(team.team_id || '', t("events.filter.team_id"))
                                    }}
                                >
                                    <ClipboardList className="h-4 w-4 mr-2" />
                                    {t("team.menu.copy")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleBanTeam(team.team_id)}
                                    disabled={team.status === ParticipationStatus.Banned}
                                    className="text-amber-600"
                                >
                                    <LockIcon className="h-4 w-4 mr-2" />
                                    {t("team.ban.ban")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleUnbanTeam(team.team_id)}
                                    disabled={team.status !== ParticipationStatus.Banned}
                                    className="text-green-600"
                                >
                                    <UnlockIcon className="h-4 w-4 mr-2" />
                                    {t("team.unban.unban")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleDeleteTeam(team.team_id)}
                                    className="text-red-600"
                                >
                                    <TrashIcon className="h-4 w-4 mr-2" />
                                    {t("team.delete.delete")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    ]

    // 获取队伍列表数据
    const { data = [], mutate: fetchTeams } = useSWR<TeamModel[]>(`/api/admin/team/list?game_id=${gameId}&size=${pageSize}&page=${curPage}&search=${debouncedSearchKeyword.trim()}`,
        async () => {
            const payload: any = {
                game_id: gameId,
                size: pageSize,
                offset: pageSize * curPage
            }
            if (debouncedSearchKeyword.trim()) {
                payload.search = debouncedSearchKeyword.trim()
            }
            const res = await api.admin.adminListTeams(payload)
            setTotalCount(res.data.total ?? 0)
            return res.data.data.map(item => ({
                team_id: item.team_id,
                team_name: item.team_name,
                team_avatar: item.team_avatar || null,
                team_slogan: item.team_slogan || null,
                members: item.members.map(member => ({
                    avatar: member.avatar || null,
                    user_name: member.user_name,
                    user_id: member.user_id
                })),
                status: item.status,
                score: item.score
            })) as TeamModel[]
        }
    )

    // 处理搜索
    const handleSearch = (value: string) => {
        setSearchKeyword(value);
    };

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    })

    React.useEffect(() => {
        table.setPageSize(pageSize);
    }, [pageSize]);

    return (
        <>
            <div className="w-full flex flex-col gap-4">
                <div className="flex items-center space-x-2">
                    <div className="flex-1 text-sm text-muted-foreground flex items-center">
                        {t("team.select", { a: table.getFilteredSelectedRowModel().rows.length, b: table.getFilteredRowModel().rows.length })}
                    </div>
                    <div className="flex gap-3 items-center">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurPage(curPage - 1)}
                            disabled={curPage == 0}
                        >
                            <ArrowLeft />
                        </Button>
                        <div className="text-sm text-muted-foreground">
                            {curPage + 1} / {Math.ceil(totalCount / pageSize)}
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurPage(curPage + 1)}
                            disabled={curPage >= Math.ceil(totalCount / pageSize) - 1}
                        >
                            <ArrowRight />
                        </Button>
                    </div>
                </div>
                <div className="flex items-center">
                    <div className="flex flex-col gap-2">
                        <Input
                            placeholder={t("events.filter.placeholder")}
                            value={searchKeyword}
                            onChange={(event) => handleSearch(event.target.value)}
                            className="max-w-sm"
                        />
                        <span className="text-xs text-muted-foreground">{t("team.support")}</span>
                    </div>
                    <div className="flex gap-2 ml-auto">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    {t("team.row")} <ChevronDown />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="select-none">
                                {table
                                    .getAllColumns()
                                    .filter((column) => column.getCanHide())
                                    .map((column) => {
                                        return (
                                            <DropdownMenuCheckboxItem
                                                key={column.id}
                                                className="capitalize"
                                                checked={column.getIsVisible()}
                                                onCheckedChange={(value) =>
                                                    column.toggleVisibility(!!value)
                                                }
                                            >
                                                {column.id}
                                            </DropdownMenuCheckboxItem>
                                        )
                                    })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="outline" size={"icon"} onClick={() => fetchTeams()}>
                            <RefreshCw />
                        </Button>
                    </div>
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center"
                                    >
                                        {t("team.empty")}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                description={confirmDialog.description}
            />
        </>
    )
}