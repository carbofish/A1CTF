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

import { ArrowLeft, ArrowRight, ArrowUpDown, ChevronDown, MoreHorizontal, Pencil, KeyIcon, TrashIcon, ClipboardList, RefreshCw } from "lucide-react"

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

import { MacScrollbar } from "mac-scrollbar";
import { Avatar } from "@radix-ui/react-avatar";
import { AvatarFallback, AvatarImage } from "../ui/avatar";
import { Skeleton } from "../ui/skeleton";
import { Badge } from "../ui/badge";
import { AdminListUserItem, UserRole } from "utils/A1API";

import { api } from "utils/ApiHelper";
import useSWR from "swr";
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
import { UserEditDialog } from "../dialogs/UserEditDialog";
import { useTheme } from "next-themes"
import { AxiosResponse } from "axios"
import { copyWithResult } from "utils/ToastUtil"
import copy from "copy-to-clipboard"
import { useTranslation } from "react-i18next"

export type UserModel = {
    id: string,
    Role: UserRole,
    Email: string,
    Username: string,
    StudentID: string,
    RealName: string,
    LastLoginIP: string,
    RegisterIP: string,
    Phone: string,
    Slogan: string,
    Avatar: string | null,
    RegisterTime: string,
    LastLoginTime: string,
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

export function UserManageView() {

    const { t } = useTranslation("user_manage")

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

    const { data: curPageData = [], mutate } = useSWR<AdminListUserItem[]>(
        `/api/admin/user/list?size=${pageSize}&offset=${pageSize * curPage}&search=${debouncedSearchKeyword}`,
        async () => {
            const payload: any = {
                size: pageSize,
                offset: pageSize * curPage,
            }
            if (debouncedSearchKeyword) {
                payload.search = debouncedSearchKeyword
            }
            const res = await api.admin.listUsers(payload)
            setTotalCount(res.data.total || 0)
            return res.data.data
        }
    );

    React.useEffect(() => {
        table.setPageSize(pageSize)
    }, [pageSize])

    const data = React.useMemo<UserModel[]>(() => {
        if (!curPageData) return [];
        return curPageData.map(user => ({
            id: user.user_id,
            Username: user.user_name || "",
            Email: user.email || "",
            Role: user.role,
            RealName: user.real_name || "",
            StudentID: user.student_id || "",
            LastLoginIP: user.last_login_ip || "",
            RegisterIP: user.register_ip || "",
            Phone: user.phone || "",
            Slogan: user.slogan || "",
            Avatar: user.avatar || null,
            RegisterTime: user.register_time,
            LastLoginTime: user.last_login_time
        }))
    }, [curPageData])


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

    // 处理用户删除
    const handleDeleteUser = (userId: string) => {
        setConfirmDialog({
            isOpen: true,
            title: t("delete.title"),
            description: t("delete.description"),
            onConfirm: () => {
                // 临时修复 API 类型问题
                const deleteUserApi = api.admin as any;
                toast.promise(
                    deleteUserApi.adminDeleteUser({ user_id: userId }),
                    {
                        pending: t("delete.pending"),
                        success: {
                            render() {
                                mutate() // 刷新数据
                                setConfirmDialog(prev => ({ ...prev, isOpen: false }))
                                return t("delete.success")
                            }
                        },
                        error: t("delete.failed")
                    }
                );
            }
        });
    };

    // 处理重置密码
    const handleResetPassword = (userId: string) => {
        setConfirmDialog({
            isOpen: true,
            title: t("reset.title"),
            description: t("reset.description"),
            onConfirm: () => {
                // 临时修复 API 类型问题
                toast.promise(
                    api.admin.adminResetUserPassword({ user_id: userId }),
                    {
                        pending: t("reset.pending"),
                        success: {
                            render({ data: response }: { data: AxiosResponse }) {
                                setConfirmDialog(prev => ({ ...prev, isOpen: false }))
                                // 复制新密码
                                copy(response.data.new_password)
                                return t("reset.success", { pwd: response.data.new_password })
                            }
                        },
                        error: t("reset.error")
                    }
                );
            }
        });
    };

    // 获取角色对应的颜色和中文显示
    const getRoleColorAndText = (role: UserRole) => {
        switch (role) {
            case UserRole.ADMIN:
                return { color: "#FF4D4F", text: t("role.admin") };
            case UserRole.MONITOR:
                return { color: "#1890FF", text: t("role.monitor") };
            case UserRole.USER:
                return { color: "#52C41A", text: t("role.user") };
            default:
                return { color: "#D9D9D9", text: t("role.unknow") };
        }
    };

    const columns: ColumnDef<UserModel>[] = [
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
            accessorKey: "Username",
            header: t("username"),
            cell: ({ row }) => {
                const avatar_url = row.original.Avatar;

                return (
                    <div className="flex gap-3 items-center">
                        <Avatar className="select-none w-[35px] h-[35px]">
                            {avatar_url ? (
                                <>
                                    <AvatarImage src={avatar_url || "#"} alt="@shadcn"
                                        className={`rounded-2xl`}
                                    />
                                    <AvatarFallback><Skeleton className="h-full w-full rounded-full" /></AvatarFallback>
                                </>
                            ) : (
                                <div className='w-full h-full bg-foreground/80 flex items-center justify-center rounded-2xl'>
                                    <span className='text-background text-md'> {(row.getValue("Username") as string).substring(0, 2)} </span>
                                </div>
                            )}
                        </Avatar>
                        {row.getValue("Username")}
                    </div>
                )
            },
        },
        {
            accessorKey: "Role",
            header: t("role.title"),
            cell: ({ row }) => {
                const role = row.getValue("Role") as UserRole;
                const { color, text } = getRoleColorAndText(role);
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
            accessorKey: "Email",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t("email")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="lowercase">{row.getValue("Email")}</div>,
        },
        {
            accessorKey: "RegisterIP",
            header: t("register_ip"),
            cell: ({ row }) => (
                <div>{row.getValue("RegisterIP")}</div>
            ),
        },
        {
            accessorKey: "LastLoginIP",
            header: t("last_ip"),
            cell: ({ row }) => (
                <div>{row.getValue("LastLoginIP")}</div>
            ),
        },
        {
            accessorKey: "RealName",
            header: t("realname"),
            cell: ({ row }) => (
                <div>{row.getValue("RealName")}</div>
            ),
        },
        {
            accessorKey: "StudentID",
            header: t("student_id"),
            cell: ({ row }) => (
                <div>{row.getValue("StudentID")}</div>
            ),
        },
        {
            id: "actions",
            header: t("actions.title"),
            enableHiding: false,
            cell: ({ row }) => {
                const user = row.original;
                const userItem = curPageData.find(u => u.user_id === user.id);

                if (!userItem) return null;

                return (
                    <div className="flex gap-2">
                        <UserEditDialog user={userItem} updateUsers={mutate}>
                            <Button variant="ghost" className="h-8 w-8 p-0" title={t("edit.title")}>
                                <span className="sr-only">{t("actions.edit")}</span>
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </UserEditDialog>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">{t("actions.open")}</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" >
                                <DropdownMenuLabel>{t("actions.title")}</DropdownMenuLabel>
                                <DropdownMenuItem
                                    onClick={() => copyWithResult(user.id)}
                                >
                                    <ClipboardList className="h-4 w-4 mr-2" />
                                    {t("actions.copy")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleResetPassword(user.id)}
                                    className="text-amber-600"
                                >
                                    <KeyIcon className="h-4 w-4 mr-2" />
                                    {t("actions.reset")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="text-red-600"
                                >
                                    <TrashIcon className="h-4 w-4 mr-2" />
                                    {t("actions.delete")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    ]

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

    const { theme } = useTheme()

    return (
        <MacScrollbar className="overflow-hidden w-full"
            skin={theme == "light" ? "light" : "dark"}
        >
            <div className="w-full flex justify-center pb-10 pt-4">
                <div className="w-[80%]">
                    <div className="flex items-center justify-end space-x-2 select-none">
                        <div className="flex-1 text-sm text-muted-foreground flex items-center">
                            {table.getFilteredSelectedRowModel().rows.length} /
                            {" " + t("actions.choose", { count: table.getFilteredRowModel().rows.length })}
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
                    <div className="flex items-center py-4 gap-2">
                        <div className="flex flex-col gap-2">
                            <Input
                                placeholder={t("search.title")}
                                value={searchKeyword}
                                onChange={(event) => handleSearch(event.target.value)}
                                className="max-w-md"
                            />
                            <span className="text-xs text-muted-foreground">{t("search.description")}</span>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="ml-auto">
                                    {t("search.row")} <ChevronDown />
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
                        <Button variant="outline" size={"icon"} onClick={() => mutate()}>
                            <RefreshCw />
                        </Button>
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
                                            {t("search.empty")}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                description={confirmDialog.description}
            />
        </MacScrollbar>
    )
}