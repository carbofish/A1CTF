import React, { useEffect, useRef, useState } from "react";

type Props = {
    text: string;
    fade?: number;
    leftScroll?: number;
    rightScroll?: number;
    speed?: number;
    className?: string;
};

const ScrollingText: React.FC<Props> = ({ text, fade = 24, leftScroll = 24, rightScroll = 24, speed = 60, className }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const [need, setNeed] = useState(false);
    const [styleVars, setStyleVars] = useState<React.CSSProperties>({});

    const measure = () => {
        const c = containerRef.current, t = textRef.current;
        if (!c || !t) return;
        const cw = c.clientWidth, tw = t.scrollWidth;
        const overflow = tw - cw;
        const shouldScroll = overflow > 0;
        setNeed(shouldScroll);
        if (!shouldScroll) {
            setStyleVars({ ["--from" as any]: "0px", ["--to" as any]: "0px", ["--dur" as any]: "0s" });
            return;
        }
        const from = `${leftScroll}px`;
        const to = `${-(overflow + rightScroll)}px`;      // 左侧也滚出渐变
        const distance = overflow + leftScroll + rightScroll;      // 单程距离
        const dur = distance / Math.max(1, speed); // s
        setStyleVars({
            ["--from" as any]: from,
            ["--to" as any]: to,
            ["--dur" as any]: `${dur}s`,
            maskImage: `linear-gradient(to right, transparent, black ${fade}px, black calc(100% - ${fade}px), transparent)`,
            WebkitMaskImage: `linear-gradient(to right, transparent, black ${fade}px, black calc(100% - ${fade}px), transparent)`,
        });
    };

    useEffect(() => {
        measure();
        const ro = new ResizeObserver(measure);
        if (containerRef.current) ro.observe(containerRef.current);
        if (textRef.current) ro.observe(textRef.current);
        return () => ro.disconnect();
    }, [text, fade, speed]);

    return (
        <div
            ref={containerRef}
            className={`relative w-full overflow-hidden whitespace-nowrap ${className ?? ""}`}
            style={styleVars}
        >
            <div
                ref={textRef}
                className={need ? "marquee-run inline-block" : "inline-block"}
                style={styleVars}
            >
                {text}
            </div>
        </div>
    );
};

export default ScrollingText;