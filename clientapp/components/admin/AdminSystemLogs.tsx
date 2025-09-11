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

import { ArrowLeft, ArrowRight, ArrowUpDown, ChevronDown, MoreHorizontal, Filter, Search, RefreshCw, AlertTriangle, CheckCircle, XCircle, ScanEye } from "lucide-react"

import useSWR from "swr"
import * as React from "react"

import { Button } from "components/ui/button"
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

import { MacScrollbar } from "mac-scrollbar";
import { Skeleton } from "../ui/skeleton";
import { Badge } from "../ui/badge";
import { SystemLogItem, LogCategory, SystemLogStats } from "utils/A1API";

import { api } from "utils/ApiHelper";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "components/ui/card";
import { useTheme } from "next-themes"
import EditorDialog from "components/modules/EditorDialog"
import { copyWithResult } from "utils/ToastUtil"
import { useTranslation } from "react-i18next"

interface LogTableRow {
    id: string;
    category: LogCategory;
    username: string | null;
    action: string;
    resource_type: string;
    resource_id: string | null;
    status: string;
    ip_address: string | null;
    create_time: string;
    details: any;
    full_data: any;
    error_message: string | null;
}

export function AdminSystemLogs() {

    const { t } = useTranslation("logs")

    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    const [pageSize, _setPageSize] = React.useState(20);
    const [curPage, setCurPage] = React.useState(0);
    const [searchKeyword, setSearchKeyword] = React.useState("");
    const [debouncedSearchKeyword, setDebouncedSearchKeyword] = React.useState("");

    // 筛选条件
    const [categoryFilter, setCategoryFilter] = React.useState<LogCategory | "">("");
    const [statusFilter, setStatusFilter] = React.useState<string>("");

    // 使用SWR获取日志数据
    const { data: logsData, isLoading, mutate: fetchLogs } = useSWR(
        `/api/admin/system/logs?offset=${curPage * pageSize}&size=${pageSize}&keyword=${debouncedSearchKeyword}&category=${categoryFilter}&status=${statusFilter}`,
        async () => {
            const params: any = {
                offset: curPage * pageSize,
                size: pageSize,
            }
            if (debouncedSearchKeyword !== "") {
                params.keyword = debouncedSearchKeyword
            }
            if (categoryFilter !== "") {
                params.category = categoryFilter
            }
            if (statusFilter !== "") {
                params.status = statusFilter
            }
            const res = await api.admin.adminGetSystemLogs(params)
            return res.data.data
        }
    );

    // 转换后的表格数据
    const data = React.useMemo(() => {
        if (!logsData) return [];
        return logsData.logs.map((log: SystemLogItem) => ({
            id: log.log_id.toString(),
            category: log.log_category,
            username: log.username ?? null,
            action: log.action,
            resource_type: log.resource_type,
            resource_id: log.resource_id ?? null,
            status: log.status,
            full_data: log,
            ip_address: log.ip_address ?? null,
            create_time: log.create_time,
            details: log.details,
            error_message: log.error_message ?? null,
        }));
    }, [logsData]);

    // 总数
    const totalCount = logsData?.total || 0;

    // 使用SWR获取统计信息
    const { data: stats, mutate: fetchStats } = useSWR<SystemLogStats>(
        '/api/admin/system/logs/stats',
        () => api.admin.adminGetSystemLogStats().then(res => res.data.data)
    );

    // 防抖处理搜索关键词
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchKeyword(searchKeyword);
            setCurPage(0);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchKeyword]);

    // 获取状态对应的颜色和图标
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "SUCCESS":
                return (
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {t("success")}
                    </Badge>
                );
            case "FAILED":
                return (
                    <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" />
                        {t("failed")}
                    </Badge>
                );
            case "WARNING":
                return (
                    <Badge variant="outline" className="border-yellow-300 text-yellow-800">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {t("warning")}
                    </Badge>
                );
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    // 获取类别对应的颜色
    const getCategoryBadge = (category: LogCategory) => {
        const categoryMap = {
            ADMIN: { color: "bg-red-100 text-red-800 border-red-300", text: t("admin") },
            USER: { color: "bg-blue-100 text-blue-800 border-blue-300", text: t("user") },
            SYSTEM: { color: "bg-gray-100 text-gray-800 border-gray-300", text: t("system") },
            CONTAINER: { color: "bg-purple-100 text-purple-800 border-purple-300", text: t("container") },
            JUDGE: { color: "bg-orange-100 text-orange-800 border-orange-300", text: t("judge") },
            SECURITY: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", text: t("security") },
        };

        const config = categoryMap[category] || { color: "bg-gray-100 text-gray-800", text: category };
        return (
            <Badge variant="outline" className={config.color}>
                {config.text}
            </Badge>
        );
    };

    // 表格列定义
    const columns: ColumnDef<LogTableRow>[] = [
        {
            accessorKey: "category",
            header: t("category"),
            cell: ({ row }) => getCategoryBadge(row.getValue("category")),
        },
        {
            accessorKey: "username",
            header: t("user"),
            cell: ({ row }) => (
                <div className="font-medium">
                    {row.getValue("username") || t("system")}
                </div>
            ),
        },
        {
            accessorKey: "action",
            header: t("action"),
            cell: ({ row }) => (
                <div className="text-sm">
                    <span
                    // data-tooltip-content={row.getValue("action")}
                    // data-tooltip-placement="top"
                    // data-tooltip-id="my-tooltip"
                    >
                        {/* {t(`${row.getValue("action")}`)} */}
                        {row.getValue("action")}
                    </span>

                </div>
            ),
        },
        {
            accessorKey: "resource_type",
            header: t("resource"),
            cell: ({ row }) => (
                <Badge variant="outline">
                    {row.getValue("resource_type")}
                </Badge>
            ),
        },
        {
            accessorKey: "status",
            header: t("status"),
            cell: ({ row }) => getStatusBadge(row.getValue("status")),
        },
        {
            accessorKey: "ip_address",
            header: t("ip"),
            cell: ({ row }) => (
                <div className="font-mono text-sm text-muted-foreground">
                    {row.getValue("ip_address") || "-"}
                </div>
            ),
        },
        {
            accessorKey: "create_time",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="h-8 p-0"
                    >
                        {t("time")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => (
                <div className="text-sm text-muted-foreground">
                    {new Date(row.getValue("create_time")).toLocaleString('zh-CN')}
                </div>
            ),
        },
        {
            id: "actions",
            header: t("action"),
            enableHiding: false,
            cell: ({ row }) => {
                const log = row.original.full_data as unknown as SystemLogItem;

                const containerOperations = (
                    <>
                        <DropdownMenuItem
                            onClick={() => {
                                copyWithResult(log.resource_id || "")
                            }}
                        >
                            {t("copy.container")}
                        </DropdownMenuItem>
                    </>
                )

                const getDetailedLog = () => {
                    const newLog = Object.assign({}, log)
                    const binaryString = atob(newLog.details as any)
                    const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0))
                    const decodedString = new TextDecoder('utf-8').decode(bytes)
                    newLog.details = JSON.parse(decodedString)
                    return JSON.stringify(newLog, null, 4)
                }

                return (
                    <div className="flex gap-2 items-center">
                        <EditorDialog
                            value={getDetailedLog()}
                            onChange={() => { }}
                            language="json"
                            title={t("detail")}
                            options={{
                                readOnly: true,
                                wordWrap: "on"
                            }}
                        >
                            <Button variant="ghost" size="icon" className='cursor-pointer'
                                title={t("detail")}
                            >
                                <ScanEye />
                            </Button>
                        </EditorDialog>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">{t("menu")}</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{t("action")}</DropdownMenuLabel>
                                {log.user_id && (
                                    <DropdownMenuItem
                                        onClick={() => {
                                            copyWithResult(log.user_id || "")
                                        }}
                                    >
                                        {t("copy.user")}
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                    onClick={() => {
                                        const detailsText = atob(log.details as unknown as string);
                                        const bytes = Uint8Array.from(detailsText, c => c.charCodeAt(0))
                                        const decodedString = new TextDecoder('utf-8').decode(bytes);
                                        const detail = JSON.stringify(JSON.parse(decodedString), null, 4);
                                        copyWithResult(detail || "")
                                    }}
                                >
                                    {t("copy.detail")}
                                </DropdownMenuItem>
                                {log.error_message && (
                                    <DropdownMenuItem
                                        onClick={() => {
                                            copyWithResult(log.error_message || "")
                                        }}
                                    >
                                        {t("copy.error")}
                                    </DropdownMenuItem>
                                )}
                                {log.resource_type == "CONTAINER" && containerOperations}
                                <DropdownMenuItem
                                    onClick={() => {
                                        copyWithResult(getDetailedLog())
                                    }}
                                >
                                    {t("copy.raw")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
        },
    ];

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

    const { theme } = useTheme()

    return (
        <MacScrollbar className="w-full h-full" skin={theme == "light" ? "light" : "dark"}>
            <div className="w-full space-y-6 p-10 mb-10">
                {/* 统计卡片 */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t("total")}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.total_logs}</div>
                                <p className="text-xs text-muted-foreground">{t("24h")}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t("success")}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">{stats.success_logs}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t("failed")}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">{stats.failed_logs}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t("admin")}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-purple-600">{stats.admin_logs}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t("user")}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600">{stats.user_logs}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t("security")}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-yellow-600">{stats.security_logs}</div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* 筛选和搜索 */}
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-4 w-[30%]">
                        <Search className="h-6 w-6 text-gray-500 flex-none" />
                        <Input
                            placeholder={t("search")}
                            value={searchKeyword}
                            onChange={(event) => setSearchKeyword(event.target.value)}
                            className="flex-1"
                        />
                    </div>

                    <Select value={categoryFilter} onValueChange={(value) => {
                        if (value == "ALL") {
                            setCategoryFilter("")
                        } else {
                            setCategoryFilter(value as LogCategory | "")
                        }
                    }}>
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder={t("category")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">{t("all_category")}</SelectItem>
                            <SelectItem value="ADMIN">{t("admin")}</SelectItem>
                            <SelectItem value="USER">{t("user")}</SelectItem>
                            <SelectItem value="SYSTEM">{t("system")}</SelectItem>
                            <SelectItem value="CONTAINER">{t("container")}</SelectItem>
                            <SelectItem value="JUDGE">{t("judge")}</SelectItem>
                            <SelectItem value="SECURITY">{t("security")}</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={(value) => {
                        if (value == "ALL") {
                            setStatusFilter("")
                        } else {
                            setStatusFilter(value as LogCategory | "")
                        }
                    }}>
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder={t("status")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">{t("all_status")}</SelectItem>
                            <SelectItem value="SUCCESS">{t("success")}</SelectItem>
                            <SelectItem value="FAILED">{t("failed")}</SelectItem>
                            <SelectItem value="WARNING">{t("warning")}</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        onClick={() => {
                            setCategoryFilter("");
                            setStatusFilter("");
                            setSearchKeyword("");
                        }}
                    >
                        <Filter className="h-4 w-4 mr-2" />
                        {t("clear")}
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => {
                            fetchLogs();
                            fetchStats();
                        }}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        {t("refresh")}
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="ml-auto">
                                {t("row")} <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
                </div>

                {/* 表格 */}
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
                            {isLoading ? (
                                Array.from({ length: pageSize }).map((_, index) => (
                                    <TableRow key={index}>
                                        {columns.map((_, colIndex) => (
                                            <TableCell key={colIndex}>
                                                <Skeleton className="h-4 w-20" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : table.getRowModel().rows?.length ? (
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
                                        {t("empty")}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* 分页 */}
                <div className="flex items-center justify-between space-x-2 py-4">
                    <div className="text-sm text-muted-foreground">
                        {t("page", { count: totalCount, cur: curPage + 1, total: Math.ceil(totalCount / pageSize) })}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurPage(Math.max(0, curPage - 1))}
                            disabled={curPage === 0 || isLoading}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {t("prev")}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurPage(curPage + 1)}
                            disabled={curPage >= Math.ceil(totalCount / pageSize) - 1 || isLoading}
                        >
                            {t("next")}
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </MacScrollbar>
    );
}