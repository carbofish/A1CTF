import { Button } from "./ui/button"
import { CalendarPlus, CalendarX2, ChevronsLeft, ChevronsRight, Dices, Flag, LayoutList, NotebookTabs, PlugZap, Swords } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion";

import { UserGameSimpleInfo } from 'utils/A1API'
import { api } from "utils/ApiHelper";

import { MacScrollbar } from "mac-scrollbar";
import { useTheme } from "next-themes";

import { isMobile } from 'react-device-detect';
import dayjs from "dayjs";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "components/ui/dropdown-menu"

import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "components/ui/sheet"

import { useGameSwitchContext } from "contexts/GameSwitchContext";
import { useGlobalVariableContext } from "contexts/GlobalVariableContext";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import ImageLoader from "./modules/ImageLoader";
import useSWR from "swr";

export function ChangeGames() {

    const [curIndex, setCurIndex] = useState(0)
    const curIndexRef = useRef(0)
    const boxHeight = useRef(0)
    const [onTransition, setOnTransition] = useState(false)

    const [width, setWidth] = useState<number>(0)

    const { clientConfig } = useGlobalVariableContext()

    const { setIsChangingGame, setCurSwitchingGame, setPosterData } = useGameSwitchContext();

    const handleSwitch = (direction: "up" | "down") => {
        if (direction == "up") {
            setCurIndex(Math.max(0, curIndexRef.current - 1))
            curIndexRef.current = Math.max(0, curIndexRef.current - 1)
        }
        else if (direction == "down") {
            setCurIndex(Math.min(curIndexRef.current + 1, curGames!.length - 1));
            curIndexRef.current = Math.min(curIndexRef.current + 1, curGames!.length - 1)
        }
        setOnTransition(true)
    }

    const { t } = useTranslation("games")

    // 懒加载
    const observerRef = useRef<IntersectionObserver | null>(null);
    const [visibleItems, setVisibleItems] = useState<Record<string, boolean>>({});
    const [loaded, setLoaded] = useState(false)

    const { theme } = useTheme()

    const navigate = useNavigate();

    // 观察器
    const observeItem = (el: HTMLElement, id: string) => {
        if (el && observerRef.current) {
            boxHeight.current = el.clientHeight
            el.dataset.id = id;
            observerRef.current.observe(el);
        }
    };

    const handleWindowSizeChange = () => {
        setWidth(window.innerWidth)
    }

    const { data: curGames = [] } = useSWR<UserGameSimpleInfo[]>(
        "/api/game/list",
        () => api.user.userListGames().then(res => res.data.data.toSorted((a, b) => dayjs(b.start_time).unix() - dayjs(a.start_time).unix()))
    )

    useEffect(() => {
        setWidth(window.innerWidth)
        observerRef.current = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const target = entry.target as HTMLElement;
                const id = target.dataset.id as string;

                if (entry.isIntersecting) {
                    setVisibleItems((prev) => ({
                        ...prev,
                        [id]: true
                    }));
                } else {
                    setVisibleItems((prev) => ({
                        ...prev,
                        [id]: false
                    }));
                }
            }
            );
        },
            {
                // 前后两个都可见，方便动画
                rootMargin: "200px 0px",
            });

        window.addEventListener('resize', handleWindowSizeChange);

        setLoaded(true)

        return () => {
            window.removeEventListener('resize', handleWindowSizeChange);
        }
    }, [])

    const checkTime = (game: UserGameSimpleInfo) => {
        const curTime = dayjs()
        const start = dayjs(game.start_time)
        const end = dayjs(game.end_time)

        if (curTime < start) return -1
        else if (curTime > start && curTime < end) return 0
        else return 1
    }

    const getGameFlag = (game: UserGameSimpleInfo) => {
        switch (checkTime(game)) {
            case -1:
                return "bg-blue-500"
            case 0:
                return "bg-green-500"
            case 1:
                return "bg-red-500"
            default:
                return "bg-purple-500"
        }
    }

    const getGameStatus = (game: UserGameSimpleInfo) => {
        switch (checkTime(game)) {
            case -1:
                return t("game_status_pending")
            case 0:
                return t("game_status_running")
            case 1:
                return t("game_status_ended")
            default:
                return t("game_status_unknow")
        }
    }

    const handleChangeGame = () => {

        const curGame = curGames![curIndex]

        // 预下载海报，防闪
        fetch(curGame.poster || clientConfig.DefaultBGImage).then(res => res.blob())
            .then(blob => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }).then(dataURL => {
                setPosterData(dataURL as string)
                setCurSwitchingGame(curGame)
                setIsChangingGame(true)

                // 动画时间
                setTimeout(() => {
                    navigate(`/games/${curGame.game_id}/info`);
                }, 1800)
            })
    }

    if (!curGames) {
        return (
            <></>
        )
    } else if (curGames.length == 0) return (
        <div className="flex w-full h-full items-center justify-center">
            <span className="text-2xl font-bold">{t("game_nogame")}</span>
        </div>
    )

    return (
        <>
            {/* <LoadingPage visible={loadingPageVisible} screen={false} absolute={true} /> */}
            <div className="w-full h-full relative">

                {(width >= 1050 && !isMobile) ? (
                    <div className="flex items-center h-full pl-[50px] pr-[50px]">
                        <div className="pl-[10px] pt-[10px] pb-[10px] pr-[10px] h-full justify-center min-w-[250px] max-w-[350px] select-none hidden 2xl:flex flex-col ">
                            <div className="flex gap-1 items-center mb-[10px] pl-[20px] pr-[20px]">
                                <Swords size={32} className="transition-colors duration-300" />
                                <span className="text-2xl transition-colors duration-300">{t("game_list")}</span>
                            </div>
                            <MacScrollbar
                                className="p-4"
                                skin={theme == "light" ? "light" : "dark"}
                            >
                                <div className="flex flex-col pl-[15px] pr-[15px] w-full">
                                    {loaded && curGames.map((game, index) => (
                                        <div
                                            className={`flex gap-2 hover:scale-110 hover:bg-foreground/5 rounded-lg pl-[15px] pr-[15px] items-center justify-center transition-all duration-300 h-[50px] ${index == curIndex ? "text-cyan-500" : ""}`} key={`title-${index}`}
                                            onClick={() => {
                                                setOnTransition(true)
                                                setCurIndex(index)
                                                curIndexRef.current = index
                                            }}
                                        >
                                            <Dices size={index == curIndex ? 28 : 20} className="transition-all duration-300 flex-none" />
                                            <div className="flex flex-col gap-1 overflow-hidden w-full">
                                                <span className={`${index == curIndex ? "text-lg" : "text-[16px]"} transition-all duration-300 text-ellipsis overflow-hidden whitespace-nowrap`}>{game.name}</span>
                                                <span className={`mt-[-8px] ${index == curIndex ? "text-[12px]" : "text-[10px]"} transition-all duration-300`}>{game.summary}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </MacScrollbar>
                        </div>
                        {/* <div className="flex-1"></div> */}
                        <div className="h-full flex flex-1 items-center relative">
                            <div className="absolute top-5 left-5 2xl:hidden">
                                <Sheet>
                                    <div className="flex items-center gap-2">
                                        <SheetTrigger asChild>
                                            <Button className="[&_svg]:size-6 w-[52px] h-[52px] z-10" variant="ghost">
                                                <LayoutList />
                                            </Button>
                                        </SheetTrigger>
                                    </div>
                                    <SheetContent side="left" className="py-10 px-5">
                                        {/* <SheetTitle className="hidden" /> */}
                                        <div className="flex gap-1 items-center mb-[10px] pl-[20px] pr-[20px] select-none">
                                            <Swords size={32} className="transition-colors duration-300" />
                                            <span className="text-2xl transition-colors duration-300">{t("game_list")}</span>
                                        </div>
                                        <MacScrollbar
                                            className="select-none"
                                            skin={theme == "light" ? "light" : "dark"}
                                        >
                                            <div className="flex flex-col w-full px-5 pb-10">
                                                {loaded && curGames.map((game, index) => (
                                                    <div
                                                        className={`flex gap-2 hover:scale-110 hover:bg-foreground/5 rounded-lg pl-[15px] pr-[15px] items-center justify-center transition-all duration-300 h-[50px] ${index == curIndex ? "text-cyan-500" : ""}`} key={`title-${index}`}
                                                        onClick={() => {
                                                            setOnTransition(true)
                                                            setCurIndex(index)
                                                            curIndexRef.current = index
                                                        }}
                                                    >
                                                        <Dices size={index == curIndex ? 28 : 20} className="transition-all duration-300 flex-none" />
                                                        <div className="flex flex-col gap-1 overflow-hidden w-full">
                                                            <span className={`${index == curIndex ? "text-lg" : "text-[16px]"} transition-all duration-300 text-ellipsis overflow-hidden whitespace-nowrap`}>{game.name}</span>
                                                            <span className={`mt-[-8px] ${index == curIndex ? "text-[12px]" : "text-[10px]"} transition-all duration-300`}>{game.summary}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </MacScrollbar>
                                    </SheetContent>
                                </Sheet>
                            </div>
                            <div className="w-full flex-col flex-1 justify-center items-center 2xl:gap-6  overflow-hidden flex transition-[gap] duration-300 pt-4 pb-4">
                                {/* <Button variant="ghost" disabled={curIndex == 0} onClick={() => handleSwitch("up")} className="text-lg w-[100px] h-[100px] [&_svg]:size-[80px] hover:scale-110 duration-300 transition-[transform,background] hidden 2xl:flex"><ChevronUp /></Button> */}
                                <div className="aspect-[9/5] w-full flex-shrink max-h-[600px] flex-grow overflow-hidden">
                                    <motion.div className="w-full h-full flex flex-col items-center translate-y-[0px]"
                                        animate={{
                                            translateY: `-${curIndex * boxHeight.current}px`
                                        }}
                                        transition={{
                                            duration: onTransition ? 0.5 : 0,
                                            ease: "easeInOut"
                                        }}
                                        onAnimationComplete={() => {
                                            setOnTransition(false)
                                        }}
                                    >
                                        {loaded && curGames.map((game, index) => (
                                            <div className="aspect-[9/5] w-full flex-shrink max-h-[600px] flex-grow flex-none flex items-center justify-center"
                                                key={`game-${index}`}
                                                ref={(el) => observeItem(el!, index?.toString() || "")}
                                            >
                                                {visibleItems[index.toString()] && (
                                                    <div
                                                        className="transition-colors duration-300 aspect-[9/5] flex-shrink flex-grow max-w-[900px] border-2 border-[#121212] opacity-[1] dark:border-[#ffffff] rounded-[4px] shadow-[0.8em_0.8em_0_0_#121212bb] dark:shadow-[0.8em_0.8em_0_0_#ffffffbb] relative"
                                                    >
                                                        <div className={`transition-[border-color,transform,background] duration-300 absolute border-2 border-[#121212] dark:border-white w-[40%] h-[20%] rounded-[8px] z-10 ${width >= 1200 ? "translate-x-[-25%] translate-y-[-50%]" : "top-2 left-2"}`}>
                                                            <div className="flex max-w-[400px] flex-col w-full h-full pl-6 pr-6 justify-center bg-background/95 dark:bg-background/85 rounded-[8px]">
                                                                <span className="font-bold text-nowrap overflow-hidden text-ellipsis" title={game.name}
                                                                    style={{
                                                                        fontSize: "clamp(10px, 2.3vw, 24px)"
                                                                    }}
                                                                >{game.name}</span>
                                                                <span
                                                                    style={{
                                                                        fontSize: "clamp(6px, 1.8vw, 18px)"
                                                                    }}
                                                                > {game.summary} </span>
                                                            </div>
                                                        </div>
                                                        <div className="absolute top-[10px] select-none right-[10px] backdrop-blur-sm p-1 pl-4 pr-4 z-10 bg-white/30 rounded-2xl flex items-center gap-2">
                                                            <div className={`w-[8px] h-[8px] rounded-full ${getGameFlag(game)}`} /><span className="text-white">{getGameStatus(game)}</span>
                                                        </div>
                                                        <div className="absolute z-10 bottom-5 right-5 rounded-xl flex items-center justify-center shadow-[var(--tw-shadow-colored)_0_0_5px] shadow-foreground border-foreground/80 bg-background/20 backdrop-blur-sm hover:scale-105 transition-transform duration-300"
                                                            onClick={() => {
                                                                handleChangeGame()
                                                            }}
                                                        >
                                                            <div className="flex w-full h-full items-center select-none text-foreground/80 hover:text-cyan-500 justify-center gap-2 pt-3 pb-3 pl-8 pr-8">
                                                                <PlugZap size={35} className="transition-colors duration-300" />
                                                                <span className="text-2xl font-bold transition-colors duration-300">{t("game_join")}</span>
                                                            </div>
                                                        </div>
                                                        <div className="absolute z-10 bottom-5 left-5 rounded-xl flex flex-col items-center justify-center border-foreground/80 bg-background/20 backdrop-blur-sm    transition-transform duration-300 p-2 pl-4 pr-4">
                                                            <span className="font-bold text-green-400" >{dayjs(game.start_time).format("YYYY/MM/DD HH:mm:ss")}</span>
                                                            <span className="font-bold text-red-400" >{dayjs(game.end_time).format("YYYY/MM/DD HH:mm:ss")}</span>
                                                        </div>
                                                        <ImageLoader
                                                            className="select-none object-cover aspect-[9/5]"
                                                            src={game.poster || clientConfig.DefaultBGImage}
                                                            alt="Image"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </motion.div>
                                </div>
                                {/* <Button variant="ghost" disabled={curIndex == curGames.length - 1} onClick={() => handleSwitch("down")} className="text-lg w-[100px] h-[100px] [&_svg]:size-[80px] hover:scale-110 duration-300 transition-[transform,background] hidden 2xl:flex"><ChevronDown /></Button> */}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full pl-5 pb-5 pr-5 pt-4">
                        <div className="w-full h-full flex flex-col gap-2">
                            <div className="flex w-full h-[65px] border-2 rounded-xl backdrop-blur-sm items-center p-[6px] gap-2 shadow-lg transition-[border-color] duration-300">
                                <Button variant="ghost" className="w-[49px] h-[49px] [&_svg]:size-6" onClick={() => { handleSwitch("up") }}><ChevronsLeft /></Button>
                                <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild className="overflow-hidden flex-1 h-full">
                                        <Button variant="ghost" className="w-full h-full">
                                            <span className="text-[1.1em] font-bold text-ellipsis text-nowrap overflow-hidden">{curGames[curIndex].name}</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="backdrop-blur-lg border-foreground/5 rounded-lg mt-[10px] bg-background/30">
                                        <MacScrollbar className="w-full max-h-[50vh] overflow-y-auto p-2 pl-1 pr-3 "
                                            trackStyle={(horizontal) => ({ [horizontal ? "height" : "width"]: 0, borderWidth: 0 })}
                                            skin={theme == "light" ? "light" : "dark"}
                                        // thumbStyle={(horizontal) => ({ [horizontal ? "height" : "width"]: 6})}
                                        >
                                            <div className="flex flex-col gap-2 w-full">
                                                {curGames.map((ele, index) => (
                                                    <div
                                                        className={`flex w-full select-none overflow-hidden h-[48px] gap-2 items-center hover:bg-background/30 p-3 pl-4 pr-4 rounded-lg transition-[background] duration-300 ${curIndex != index ? "text-foreground/40" : ""}`}
                                                        key={`game-${index}`}
                                                        onClick={() => {
                                                            setCurIndex(index)
                                                        }}
                                                    >
                                                        <Flag className={`flex-none transition-all duration-300 ${curIndex == index ? "fill-foreground" : ""}`} size={20} />
                                                        <span className={`overflow-hidden text-ellipsis text-nowrap transition-colors duration-300 font-bold`}>{ele.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </MacScrollbar>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Button variant="ghost" className="w-[49px] h-[49px] [&_svg]:size-6" onClick={() => { handleSwitch("down") }}><ChevronsRight /></Button>
                            </div>
                            <div className="w-full border-2 rounded-xl relative overflow-hidden shadow-lg transition-[border-color] duration-300">
                                <div className="absolute top-2 right-2 backdrop-blur-sm z-20 bg-white/30 rounded-2xl select-none p-1 pl-3 pr-3 flex items-center justify-center gap-2">
                                    <div className={`w-[9px] h-[9px] rounded-full ${getGameFlag(curGames[curIndex])}`}></div>
                                    <span className="text-white">{getGameStatus(curGames[curIndex])}</span>
                                </div>
                                <div className="absolute z-10 bottom-5 right-5 rounded-xl flex items-center justify-center shadow-[var(--tw-shadow-colored)_0_0_5px] shadow-foreground border-foreground/80 bg-background/20 backdrop-blur-sm hover:scale-105 transition-transform duration-300"
                                    onClick={() => {
                                        handleChangeGame()
                                    }}
                                >
                                    <div className="flex w-full h-full items-center select-none text-foreground/80 hover:text-cyan-500 justify-center gap-2 pt-3 pb-3 pl-8 pr-8">
                                        <PlugZap size={35} className="transition-colors duration-300" />
                                        <span className="text-2xl font-bold transition-colors duration-300">{t("game_join")}</span>
                                    </div>
                                </div>
                                <ImageLoader
                                    src={curGames[curIndex].poster || clientConfig.DefaultBGImage}
                                    className="object-contain"
                                    alt="Image"
                                    // layout="responsive"
                                    width={1920}
                                    height={1080}
                                // objectFit="contain"
                                />
                            </div>
                            <div className="w-full border-2 rounded-xl relative overflow-hidden shadow-lg transition-[border-color] duration-300 p-4 pl-7 pr-7">
                                <div className="w-full h-full">
                                    <MacScrollbar className="flex flex-col gap-1 h-full overflow-hidden" skin={theme == "light" ? "light" : "dark"}>
                                        <span className="text-2xl font-bold mb-[5px]">{curGames[curIndex].name}</span>
                                        <div className="flex items-center gap-2">
                                            <NotebookTabs size={22} />
                                            <span className="text-sm font-bold">{curGames[curIndex].summary || t("game_nocontext")}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CalendarPlus size={22} />
                                            <span className="text-sm font-bold">{dayjs(curGames[curIndex].start_time).format("YYYY-MM-DD HH:mm:ss")}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-[5px]">
                                            <CalendarX2 size={22} />
                                            <span className="text-sm font-bold">{dayjs(curGames[curIndex].end_time).format("YYYY-MM-DD HH:mm:ss")}</span>
                                        </div>
                                    </MacScrollbar>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}