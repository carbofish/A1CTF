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

import { ArrowLeft, ArrowRight, ArrowUpDown, ChevronDown, MoreHorizontal, CopyIcon, ClockIcon, ClipboardList, ZapOff, Terminal, Package, RefreshCw } from "lucide-react"

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
    DropdownMenuGroup,
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

import { api, createSkipGlobalErrorConfig } from "utils/ApiHelper";
import { Badge } from "components/ui/badge";
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
import { AdminContainerItem, AdminListContainersPayload, ContainerStatus } from "utils/A1API";
import { toast } from 'react-toastify/unstyled';
import dayjs from "dayjs";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "components/ui/hover-card";
import { AxiosResponse } from "axios";
import { Label } from "components/ui/label";
import copy from "copy-to-clipboard";
import { copyWithResult } from "utils/ToastUtil";
import ContainerTerminal from "components/modules/terminal/Terminal";
import { useTranslation } from "react-i18next"

export type ContainerModel = {
    ID: string,
    TeamName: string,
    GameName: string,
    ChallengeName: string,
    Status: ContainerStatus,
    ExpireTime: Date,
    Ports: string,
    PodID: string,
};

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

    return <AlertDialog open={isOpen} onOpenChange={onClose}>
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
};

export function ContainerManageView({
    gameId,
    challengeID
}: {
    gameId: number,
    challengeID?: number
}) {

    const { t } = useTranslation("game_edit")
    const [data, setData] = React.useState<AdminContainerItem[]>([]);
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    const [pageSize, _setPageSize] = React.useState(30);
    const [curPage, setCurPage] = React.useState(0);
    const [totalCount, setTotalCount] = React.useState(0);

    const [showFailedContainer, setShowFailedContainer] = React.useState(false);

    const [searchKeyword, setSearchKeyword] = React.useState("");
    const [debouncedSearchKeyword, setDebouncedSearchKeyword] = React.useState("");

    const [confirmDialog, setConfirmDialog] = React.useState({
        isOpen: false,
        title: "",
        description: "",
        onConfirm: () => { },
    });

    // 多终端数组
    type TerminalInstance = {
        id: string;
        teamName: string;
        podName: string;
        containerName: string;
        isOpen: boolean;
    };
    const [terminals, setTerminals] = React.useState<TerminalInstance[]>([]);

    // 防抖处理搜索关键词
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchKeyword(searchKeyword);
            setCurPage(0);
        }, 200);
        return () => clearTimeout(timer);
    }, [searchKeyword]);

    // 容器操作
    const handleDeleteContainer = (containerId: string) => {
        setConfirmDialog({
            isOpen: true,
            title: t("container.stop.title"),
            description: t("container.stop.description"),
            onConfirm: () => {
                toast.promise(
                    api.admin.adminDeleteContainer({ container_id: containerId }),
                    {
                        pending: t("container.stop.pending"),
                        success: {
                            render({ data: _data }) {
                                fetchContainers();
                                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                return t("container.stop.success")
                            }
                        },
                        error: t("container.stop.error"),
                    }
                );
            }
        });
    };

    const handleBatchDeleteContainers = () => {
        const selectedRows = table.getFilteredSelectedRowModel().rows;
        const selectedContainerIds = selectedRows.map(row => row.original.container_id);

        if (selectedContainerIds.length === 0) {
            toast.error(t("container.stop.batch.select"));
            return;
        }

        setConfirmDialog({
            isOpen: true,
            title: t("container.stop.batch.confirm"),
            description: t("container.stop.batch.description", { count: selectedContainerIds.length }),
            onConfirm: () => {
                const promises = selectedContainerIds.map(containerId =>
                    api.admin.adminDeleteContainer({ container_id: containerId })
                );

                toast.promise(
                    Promise.allSettled(promises),
                    {
                        pending: t("container.stop.batch.pending", { count: selectedContainerIds.length }),
                        success: {
                            render({ data: results }: { data: PromiseSettledResult<AxiosResponse>[] }) {
                                const successCount = results.filter(r => r.status === 'fulfilled').length;
                                const failCount = results.length - successCount;

                                fetchContainers();
                                setRowSelection({});
                                setConfirmDialog(prev => ({ ...prev, isOpen: false }));

                                if (failCount === 0) return t("container.stop.batch.success1", { count: successCount });
                                else return t("container.stop.batch.success2", { s: successCount, f: failCount });
                            }
                        },
                        error: t("container.stop.batch.error")
                    }
                );
            }
        });
    };

    const submitExtendContainer = (containerId: string) => {
        toast.promise(
            api.admin.adminExtendContainer({ container_id: containerId }, createSkipGlobalErrorConfig()),
            {
                pending: t("container.extend.pending"),
                success: { render() { fetchContainers(); return t("container.extend.success"); } },
                error: t("container.extend.error"),
            }
        );
    };

    const handleGetContainerFlag = (containerId: string) => {
        toast.promise(
            api.admin.adminGetContainerFlag({ container_id: containerId }),
            {
                pending: t("container.flag.pending"),
                success: {
                    render({ data: response }: { data: AxiosResponse }) {
                        const flagContent = response.data.data.flag_content;
                        copy(flagContent);
                        return t("container.flag.success")
                    }
                },
                error: t("container.flag.error")
            }
        );
    };

    const getStatusColorAndText = (status: ContainerStatus) => {
        switch (status) {
            case ContainerStatus.ContainerRunning: return { color: "#52C41A", text: t("container.status.running") };
            case ContainerStatus.ContainerStopped: return { color: "#8C8C8C", text: t("container.status.stopped") };
            case ContainerStatus.ContainerStarting: return { color: "#1890FF", text: t("container.status.starting") };
            case ContainerStatus.ContainerError: return { color: "#FF4D4F", text: t("container.status.error") };
            case ContainerStatus.ContainerStopping: return { color: "#FAAD14", text: t("container.status.stopping") };
            case ContainerStatus.ContainerQueueing: return { color: "#722ED1", text: t("container.status.queueing") };
            case ContainerStatus.NoContainer: return { color: "#D9D9D9", text: t("container.status.empty") };
            default: return { color: "#D9D9D9", text: t("container.status.unknow") };
        }
    };

    // 表格列
    const columns: ColumnDef<AdminContainerItem>[] = [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label={t("container.table.select.header")}
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label={t("container.table.select.cell")}
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "TeamName",
            header: t("events.filter.team"),
            cell: ({ row }) => {
                return (
                    <div className="flex gap-2 items-center">
                        {row.original.team_name}
                        <Badge
                            variant="outline"
                            className="text-xs select-none hover:bg-blue/10 hover:border-blue/30 cursor-pointer transition-all duration-200 rounded-md px-2 py-1 font-mono"
                            onClick={() => {
                                copyWithResult(row.original.team_id)
                            }}
                        >
                            #{row.original.team_id}
                        </Badge>
                    </div>
                )
            },
        },
        {
            accessorKey: "ChallengeName",
            header: t("events.filter.challenge"),
            cell: ({ row }) => (
                <div className="flex gap-2 items-center">
                    {row.original.challenge_name}
                    <Badge
                        variant="outline"
                        className="text-xs select-none hover:bg-blue/10 hover:border-blue/30 cursor-pointer transition-all duration-200 rounded-md px-2 py-1 font-mono"
                        onClick={() => {
                            copyWithResult(row.original.challenge_id)
                        }}
                    >
                        #{row.original.challenge_id}
                    </Badge>
                </div>
            ),
        },
        {
            accessorKey: "Status",
            header: t("events.submit.status"),
            cell: ({ row }) => {
                const status = row.original.container_status as ContainerStatus;
                const { color, text } = getStatusColorAndText(status);
                return (
                    <Badge
                        className="capitalize w-[60px] px-[5px] flex justify-center select-none"
                        style={{ backgroundColor: color }}
                    >
                        {text}
                    </Badge>
                )
            },
        },
        {
            accessorKey: "ExpireTime",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t("container.table.expire")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const expireTime = row.original.container_expiretime;
                return <div>{dayjs(expireTime).format('YYYY-MM-DD HH:mm:ss')}{row.original.container_status === ContainerStatus.ContainerRunning ? ` (${dayjs(expireTime).diff(dayjs(), 'minutes')} mins)` : ""}</div>
            },
            sortingFn: (rowA, rowB, _columnId) => {
                const dateA = dayjs(rowA.original.container_expiretime);
                const dateB = dayjs(rowB.original.container_expiretime);
                return dateA.isBefore(dateB) ? -1 : 1;
            }
        },
        {
            accessorKey: "Ports",
            header: t("container.table.ports"),
            cell: ({ row }) => {

                let ports: string[] = []
                if (row.original.container_ports && row.original.container_ports.length > 0) {
                    ports = row.original.container_ports.map(port =>
                        `${port.ip}:${port.port} (${port.port_name})`
                    );
                }

                return (
                    <HoverCard openDelay={100} closeDelay={100}>
                        <HoverCardTrigger asChild>
                            <Button variant="link" className="px-0 py-0 h-auto font-normal select-none">
                                @links
                            </Button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-full p-4">
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold">{t("container.table.ports")}</h4>
                                {ports ? (
                                    <div className="text-sm">
                                        {ports.map((port, index) => (
                                            <div key={index} className="flex items-center py-1 gap-2 border-b border-gray-100 last:border-0">
                                                <span>{port}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 ml-auto"
                                                    onClick={() => {
                                                        copyWithResult(port.split(" ")[0])
                                                    }}
                                                >
                                                    <CopyIcon className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground">{t("container.table.no_port")}</div>
                                )}
                            </div>
                        </HoverCardContent>
                    </HoverCard>
                );
            },
        },
        {
            id: "actions",
            header: t("action"),
            enableHiding: false,
            cell: ({ row }) => {
                const container = row.original;

                return (
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleGetContainerFlag(container.container_id)}
                            data-tooltip-id="my-tooltip"
                            data-tooltip-content={t("container.flag.title")}
                            data-tooltip-place="top"
                        >
                            <span className="sr-only">{t("container.flag.title")}</span>
                            <CopyIcon className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    disabled={container.container_status !== ContainerStatus.ContainerRunning}
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-blue-600"
                                    data-tooltip-id="my-tooltip"
                                    data-tooltip-content={t("container.terminal.title")}
                                    data-tooltip-place="top"
                                >
                                    <span className="sr-only">{t("container.terminal.title")}</span>
                                    <Terminal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="mr-5 p-2 select-none" align="start">
                                <DropdownMenuLabel>{t("container.terminal.select")}</DropdownMenuLabel>
                                <DropdownMenuGroup>
                                    {container.container_name_list?.map((e) => (
                                        <DropdownMenuItem key={e} onClick={() => {
                                            const id = `${container.pod_id}-${e}`;
                                            setTerminals(prev => {
                                                const existing = prev.find(t => t.id === id);
                                                if (existing) {
                                                    // 重新打开已存在的终端
                                                    return prev.map(t => t.id === id ? { ...t, isOpen: true } : t);
                                                }
                                                return [...prev, { id, teamName: container?.team_name ?? "", podName: container?.pod_id ?? "", containerName: e, isOpen: true }];
                                            });
                                        }}>
                                            <Package />
                                            {e}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-600"
                            onClick={() => handleDeleteContainer(container.container_id)}
                            data-tooltip-id="my-tooltip"
                            data-tooltip-content={t("container.stop.stop")}
                            data-tooltip-place="top"
                        >
                            <span className="sr-only">{t("container.stop.stop")}</span>
                            <ZapOff className="h-4 w-4" />
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
                                        copyWithResult(container.container_id)
                                    }}
                                >
                                    <ClipboardList className="h-4 w-4 mr-2" />
                                    {t("container.terminal.copy.id")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => copyWithResult(container.pod_id)}
                                >
                                    <ClipboardList className="h-4 w-4 mr-2" />
                                    {t("container.terminal.copy.pod")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    disabled={container.container_status !== ContainerStatus.ContainerRunning}
                                    onClick={() => submitExtendContainer(container.container_id)}
                                    className="text-blue-600"
                                >
                                    <ClockIcon className="h-4 w-4 mr-2" />
                                    {t("container.extend.title")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    ]

    const fetchContainers = () => {
        const payload: AdminListContainersPayload = {
            game_id: gameId,
            size: pageSize,
            offset: pageSize * curPage,
            challenge_id: challengeID ?? -1,
            show_failed: showFailedContainer
        };
        if (debouncedSearchKeyword.trim()) payload.search = debouncedSearchKeyword.trim();

        api.admin.adminListContainers(payload).then((res: any) => {
            setTotalCount(res.data.total ?? 0);
            setData(res.data.data);
        });
    };

    const handleSearch = (value: string) => setSearchKeyword(value);

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
    });

    React.useEffect(() => {
        table.setPageSize(pageSize);
        fetchContainers();
    }, [curPage, pageSize, gameId, debouncedSearchKeyword, showFailedContainer]);

    return (
        <>
            {/* 渲染多终端 */}
            {terminals.map(t => t.isOpen && (
                <ContainerTerminal
                    key={t.id}
                    teamName={t.teamName}
                    podName={t.podName}
                    containerName={t.containerName}
                    isOpen={t.isOpen}
                    setIsOpen={(open) => {
                        if (!open) setTerminals(prev => prev.map(x => x.id === t.id ? { ...x, isOpen: false } : x));
                    }}
                    setTerminalPod={() => { }}
                    setTerminalContainer={() => { }}
                />
            ))}

            <div className="w-full flex flex-col gap-4">
                <div className="flex items-center justify-end space-x-2 select-none">
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
                <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-2">
                        <Input
                            placeholder={t("events.filter.placeholder")}
                            value={searchKeyword}
                            onChange={(event) => handleSearch(event.target.value)}
                            className="max-w-lg"
                        />
                        <span className="text-xs text-muted-foreground">{t("container.search")}</span>
                    </div>
                    <div className="flex gap-2 ml-auto items-center">
                        <Label className="hover:bg-accent/50 cursor-pointer flex items-start gap-3 rounded-lg border p-[10px] has-[[aria-checked=true]]:border-red-600 has-[[aria-checked=true]]:bg-red-50 dark:has-[[aria-checked=true]]:border-red-900 dark:has-[[aria-checked=true]]:bg-red-950">
                            <Checkbox
                                id="toggle-2"
                                checked={showFailedContainer}
                                onCheckedChange={(e) => {
                                    setShowFailedContainer(e.valueOf() as boolean);
                                }}
                                className="data-[state=checked]:border-red-600 data-[state=checked]:bg-red-600 data-[state=checked]:text-white dark:data-[state=checked]:border-red-700 dark:data-[state=checked]:bg-red-700"
                            />
                            <div className="grid gap-1.5 font-normal">
                                <p className="text-sm leading-none font-medium">
                                    {t("container.show.error")}
                                </p>
                            </div>
                        </Label>
                        <Button
                            variant="destructive"
                            className="select-none"
                            onClick={handleBatchDeleteContainers}
                            disabled={table.getFilteredSelectedRowModel().rows.length === 0}
                        >
                            <ZapOff className="h-4 w-4 mr-2" />
                            {t("container.stop.batch.title", { count: table.getFilteredSelectedRowModel().rows.length })}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    {t("container.show.item")} <ChevronDown />
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
                        <Button variant="outline" size={"icon"} onClick={() => fetchContainers()}>
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
                                        {t("container.empty")}
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
    );
}
