import { useGameSwitchContext } from "contexts/GameSwitchContext";
import { useTranslation } from 'react-i18next';

import { animated, useTransition } from "@react-spring/web";
import { useCallback } from "react";
import { useGlobalVariableContext } from "contexts/GlobalVariableContext";
import { Flag, LoaderCircle } from "lucide-react";

export default function GameSwitchHover() {

    const { t } = useTranslation()
    const { isChangingGame, curSwitchingGame, posterData } = useGameSwitchContext();
    const { clientConfig } = useGlobalVariableContext();

    const DELAY = 300;

    const transition_for_bg = useTransition(isChangingGame, {
        from: {
            opacity: 0,
        },
        enter: {
            opacity: 1,
            config: { tension: 220, friction: 20, clamp: true }
        },
        leave: [
            { delay: DELAY },
            { 
                opacity: 0,
                config: { tension: 220, friction: 20, clamp: true }
            },
        ],
    });

    const transitions = useTransition(isChangingGame, {
        from: {
            opacity: 0.4,
            backdropFilter: "blur(2px)"
        },
        enter: {
            opacity: 1,
            backdropFilter: "blur(10px)",
            config: { tension: 220, friction: 100, clamp: true }
        },
        leave: [
            { delay: DELAY },
            { 
                opacity: 0, backdropFilter: "blur(0px)",
                config: { tension: 220, friction: 20, clamp: true }
            },
        ],
    });

    const transitions_left_logo = useTransition(isChangingGame, {
        from: {
            opacity: 0,
            y: -8,                 // 数值 spring，用来拼 transform
            scale: 0.98,
            rotate: '0deg'
        },
        enter: [
            { delay: DELAY },        // enter 延迟
            {
                opacity: 1,
                y: 0,
                scale: 1,
                rotate: '10deg',
                config: { tension: 300, friction: 80 }
            }
        ],
        leave: {
            opacity: 0,            // 退出淡化
            y: -8,                 // 轻微上移（也可以改成 x: 12 侧移）
            scale: 0.98,
            rotate: '0deg',
            config: { tension: 280, friction: 22 }  // 更快更干脆
        }
    });

    const pickIconSrc = useCallback((): string | null => {
        if (!curSwitchingGame || !clientConfig) return null;
        const icon = curSwitchingGame.dark_icon ?? clientConfig.SVGIconDark;
        if (!icon) return null;
        return icon
    }, [curSwitchingGame, clientConfig]);

    return <div className="pointer-events-none">
        {transition_for_bg((style, visible) => (
            visible && (
                <animated.div
                    className="absolute top-0 left-0 h-screen w-screen z-40"
                    style={{
                        backgroundImage: `url(${posterData})`,
                        backgroundSize: "cover",
                        opacity: style.opacity,
                    }}
                >
                </animated.div>
            )
        ))}

        {transitions((style, visible) => (
            visible && (
                <animated.div className="absolute top-0 left-0 h-screen w-screen bg-black/70 z-40" style={{
                    opacity: style.opacity,
                    backdropFilter: style.backdropFilter
                }} />
            )
        ))}

        {transitions_left_logo((style, visible) => (
            visible && (
                <animated.div
                    className="absolute top-25 left-25 z-40 flex gap-6 items-center"
                    style={{ opacity: style.opacity }}
                >
                    <animated.div
                        style={{
                            rotate: style.rotate,
                            transform: style.y.to((vy) => `translateY(${vy}px)`) // 顶部旗子
                        }}
                    >
                        <Flag className="w-30 h-30 text-white" />
                    </animated.div>
                    <animated.div
                        className="flex flex-col gap-1"
                        style={{
                            transformOrigin: 'left',
                            transform: style.y.to((vy) => `translateY(${vy}px)`)
                        }}
                    >
                        <span className="text-3xl text-orange-400 font-bold italic">Game</span>
                        <span className="text-5xl text-white font-bold italic ">{curSwitchingGame.name}</span>
                    </animated.div>
                </animated.div>
            )
        ))}

        {transitions_left_logo((style, visible) => (
            visible && (
                <animated.div
                    className="absolute bottom-25 right-25 z-40 flex gap-6 items-center"
                    style={{
                        opacity: style.opacity,
                        transform: style.y.to((vy) => `translateY(${-vy}px)`)
                    }}
                >
                    <animated.div
                        className="flex flex-col gap-1"
                        style={{ transform: style.y.to((vy) => `translateY(${-vy}px)`) }}
                    >
                        <span className="text-3xl text-orange-400 font-bold italic text-right">Description</span>
                        <span className="text-5xl text-white font-bold italic ">{curSwitchingGame.summary?.length ? curSwitchingGame.summary : "看起来这个比赛的主人很懒, 没有留下简介"}</span>
                    </animated.div>
                    <animated.div style={{ transform: style.y.to((vy) => `translateY(${-vy}px)`) }}>
                        <img src={pickIconSrc() ?? ''} className="w-40 h-40" />
                    </animated.div>
                </animated.div>
            )
        ))}

        {transitions_left_logo((style, visible) => (
            visible && (
                <animated.div
                    className="absolute top-25 right-25 z-40 flex gap-3 items-center h-32"
                    style={{ opacity: style.opacity, transform: style.y.to((vy) => `translateY(${vy}px)`) }}
                >
                    <LoaderCircle className="h-10 w-10 text-white animate-spin" />
                    <span className="text-white text-2xl">Loading</span>
                </animated.div>
            )
        ))}
    </div>
}
