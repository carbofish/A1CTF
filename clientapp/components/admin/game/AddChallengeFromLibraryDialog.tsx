import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from 'components/ui/dialog';
import { Input } from 'components/ui/input';
import { ArrowLeft, ArrowRight, ArrowUpDown, CirclePlus, Loader2 } from 'lucide-react';
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'components/ui/table';
import dayjs from 'dayjs';
import { toast } from 'react-toastify/unstyled';
import { useTranslation } from 'react-i18next';
import { api } from 'utils/ApiHelper';
import { ChallengeCategory, UserSimpleGameChallenge } from 'utils/A1API';
import { Button } from 'components/ui/button';
import { Checkbox } from 'components/ui/checkbox';
import { Badge } from 'components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'components/ui/select';
import { Column, ColumnDef, RowSelectionState, SortingState, flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { ChallengeSolveStatus } from 'components/user/game/ChallengesView';

type SearchScope = "name" | "name_desc"

type ChallengeSearchResult = {
    ChallengeID: number,
    Category: ChallengeCategory,
    Name: string,
    Description: string,
    CreateTime: string,
}

// 可选的每页条数
const pageSizeOptions = [5, 10]

export default function AddChallengeFromLibraryDialog(
    { challenges, setChallenges, gameID, isOpen, setIsOpen, setChallengeSolveStatusList }: {
        // 比赛中已有的题目，用于标记「已添加」
        challenges: Record<string, UserSimpleGameChallenge[]>,
        setChallenges: Dispatch<SetStateAction<Record<string, UserSimpleGameChallenge[]>>>,
        gameID: number,
        isOpen: boolean,
        setIsOpen: Dispatch<SetStateAction<boolean>>,
        setChallengeSolveStatusList: Dispatch<SetStateAction<Record<string, ChallengeSolveStatus>>>,
    }
) {
    const { t } = useTranslation("game_edit")

    const [keyword, setKeyword] = useState("")
    const [scope, setScope] = useState<SearchScope>("name_desc")
    const [category, setCategory] = useState<string>("all")
    const [searchResult, setSearchResult] = useState<ChallengeSearchResult[]>([])
    // 勾选状态按题目 ID 记录，翻页、换筛选后仍然保留
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [sorting, setSorting] = useState<SortingState>([])
    const [searching, setSearching] = useState(false)
    const [adding, setAdding] = useState(false)
    // 只采用最后一次搜索请求的结果，避免旧请求覆盖新结果
    const searchSeq = useRef(0)

    // 比赛中已添加的题目 ID
    const addedIds = useMemo(() => {
        const ids = new Set<number>()
        Object.values(challenges ?? {}).forEach((list) => list.forEach((c) => ids.add(c.challenge_id ?? 0)))
        return ids
    }, [challenges])

    // 按类型筛选后的结果（前端筛选）
    const filteredResult = useMemo(() => (
        category === "all" ? searchResult : searchResult.filter((c) => c.Category === category)
    ), [searchResult, category])

    const selectedIds = useMemo(() => (
        Object.keys(rowSelection).filter((id) => rowSelection[id] && !addedIds.has(Number(id))).map(Number)
    ), [rowSelection, addedIds])

    const sortableHeader = (column: Column<ChallengeSearchResult, unknown>, label: string) => (
        <Button
            variant="ghost"
            type="button"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
            {label}
            <ArrowUpDown />
        </Button>
    )

    // 把新加入比赛的题目同步到侧边栏题目列表和解题状态
    const insertChallenge = useCallback((challenge: { challenge_id?: number, challenge_name?: string, category?: ChallengeCategory, total_score?: number, cur_score?: number, solve_count?: number }) => {
        const categoryKey: string = challenge.category?.toLocaleLowerCase() as string
        const newSimpleChallenge: UserSimpleGameChallenge = {
            challenge_id: challenge.challenge_id ?? 0,
            challenge_name: challenge.challenge_name ?? "",
            category: challenge.category || ChallengeCategory.MISC,
            total_score: challenge.total_score ?? 0,
            cur_score: challenge.cur_score ?? 0,
            solve_count: challenge.solve_count || 0,
            visible: false,
        }
        // 插入题目列表
        setChallenges((prev) => ({
            ...prev,
            [categoryKey]: [...(prev[categoryKey] || []), newSimpleChallenge]
        }))
        // 插入题目解题状态列表
        setChallengeSolveStatusList((prev) => ({
            ...prev,
            [challenge.challenge_id || 0]: {
                solved: false,
                solve_count: 0,
                cur_score: 0,
            }
        }))
    }, [setChallenges, setChallengeSolveStatusList])

    // 从勾选中移除指定题目
    const unselect = useCallback((ids: number[]) => {
        setRowSelection((prev) => {
            const next = { ...prev }
            ids.forEach((id) => delete next[String(id)])
            return next
        })
    }, [])

    const handleAddChallenge = useCallback((challengeID: number) => {
        setAdding(true)
        api.admin.addGameChallenge(gameID, challengeID).then((res) => {
            insertChallenge(res.data.data)
            unselect([challengeID])
            toast.success(t("add_challenge_dialog.add_success"))
        }).finally(() => {
            setAdding(false)
        })
    }, [gameID, insertChallenge, unselect, t])

    const handleBatchAddChallenges = useCallback(async () => {
        if (selectedIds.length === 0) {
            toast.error(t("add_challenge_dialog.select_first"))
            return
        }

        setAdding(true)
        let successCount = 0
        let failCount = 0
        const succeeded: number[] = []

        try {
            for (const challengeID of selectedIds) {
                try {
                    const res = await api.admin.addGameChallenge(gameID, challengeID)
                    insertChallenge(res.data.data)
                    succeeded.push(challengeID)
                    successCount++
                } catch {
                    failCount++
                }
            }

            if (successCount > 0) {
                toast.success(failCount > 0
                    ? t("add_challenge_dialog.batch_partial", { success: successCount, fail: failCount })
                    : t("add_challenge_dialog.batch_success", { success: successCount }))
                // 只清掉添加成功的，失败的保留勾选方便重试
                unselect(succeeded)
            } else {
                toast.error(t("add_challenge_dialog.batch_failed"))
            }
        } finally {
            setAdding(false)
        }
    }, [selectedIds, gameID, insertChallenge, unselect, t])

    const columns: ColumnDef<ChallengeSearchResult>[] = [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    // 全选本页时会自动跳过已添加（不可勾选）的题目
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label={t("add_challenge_dialog.select_page")}
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    disabled={!row.getCanSelect()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label={t("add_challenge_dialog.select_row")}
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "ChallengeID",
            header: "ID",
            cell: ({ row }) => <div>{row.original.ChallengeID}</div>,
        },
        {
            accessorKey: "Name",
            header: ({ column }) => sortableHeader(column, t("add_challenge_dialog.column.name")),
            cell: ({ row }) => {
                const data = row.original
                const added = addedIds.has(data.ChallengeID)
                return (
                    <div className="min-w-0 max-w-[40vw]">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate" title={data.Name}>{data.Name}</span>
                            {added && <Badge variant="secondary" className="shrink-0">{t("add_challenge_dialog.added")}</Badge>}
                        </div>
                        {data.Description && (
                            <div className="truncate text-xs text-muted-foreground" title={data.Description}>
                                {data.Description}
                            </div>
                        )}
                    </div>
                )
            },
        },
        {
            accessorKey: "CreateTime",
            header: ({ column }) => sortableHeader(column, t("add_challenge_dialog.column.create_time")),
            cell: ({ row }) => <div className="whitespace-nowrap">{dayjs(row.original.CreateTime).format("YYYY-MM-DD HH:mm")}</div>,
        },
        {
            accessorKey: "Category",
            header: ({ column }) => sortableHeader(column, t("add_challenge_dialog.column.category")),
            cell: ({ row }) => <div>{row.original.Category}</div>,
        },
        {
            id: "Actions",
            header: t("add_challenge_dialog.column.actions"),
            enableHiding: false,
            cell: ({ row }) => {
                const data = row.original
                const added = addedIds.has(data.ChallengeID)
                return (
                    <Button
                        variant={"outline"}
                        size={"sm"}
                        type="button"
                        className="select-none"
                        disabled={added || adding}
                        onClick={() => handleAddChallenge(data.ChallengeID)}
                    ><CirclePlus />{t("add_challenge_dialog.add")}</Button>
                )
            },
        },
    ]

    const table = useReactTable<ChallengeSearchResult>({
        data: filteredResult,
        columns,
        getRowId: (row) => String(row.ChallengeID),
        enableRowSelection: (row) => !addedIds.has(row.original.ChallengeID),
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
        state: {
            rowSelection,
            sorting,
        },
    })

    const performSearch = useCallback((kw: string, sc: SearchScope) => {
        const seq = ++searchSeq.current
        setSearching(true)
        api.admin.searchChallenges({ keyword: kw, scope: sc }).then((res) => {
            if (seq !== searchSeq.current) return
            setSearchResult(res.data.data.map((c) => ({
                ChallengeID: c.challenge_id || 0,
                Category: c.category,
                Name: c.name,
                Description: c.description ?? "",
                CreateTime: c.create_time,
            })))
        }).finally(() => {
            if (seq === searchSeq.current) setSearching(false)
        })
    }, [])

    // 打开弹窗、修改关键词或搜索范围时重新搜索（输入防抖 500ms）
    useEffect(() => {
        if (!isOpen) return
        const timeoutId = setTimeout(() => performSearch(keyword, scope), 500)
        return () => clearTimeout(timeoutId)
    }, [keyword, scope, isOpen, performSearch])

    // 每次打开弹窗恢复默认每页 10 条
    useEffect(() => {
        if (isOpen) table.setPageSize(10)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    return (
        <Dialog open={isOpen} onOpenChange={(status) => {
            setIsOpen(status)
        }}>
            <DialogContent className="w-[80vw] max-w-[80vw] sm:max-w-[80vw] max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader className="select-none">
                    <DialogTitle>{t("add_challenge_dialog.title")}</DialogTitle>
                    <DialogDescription>
                        {t("add_challenge_dialog.description")}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-wrap items-center gap-3 select-none">
                    <Input
                        className="flex-1 min-w-[200px]"
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value)
                            setSearching(true)
                        }}
                        placeholder={scope === "name" ? t("add_challenge_dialog.placeholder_name") : t("add_challenge_dialog.placeholder_name_desc")}
                    />
                    {/* 搜索范围分段按钮 */}
                    <div className="flex rounded-md border p-0.5 gap-0.5">
                        {(["name", "name_desc"] as SearchScope[]).map((sc) => (
                            <Button
                                key={sc}
                                type="button"
                                size="sm"
                                variant={scope === sc ? "default" : "ghost"}
                                className="h-7"
                                onClick={() => setScope(sc)}
                            >
                                {t(`add_challenge_dialog.scope.${sc}`)}
                            </Button>
                        ))}
                    </div>
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("add_challenge_dialog.all_categories")}</SelectItem>
                            {Object.values(ChallengeCategory).map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="rounded-md border relative min-h-[200px]">
                    {searching && (
                        <div className="absolute top-0 left-0 w-full h-full bg-background opacity-95 z-10 flex items-center justify-center">
                            <div className="flex">
                                <Loader2 className="animate-spin" />
                                <span className="font-bold ml-3">{t("add_challenge_dialog.searching")}</span>
                            </div>
                        </div>
                    )}
                    <Table>
                        <TableHeader className="select-none">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        className={row.getCanSelect() ? "" : "opacity-50"}
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
                                        {t("add_challenge_dialog.no_results")}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3 select-none">
                    <div className="flex-1 text-sm text-muted-foreground flex items-center gap-2">
                        <span>{t("add_challenge_dialog.selected_count", { count: selectedIds.length, total: filteredResult.length })}</span>
                        {selectedIds.length > 0 && (
                            <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setRowSelection({})}>
                                {t("add_challenge_dialog.clear_selection")}
                            </Button>
                        )}
                    </div>
                    <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={handleBatchAddChallenges}
                        disabled={selectedIds.length === 0 || adding}
                    >
                        {adding ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("add_challenge_dialog.adding")}
                            </>
                        ) : (
                            t("add_challenge_dialog.batch_add", { count: selectedIds.length })
                        )}
                    </Button>
                    {/* 每页条数切换 */}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <span>{t("add_challenge_dialog.page_size")}</span>
                        {pageSizeOptions.map((size) => (
                            <Button
                                key={size}
                                type="button"
                                size="sm"
                                className="h-7 px-2"
                                variant={table.getState().pagination.pageSize === size ? "default" : "outline"}
                                onClick={() => table.setPageSize(size)}
                            >
                                {size}
                            </Button>
                        ))}
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ArrowLeft />
                    </Button>
                    <div className="text-sm text-muted-foreground">
                        {table.getState().pagination.pageIndex + 1} / {Math.max(table.getPageCount(), 1)}
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <ArrowRight />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

AddChallengeFromLibraryDialog.whyDidYouRender = true
