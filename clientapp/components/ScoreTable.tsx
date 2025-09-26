import { Award, Flag, Medal, Tag } from "lucide-react";
import { MacScrollbar } from "mac-scrollbar";
import { useTheme } from "next-themes";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import dayjs from "dayjs";

import ReactDOMServer from 'react-dom/server';
import { GameScoreboardData, PaginationInfo, TeamScore, UserSimpleGameChallenge } from "utils/A1API";
import AvatarUsername from "./modules/AvatarUsername";
import { challengeCategoryIcons } from "utils/ClientAssets";
import { useTranslation } from "react-i18next";
import { Badge } from "./ui/badge";
import ScrollingText from "./modules/ScrollingText";

export function ScoreTable(
    {
        scoreBoardModel,
        setShowUserDetail,
        challenges,
        showGroupTags,
        pageSize: _pageSize,
        pagination,
        curPage,
        setCurPage,
        isLoading
    }: {
        scoreBoardModel: GameScoreboardData,
        setShowUserDetail: Dispatch<SetStateAction<TeamScore>>,
        challenges: Record<string, UserSimpleGameChallenge[]>,
        pageSize: number,
        pagination: PaginationInfo | undefined,
        curPage: number,
        showGroupTags: boolean,
        setCurPage: Dispatch<SetStateAction<number>>,
        isLoading: boolean
    }
) {

    const tableRef = useRef<HTMLDivElement | null>(null)
    const isUserEditing = useRef<boolean>(false)

    const [containerWidth, setContainerWidth] = useState(0)
    const [jumpPage, setJumpPage] = useState(1)

    const { theme } = useTheme()
    const { t } = useTranslation("game_view")

    const [curPageData, setCurPageData] = useState<TeamScore[]>([])
    // const [curPage, setCurPage] = useState(1)
    const [totalPage, setTotalPage] = useState(0)

    // 计算总列数
    const totalColumns = Object.values(challenges).reduce((sum, challengeList) => sum + challengeList.length, 0)
    const fixedColumnWidth = 120 // w-24 对应 96px
    const totalFixedWidth = totalColumns * fixedColumnWidth

    // 判断是否需要添加空白列和计算空白列宽度
    const shouldAddBlankColumn = containerWidth > 0 && totalFixedWidth < containerWidth
    const blankColumnWidth = shouldAddBlankColumn ? containerWidth - totalFixedWidth : 0

    useEffect(() => {
        if (pagination) {
            setCurPage(pagination.current_page)
            setTotalPage(pagination.total_pages)
            // 仅当用户不在编辑状态时更新跳转页码
            if (!isUserEditing.current) {
                setJumpPage(pagination.current_page)
            }
        }
    }, [pagination])

    // 当当前页码变化时，更新跳转页码
    useEffect(() => {
        // 仅当用户不在编辑状态时更新跳转页码
        if (!isUserEditing.current) {
            setJumpPage(curPage);
        }
    }, [curPage]);

    const handleChangeView = () => {
        setContainerWidth(tableRef.current?.parentElement?.clientWidth || 0)
    }

    useEffect(() => {

        setCurPageData(scoreBoardModel.teams || [])

        window.addEventListener("resize", handleChangeView)

        // 初始化容器宽度
        setTimeout(() => {
            if (tableRef.current?.parentElement) {
                setContainerWidth(tableRef.current.parentElement.clientWidth)
            }
        }, 100)

        return () => {
            window.removeEventListener("resize", handleChangeView)
        }
    }, [scoreBoardModel])

    // useEffect(() => {
    //     setTotalPage(Math.ceil(scoreboardItems.length / pageSize))
    //     const curPageStart = pageSize * (curPage - 1)
    //     const pageData: TeamScore[] = [];

    //     for (let i = curPageStart; i < Math.min(curPageStart + pageSize, scoreboardItems.length); i++) {
    //         pageData.push(scoreboardItems[i])
    //     }

    //     setCurPageData(pageData)
    // }, [scoreboardItems, curPage, pageSize])


    const getRankIcon = (rank: number) => {
        if (rank == 1) return (<Medal className="stroke-[#FFB02E]" />)
        else if (rank == 2) return (<Medal className="stroke-[#BEBEBE]" />)
        else if (rank == 3) return (<Medal className="stroke-[#D3883E]" />)
        else return (
            <span>{rank}</span>
        )
    }

    const getSolveStatus = (challenge: UserSimpleGameChallenge, target: TeamScore) => {
        if (!target) return (<></>)

        const targetChallenge = target.solved_challenges?.find((e) => e.challenge_id == challenge.challenge_id)


        if (targetChallenge) {

            const cardView = ReactDOMServer.renderToStaticMarkup(
                <div className="flex flex-col text-[12px]">
                    <span>{target.team_name}</span>
                    <span>{challenge.challenge_name}</span>
                    <span>{dayjs(targetChallenge.solve_time).format("YYYY-MM-DD HH:mm:ss")}</span>
                    <span className="text-green-300">+ {challenge.cur_score} pts</span>
                    {(targetChallenge.rank ?? 4) <= 3 && challenge.cur_score != targetChallenge.score && (
                        <div className='flex overflow-hidden'>
                            <span className='text-amber-500'> + {(targetChallenge.score ?? 0) - challenge.cur_score} pts for rank {targetChallenge.rank}</span>
                        </div>
                    )}
                </div>
            )

            if (targetChallenge.rank == 1) {
                return (
                    <span
                        data-tooltip-id="challengeTooltip"
                        data-tooltip-html={cardView}
                    >
                        <Award className="stroke-[#FFB02E]" />
                    </span>
                )
            } else if (targetChallenge.rank == 2) {
                return (
                    <span
                        data-tooltip-id="challengeTooltip"
                        data-tooltip-html={cardView}
                    ><Award className="stroke-[#BEBEBE]" /></span>
                )
            } else if (targetChallenge.rank == 3) {
                return (
                    <span
                        data-tooltip-id="challengeTooltip"
                        data-tooltip-html={cardView}
                    ><Award className="stroke-[#D3883E]" /></span>
                )
            } else {
                return (
                    <span
                        data-tooltip-id="challengeTooltip"
                        data-tooltip-html={cardView}
                    ><Flag className="stroke-green-600" /></span>
                )
            }
        } else {
            return (<></>)
        }
    }

    // 移除之前的动态宽度计算函数，现在所有列都使用固定宽度
    // getCategoryWidth 和 getChallengeColumnWidth 函数不再需要

    // if (!pageLines) return (<></>)

    // 处理页码变化
    const handlePageChange = (page: number) => {
        setCurPage(page);
        isUserEditing.current = false;
    };

    // 处理页面跳转
    const handleJumpPage = () => {
        if (jumpPage >= 1 && jumpPage <= totalPage) {
            setCurPage(jumpPage);
            isUserEditing.current = false;
        }
    }

    return (
        (!isLoading && curPageData && !curPageData[0]) ? 
         <div className="w-full h-full items-center justify-center flex gap-2 pb-10">
            <span className="font-bold text-2xl">{t("scoreboard.empty_data")}</span>
        </div>
         : 
        <div className="flex flex-col w-full h-full gap-4 pt-4">
            <div className="flex w-full flex-1 overflow-hidden relative">
                {/* 加载动画 - 放在表格内容上方 */}
                {isLoading && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-10">
                        <div className="flex flex-col items-center gap-3 bg-background/80 p-6 rounded-lg shadow-lg">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                            <span className="text-sm font-medium text-foreground">{t("loading")}</span>
                        </div>
                    </div>
                )}

                <div id="left-container" className="min-w-[300px] max-w-[25vw] flex-none overflow-hidden">
                    <div className="flex flex-col overflow-hidden">
                        <div className={`w-full border-b-2 h-12 border-t-2 transition-[border-color] duration-300 flex items-center justify-center`}>
                            {/* <span className="font-bold">Username</span> */}
                        </div>
                        <div className={`w-full border-b-2 h-12 transition-[border-color] duration-300 flex items-center justify-center`}>
                            <span className="font-bold">{t("scoreboard.participant")}</span>
                        </div>
                        {curPageData[0] && curPageData.map((item, index) => (
                            <div className={`w-full border-b-2 transition-[border-color] duration-300 h-12 flex items-center justify-center pl-6 pr-6`} key={`name-${index}`}>
                                <div className="flex w-full gap-2 overflow-hidden items-center">
                                    <div className="flex items-center">
                                        <div className="w-[40px] flex-none flex justify-center select-none">
                                            {getRankIcon(item.rank || 0)}
                                        </div>
                                        <AvatarUsername avatar_url={item.team_avatar} username={item.team_name ?? ""} size={32} fontSize={14} />
                                    </div>
                                    <div className="flex-1 overflow-hidden select-none flex gap-2 items-center">
                                        <a className="text-nowrap min-w-[25%] text-ellipsis overflow-hidden hover:underline focus:underline" data-tooltip-id="challengeTooltip" data-tooltip-html={`<div class='text-sm'>${item.team_name} - ${item.score} pts</div>`}
                                            onClick={() => {
                                                setShowUserDetail(item || {})
                                            }}
                                        >{item.team_name}</a>
                                        { item.group_id && showGroupTags && (
                                            <Badge 
                                                className="text-xs p-0 px-1 bg-primary/10 overflow-hidden hover:bg-primary/10 text-primary font-medium select-none flex gap-1 items-center"
                                                data-tooltip-id="challengeTooltip" 
                                                data-tooltip-html={`<div class='text-sm'>${item.group_name}</div>`}
                                            >
                                                <Tag size={14} />
                                                <ScrollingText text={item.group_name ?? "None"} speed={10} fade={5} leftScroll={3} rightScroll={5} />
                                            </Badge>
                                        ) }
                                    </div>
                                    <div className="justify-end gap-1 hidden lg:flex">
                                        <span>{item.score}</span>
                                        <span className="text-gray-500">pts</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex w-full overflow-hidden">
                    <div className="w-full h-full" >
                        <MacScrollbar className="flex flex-1 h-full overflow-x-auto pb-[18px]" suppressScrollY
                            skin={theme == "light" ? "light" : "dark"}
                        >
                            <div className="flex" ref={tableRef}>
                                {Object.keys(challenges).map((key, index) => (
                                    <div className="flex flex-col" key={`cate-${index}`} >
                                        <div className={`h-12 border-t-2 border-b-2 flex items-center justify-center flex-none ${index != Object.keys(challenges).length - 1 ? "border-r-2" : ""}`}
                                            style={{ width: `${fixedColumnWidth * challenges[key].length}px` }}
                                        >
                                            <div className="flex gap-2 items-center">
                                                {challengeCategoryIcons[key]}
                                                <span className="font-bold">{key}</span>
                                            </div>
                                        </div>
                                        <div className="flex">
                                            {challenges[key].map((challenge, idx1) => (
                                                <div className="flex flex-col h-full flex-shrink-0" key={`col-${idx1}`}
                                                    style={{ width: `${fixedColumnWidth}px` }}
                                                >
                                                    <div className={`flex w-full h-12 border-b-2 transition-[border-color] duration-300 items-center justify-center flex-shrink-0 pl-2 pr-2`} >
                                                        <span className="select-none text-nowrap text-ellipsis overflow-hidden font-bold" data-tooltip-id="challengeTooltip" data-tooltip-html={`<div class='text-sm'>${challenge.challenge_name}</div>`}>{challenge.challenge_name}</span>
                                                    </div>
                                                    {curPageData[0] && curPageData.map((item, idx2) => (
                                                        <div className={`flex w-full h-12 border-b-2 transition-[border-color] duration-300 items-center justify-center flex-shrink-0`} key={`item-${idx2}`} >
                                                            {getSolveStatus(challenge, item)}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {/* 添加空白列填充剩余宽度 */}
                                {shouldAddBlankColumn && (
                                    <div className="flex flex-col" key="blank-column">
                                        <div className="h-12 border-t-2 border-b-2 flex items-center justify-center flex-none"
                                            style={{ width: `${blankColumnWidth}px` }}
                                        >
                                            {/* 空白表头 */}
                                        </div>
                                        <div className="flex">
                                            <div className="flex flex-col h-full flex-shrink-0" style={{ width: `${blankColumnWidth}px` }}>
                                                <div className="flex w-full h-12 border-b-2 transition-[border-color] duration-300 items-center justify-center flex-shrink-0">
                                                    {/* 空白挑战标题 */}
                                                </div>
                                                {curPageData[0] && curPageData.map((item, idx) => (
                                                    <div className="flex w-full h-12 border-b-2 transition-[border-color] duration-300 items-center justify-center flex-shrink-0" key={`blank-${idx}`}>
                                                        {/* 空白单元格 */}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </MacScrollbar>
                    </div>
                </div>
            </div>
            <div className="flex w-full items-center justify-center gap-2 select-none mt-4 mb-2 flex-wrap">
                {/* 上一页按钮 */}
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { handlePageChange(Math.max(1, curPage - 1)) }}
                    disabled={curPage === 1 || isLoading}
                    className="hidden sm:flex items-center gap-1"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6" /></svg>
                    {t("scoreboard.prev_page")}
                </Button>
                <Button
                    size="icon"
                    variant="outline"
                    onClick={() => { handlePageChange(Math.max(1, curPage - 1)) }}
                    disabled={curPage === 1 || isLoading}
                    className="sm:hidden"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6" /></svg>
                </Button>

                {/* 页码按钮 */}
                <div className="flex items-center gap-1">
                    {totalPage > 7 ? (
                        <>
                            <Button size={"icon"} variant={curPage == 1 ? "default" : "ghost"} onClick={() => { handlePageChange(1) }} disabled={isLoading}>1</Button>
                            {curPage > 3 ? (
                                <>
                                    <span className="px-1">…</span>
                                    {curPage <= totalPage - 4 ? (
                                        <>
                                            <Button size={"icon"} variant="ghost" onClick={() => { handlePageChange(curPage - 1) }} disabled={isLoading}>{curPage - 1}</Button>
                                            <Button size={"icon"} variant="default" onClick={() => { handlePageChange(curPage) }} disabled={isLoading}>{curPage}</Button>
                                            <Button size={"icon"} variant="ghost" onClick={() => { handlePageChange(curPage + 1) }} disabled={isLoading}>{curPage + 1}</Button>
                                        </>
                                    ) : (
                                        <></>
                                    )}
                                </>
                            ) : (
                                <>
                                    <Button size={"icon"} variant={curPage == 2 ? "default" : "ghost"} onClick={() => { handlePageChange(2) }} disabled={isLoading}>2</Button>
                                    <Button size={"icon"} variant={curPage == 3 ? "default" : "ghost"} onClick={() => { handlePageChange(3) }} disabled={isLoading}>3</Button>
                                    <Button size={"icon"} variant={curPage == 4 ? "default" : "ghost"} onClick={() => { handlePageChange(4) }} disabled={isLoading}>4</Button>
                                    <Button size={"icon"} variant={curPage == 5 ? "default" : "ghost"} onClick={() => { handlePageChange(5) }} disabled={isLoading}>5</Button>
                                </>
                            )}

                            {curPage <= totalPage - 4 ? (
                                <>
                                    <span className="px-1">…</span>
                                    <Button size={"icon"} variant="ghost" onClick={() => { handlePageChange(totalPage) }} disabled={isLoading}>{totalPage}</Button>
                                </>
                            ) : (
                                <>
                                    <Button size={"icon"} variant={curPage == totalPage - 4 ? "default" : "ghost"} onClick={() => { handlePageChange(totalPage - 4) }} disabled={isLoading}>{totalPage - 4}</Button>
                                    <Button size={"icon"} variant={curPage == totalPage - 3 ? "default" : "ghost"} onClick={() => { handlePageChange(totalPage - 3) }} disabled={isLoading}>{totalPage - 3}</Button>
                                    <Button size={"icon"} variant={curPage == totalPage - 2 ? "default" : "ghost"} onClick={() => { handlePageChange(totalPage - 2) }} disabled={isLoading}>{totalPage - 2}</Button>
                                    <Button size={"icon"} variant={curPage == totalPage - 1 ? "default" : "ghost"} onClick={() => { handlePageChange(totalPage - 1) }} disabled={isLoading}>{totalPage - 1}</Button>
                                    <Button size={"icon"} variant={curPage == totalPage ? "default" : "ghost"} onClick={() => { handlePageChange(totalPage) }} disabled={isLoading}>{totalPage}</Button>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            {totalPage > 0 && Array.from({ length: totalPage }).fill(0).map((e, index) => (
                                <Button size={"icon"} key={`pageX-${index + 1}`} variant={curPage == index + 1 ? "default" : "ghost"} onClick={() => { handlePageChange(index + 1) }} disabled={isLoading}>{index + 1}</Button>
                            ))}
                        </>
                    )}
                </div>

                {/* 下一页按钮 */}
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { handlePageChange(Math.min(totalPage, curPage + 1)) }}
                    disabled={curPage === totalPage || isLoading}
                    className="hidden sm:flex items-center gap-1"
                >
                    {t("scoreboard.next_page")}
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6" /></svg>
                </Button>
                <Button
                    size="icon"
                    variant="outline"
                    onClick={() => { handlePageChange(Math.min(totalPage, curPage + 1)) }}
                    disabled={curPage === totalPage || isLoading}
                    className="sm:hidden"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6" /></svg>
                </Button>

                {/* 跳转到指定页 */}
                {totalPage > 1 && (
                    <div className="flex items-center ml-2 gap-1">
                        <input
                            min="1"
                            max={totalPage}
                            className="w-12 h-8 px-2 text-center rounded-md border border-input bg-background"
                            value={jumpPage}
                            onChange={(e) => {
                                isUserEditing.current = true;
                                setJumpPage(Math.min(Math.max(1, parseInt(e.target.value) || 1), totalPage));
                            }}
                            onBlur={() => {
                                // 如果用户完成编辑但未按回车或点击跳转按钮，保持编辑状态
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isLoading) {
                                    handleJumpPage();
                                }
                            }}
                            disabled={isLoading}
                        />
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2"
                            onClick={handleJumpPage}
                            disabled={isLoading}
                        >
                            {t("scoreboard.jump_page")}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}