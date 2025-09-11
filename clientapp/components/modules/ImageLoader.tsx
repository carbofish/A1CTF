import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from 'lib/utils';
import { useSpring, animated } from '@react-spring/web';
import { useTranslation } from 'react-i18next';

const MAX_CACHE = 512
const srcSet = new Set()

const ImageLoader = ({
    src, // 高清图URL
    alt = '',
    className = '',
    width = 1920,
    primaryColor: _primaryColor = "white",
    height = 1080,
    text = true,
    onLoad = () => { },
    style = {},
}: {
    src: string;
    alt?: string;
    className: string;
    width?: number;
    height?: number;
    primaryColor?: string;
    text?: boolean;
    onLoad?: React.ReactEventHandler<HTMLImageElement> | undefined;
    style?: React.CSSProperties;
}) => {

    const { t } = useTranslation()
    const [loaded, setLoaded] = useState(srcSet.has(src));

    // Spring 动画配置
    const fadeSpring = useSpring({
        opacity: loaded ? 0 : 1,
        display: loaded ? 'none' : 'flex',
        config: {
            tension: 120,
            friction: 14,
        },
    });

    useEffect(() => {
        if (srcSet.has(src)) return

        const img = new Image();
        img.src = src;

        img.onload = () => {
            setLoaded(true)
            if (srcSet.size > MAX_CACHE) {
                const first = srcSet.values().next().value;
                srcSet.delete(first);
            }
            srcSet.add(src)
        }

        // 清理函数
        return () => {
            img.onload = null;
        };
    }, [src]);

    return (
        <div
            className={"relative overflow-hidden"}
            style={{
                ...style
            }}
        >
            {/* 低分辨率模糊背景 */}
            <animated.div
                className={`w-full h-full top-0 left-0 absolute flex items-center justify-center bg-background`}
                style={{
                    opacity: fadeSpring.opacity,
                    pointerEvents: loaded ? 'none' : 'auto',
                }}
            >
                {text && (
                    <div className='flex items-center gap-3'>
                        <Loader2 className="animate-spin" />
                        <span className="font-bold">{t("loading")}</span>
                    </div>
                )}
            </animated.div>

            {/* 高清图 */}
            <img
                src={src}
                width={width}
                onLoad={onLoad}
                height={height}
                alt={alt}
                className={cn(className, "full-image w-fit h-full object-cover")}
            />
        </div>
    );
};

export default ImageLoader;