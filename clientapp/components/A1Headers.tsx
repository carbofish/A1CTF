import { Button } from "components/ui/button"
import ThemeSwitcher from "components/ToggleTheme"

import { ArrowUpToLine, UserRoundMinus, Settings, Wrench, User } from 'lucide-react'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "components/ui/dropdown-menu"

import { House, Flag, Info, KeyRound } from 'lucide-react'


import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useGlobalVariableContext } from "contexts/GlobalVariableContext";
import { Skeleton } from "./ui/skeleton";
import { toast } from 'react-toastify/unstyled';
import { Link, useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { UserRole } from "utils/A1API"

const PageHeader = () => {

    const { t } = useTranslation()

    const [isOpen, setIsOpen] = useState(false);

    const curPath = useLocation().pathname;

    const { curProfile, checkLoginStatus, unsetLoginStatus } = useGlobalVariableContext()

    let path = useLocation().pathname.split("/")[1];

    if (path == "") { path = "home"; }

    const whetherSelected = (name: string) => {
        return (path == name) ? "default" : "ghost";
    }

    const navigate = useNavigate();

    const { clientConfig, getSystemLogo } = useGlobalVariableContext()

    const handleLoginOut = () => {
        unsetLoginStatus()
        toast.success(t("login_out_success"))
    }

    return (
        <div className="sticky top-0 select-none z-1">
            <div className="flex w-full h-full items-center justify-center">
                <div className="container items-center hidden md:flex pt-3 pb-1">
                    <div className="md:flex items-center">
                        <Link to={``} className="flex-shrink-0">
                            <img
                                src={getSystemLogo()}
                                alt={clientConfig.SVGAltData}
                                width={40}
                                height={40}
                            />
                        </Link>
                        <nav className="flex items-center pl-6 gap-1 text-sm xl:gap-2">
                            <Button variant={whetherSelected("home")} onClick={() => {
                                if (curPath != `/`) navigate(`/`)
                            }}>
                                <House />
                                <span className="font-bold text-base ml-[-2px]">{t("home")}</span>
                            </Button>
                            <Button variant={whetherSelected("games")} onClick={() => {
                                if (curPath != `/games`) navigate(`/games`)
                            }}>
                                <Flag />
                                <span className="font-bold text-base ml-[-2px]">{t("race")}</span>
                            </Button>
                            <Button variant={whetherSelected("about")} onClick={() => {
                                if (curPath != `/about`) navigate(`/about`)
                            }}>
                                <Info />
                                <span className="font-bold text-base ml-[-2px]">{t("about")}</span>
                            </Button>

                            {/* <Button variant={whetherSelected("wp")} onClick={() => {
                                        window.open("https://wp.a1natas.com")
                                }}>
                                    <NotebookText />
                                    <span className="font-bold text-base ml-[-2px]">{t("wp")}</span>
                                </Button> */}
                        </nav>
                    </div>
                    <div className="flex flex-1 items-center justify-between gap-3 md:justify-end">
                        {((curProfile.role == UserRole.ADMIN || curProfile.role == UserRole.MONITOR) && checkLoginStatus()) && (
                            <Button variant={"outline"} onClick={() => {
                                navigate(`/admin/`)
                            }}><Wrench />{t("admin")}</Button>
                        )}
                        <ThemeSwitcher />
                        {checkLoginStatus() ? (
                            <>
                                <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger>
                                        <Avatar className="select-none cursor-pointer">
                                            {curProfile.avatar ? (
                                                <>
                                                    <AvatarImage src={curProfile.avatar || "#"} alt="@shadcn"
                                                        className={`rounded-2xl`}
                                                    />
                                                    <AvatarFallback><Skeleton className="h-full w-full rounded-full" /></AvatarFallback>
                                                </>
                                            ) : (
                                                <div className='w-full h-full bg-foreground/80 flex items-center justify-center rounded-2xl'>
                                                    <span className='text-background text-md'> {curProfile.username?.substring(0, 2)} </span>
                                                </div>
                                            )}
                                        </Avatar>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="mt-2 mr-4">
                                        <DropdownMenuItem onClick={() => navigate(`/profile/basic`)}>
                                            <Settings />
                                            <span>{t("settings")}</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleLoginOut}>
                                            <UserRoundMinus />
                                            <span>{t("login_out")}</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        ) : (
                            <>
                                <Button asChild>
                                    <Link to={`/signup`}>{t("signup")}</Link>
                                </Button>
                                <Button asChild variant="outline">
                                    <Link to={`/login`}>{t("login")}</Link>
                                </Button>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex md:hidden items-center h-full w-full px-5 pt-5">
                    <div className="flex w-full justify-start ml-4">
                        <Link to={`/`} className="flex items-center">
                            <img
                                src={getSystemLogo()}
                                alt={clientConfig.SVGAltData}
                                width={34}
                                height={34}
                            />
                            <span className="font-bold ml-2">{clientConfig.systemName}</span>
                        </Link>
                    </div>
                    <div className="flex justify-end w-full">
                        <ThemeSwitcher />
                        <div className="mr-2"></div>
                        <DropdownMenu onOpenChange={(open) => setIsOpen(open)}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="mr-4" size="icon">
                                    <div
                                        className={`transition-transform duration-300 ${isOpen ? "rotate-180" : "rotate-0"
                                            }`}
                                    >
                                        {isOpen ? <ArrowUpToLine /> : <ArrowUpToLine />}
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="mr-4 mt-2">
                                <div className="flex flex-col gap-1">
                                    <Button variant={whetherSelected("home")} onClick={() => {
                                        if (curPath != `/`) navigate(`/`)
                                    }} >
                                        <House />
                                        <span className="font-bold text-base ml-[-2px]">{t("home")}</span>
                                    </Button>
                                    <Button variant={whetherSelected("games")} onClick={() => {
                                        if (curPath != `/games`) navigate(`/games`)
                                    }}>
                                        <Flag />
                                        <span className="font-bold text-base ml-[-2px]">{t("race")}</span>
                                    </Button>
                                    <Button variant={whetherSelected("about")} onClick={() => {
                                        if (curPath != `/about`) navigate(`/about`)
                                    }}>
                                        <Info />
                                        <span className="font-bold text-base ml-[-2px]">{t("about")}</span>
                                    </Button>

                                    {/* <Button variant={whetherSelected("wp")} onClick={() => {
                                        window.open("https://wp.a1natas.com")
                                    }}>
                                        <NotebookText />
                                        <span className="font-bold text-base ml-[-2px]">{t("wp")}</span>
                                    </Button> */}

                                    <DropdownMenuSeparator />

                                    {checkLoginStatus() ? (
                                        <>
                                            <DropdownMenu modal={false}>
                                                <DropdownMenuTrigger>
                                                    <div className="flex w-full h-full items-center justify-center gap-2 pl-2 pr-2 pb-1">
                                                        <Avatar className="select-none cursor-pointer">
                                                            {curProfile.avatar ? (
                                                                <>
                                                                    <AvatarImage src={curProfile.avatar || "#"} alt="@shadcn"
                                                                        className={`rounded-2xl`}
                                                                    />
                                                                    <AvatarFallback><Skeleton className="h-full w-full rounded-full" /></AvatarFallback>
                                                                </>
                                                            ) : (
                                                                <div className='w-full h-full bg-foreground/80 flex items-center justify-center rounded-2xl'>
                                                                    <span className='text-background text-md'> {curProfile.username?.substring(0, 2)} </span>
                                                                </div>
                                                            )}
                                                        </Avatar>
                                                        <span className="text-md"> {curProfile.username} </span>
                                                    </div>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="mt-2">
                                                    <DropdownMenuItem onClick={() => navigate(`/profile/basic`)}>
                                                        <Settings />
                                                        <span>{t("settings")}</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={handleLoginOut}>
                                                        <UserRoundMinus />
                                                        <span>{t("login_out")}</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </>
                                    ) : (
                                        <>
                                            <Button asChild variant="ghost" className="mt-[0.5px]">
                                                <Link to={`/login`}>
                                                    <KeyRound /><span className="font-bold">{t("login")}</span>
                                                </Link>
                                            </Button>
                                            <Button asChild variant="ghost" className="mt-[0.5px] [&_svg]:size-[18px]">
                                                <Link to={`/signup`}>
                                                    <User /><span className="font-bold">{t("signup")}</span>
                                                </Link>
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PageHeader