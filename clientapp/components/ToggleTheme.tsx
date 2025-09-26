import { useState, useEffect, useMemo } from 'react'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import { Sun, Moon, WandSparkles, MonitorCog, Snail, Rabbit } from 'lucide-react'
import { useSpring, animated } from '@react-spring/web'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "components/ui/dropdown-menu"

import SkyBackground from './SkyBackground'
import { Button } from "components/ui/button"

import React from 'react';
import { useGlobalVariableContext } from 'contexts/GlobalVariableContext';
import { useTranslation } from 'react-i18next';
import { Loader2 } from "lucide-react";

// 记忆化 SkyBackground 组件，防止不必要的重渲染
const MemoizedSkyBackground = React.memo(SkyBackground);

const ThemeSwitcher = (
    { children }: { children?: React.ReactNode }
) => {

    const { clientConfig, updateClientConfg } = useGlobalVariableContext()

    const [mounted, setMounted] = useState(false)
    const { theme, setTheme } = useTheme()
    const { t } = useTranslation()

    const { i18n } = useTranslation()
    const currentLang = i18n.language
    const languages = [
        { code: "zh", label: "简", enabled: true },
        { code: "zh_tw", label: "繁", enabled: false },
        { code: "en", label: "En", enabled: true },
        { code: "ja", label: "日", enabled: false },
    ]

    const [loadingLang, setLoadingLang] = useState<string | null>(null)
    const handleChangeLanguage = async (lng: string) => {
        if (loadingLang || i18n.language === lng) return
        setLoadingLang(lng)
        try {
            await i18n.changeLanguage(lng)
        } finally {
            setLoadingLang(null)
        }
    }

    useEffect(() => {
        setMounted(true)
    }, [])

    // 定义放大动画配置
    const springConfig = {
        tension: 400,
        friction: 20,
        mass: 1
    }

    // 创建四个按钮项的动画状态
    const [themeHovered, _setThemeHovered] = useState(false)
    const [langHovered, setLangHovered] = useState(false)
    const [sysColorHovered, setSysColorHovered] = useState(false)
    const [bgAnimHovered, setBgAnimHovered] = useState(false)

    // 主题切换器的弹簧动画
    const themeSpring = useSpring({
        scale: themeHovered ? 1.05 : 1,
        config: springConfig
    })

    // 语言选择器的弹簧动画
    const langSpring = useSpring({
        scale: langHovered ? 1.05 : 1,
        config: springConfig
    })

    // 系统颜色按钮的弹簧动画
    const sysColorSpring = useSpring({
        scale: sysColorHovered ? 1.05 : 1,
        config: springConfig
    })

    // 背景动画按钮的弹簧动画
    const bgAnimSpring = useSpring({
        scale: bgAnimHovered ? 1.05 : 1,
        config: springConfig
    })

    // 使用 useMemo 记忆化 SkyBackground 的渲染
    const skyBackgroundComponent = useMemo(() => {
        return <MemoizedSkyBackground theme={theme || 'light'} />;
    }, [theme]);

    if (!mounted) {
        return (
            <Button variant="outline" size="icon">
                {/* <WandSparkles className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" /> */}
                <WandSparkles className="absolute h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Toggle theme</span>
            </Button>
        )
    }

    const toggleTheme = () => {
        const body = document.querySelector("body");
        body?.classList.add("background-transition-class");
        setTheme(theme === 'light' ? 'dark' : 'light')
    }
    
    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                { children ? children : (
                    <Button variant="outline" size="icon">
                        {/* <WandSparkles className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" /> */}
                        <WandSparkles className="absolute h-[1.2rem] w-[1.2rem]" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                ) }
            </DropdownMenuTrigger>
            <DropdownMenuContent className='p-6 pr-10 bg-transparent mt-[-10px] w-52 grid gap-[5px] shadow-none mr-4'
                style={{ border: 'none' }}
            >
                <div className="flex justify-left items-center w-full">
                    <div className='flex-col justify-center shadow-md w-44 h-[46px] border-[1.5px] rounded-[12px] overflow-hidden backdrop-blur-md'>
                        <div className="relative w-44 h-11 rounded-[10px] overflow-hidden">
                            {/* 将 SkyBackground 放在动画层之外，避免重新渲染 */}
                            {skyBackgroundComponent}
                            
                            <animated.button
                                className="absolute inset-0 w-full h-full hover:rounded-[0px] 
                                flex items-center justify-center focus:outline-none"
                                onClick={toggleTheme}
                                style={{
                                    ...themeSpring,
                                    transformOrigin: 'center'
                                }}
                            >
                                <motion.div
                                    className="absolute w-8 h-8 rounded-[10px] bg-white shadow-md flex items-center justify-center z-10 opacity-80"
                                    initial={{
                                        x: theme === 'light' ? -64 : 64, // 固定在左侧或右侧
                                        rotate: theme === 'light' ? 0 : 360
                                    }}
                                    animate={{
                                        x: theme === 'light' ? -64 : 64,
                                        rotate: theme === 'light' ? 0 : 360,
                                    }}
                                    transition={{ type: 'spring', stiffness: 450, damping: 90 }}
                                >
                                    {theme === 'light' ? (
                                        <Sun className="w-6 h-6 text-yellow-500" />
                                    ) : (
                                        <Moon className="w-6 h-6 text-blue-500" />
                                    )}
                                </motion.div>
                            </animated.button>
                        </div>
                        <div className='w-full justify-center p-1 hidden lg:flex mt-[0.5px]'>
                            <Button variant="ghost" className="w-full p-2 rounded-[10px]" >
                                <div className='flex justify-between w-full '>
                                    <span className='font-bold'>{t("system_color")}</span>
                                    <MonitorCog />
                                </div>
                            </Button>
                        </div>
                    </div>
                </div>
                <animated.div 
                    className='flex border-[1.5px] rounded-[10px] w-44 shadow-md bg-background/90'
                    style={langSpring}
                    onMouseEnter={() => setLangHovered(true)}
                    onMouseLeave={() => setLangHovered(false)}
                >
                    <div className='flex justify-center w-full gap-1 py-1'>
                        {languages.map(({ code, label, enabled }) => (
                        <Button
                            key={code}
                            variant={currentLang === code ? "default" : "ghost"}
                            size="icon"
                            onClick={() => handleChangeLanguage(code)}
                            disabled={!!loadingLang || !enabled}
                        >
                            {loadingLang === code ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                            <span className='font-bold'>{label}</span>
                            )}
                        </Button>
                        ))}
                    </div>
                </animated.div>
                <animated.div 
                    className='flex border-[1.5px] rounded-[10px] w-44 p-1 shadow-md bg-background/90'
                    style={sysColorSpring}
                    onMouseEnter={() => setSysColorHovered(true)}
                    onMouseLeave={() => setSysColorHovered(false)}
                >
                    <Button variant="ghost" className="w-full p-2" >
                        <div className='flex justify-between w-full items-center'>
                            <span className='font-bold'>{t("system_color")}</span>
                            <MonitorCog />
                        </div>
                    </Button>
                </animated.div>
                {/* <animated.div 
                    className='flex border-[1.5px] rounded-[10px] w-44 p-1 shadow-md bg-background/90'
                    style={bgAnimSpring}
                    onMouseEnter={() => setBgAnimHovered(true)}
                    onMouseLeave={() => setBgAnimHovered(false)}
                >
                    { clientConfig.BGAnimation ? (
                        <Button variant="default" className="w-full p-2" 
                            onClick={() => {
                                updateClientConfg("BGAnimation", false)
                            }}
                        >
                            <div className='flex justify-between w-full items-center'>
                                <span className='font-bold'>{t("disable_background_animation")}</span>
                                <Snail />
                            </div>
                        </Button>
                    ) : (
                        <Button variant="ghost" className="w-full p-2" 
                            onClick={() => {
                                updateClientConfg("BGAnimation", true)
                            }}
                        >
                            <div className='flex justify-between w-full items-center'>
                                <span className='font-bold'>{t("enable_background_animation")}</span>
                                <Rabbit />
                            </div>
                        </Button>
                    ) }
                </animated.div> */}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default React.memo(ThemeSwitcher)
