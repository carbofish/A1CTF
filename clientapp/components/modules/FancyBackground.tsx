import React, { useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import { useGlobalVariableContext } from "contexts/GlobalVariableContext";

const DPR_CAP = 2;
const ROTATION_DEG = -5;
const RESIZE_DEBOUNCE_MS = 120;

function hexToRGBA(hex: string, alpha: number) {
    let h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    const a = Math.max(0, Math.min(1, alpha));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export default function FancyBackground() {
    const { theme, systemTheme } = useTheme();
    const { clientConfig } = useGlobalVariableContext();

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const imgRef = useRef<HTMLImageElement>(new Image());
    const lastDrawKeyRef = useRef<string>("");

    const pickIconSrc = useCallback((): string | null => {
        if (!clientConfig) return null;
        const white = clientConfig.FancyBackGroundIconWhite;
        const black = clientConfig.FancyBackGroundIconBlack;
        if (!white || !black) return null;

        if (theme === "system") {
            return systemTheme === "dark" ? black : white;
        }
        return theme === "light" ? white : black;
    }, [theme, systemTheme, clientConfig]);

    const pickMaskBaseColor = useCallback((): string => {
        if (theme === "system") {
            return systemTheme === "dark" ? "#060606" : "#ffffff";
        }
        return theme === "light" ? "#ffffff" : "#060606";
    }, [theme, systemTheme]);

    const ready =
        !!clientConfig &&
        !!clientConfig.FancyBackGroundIconWhite &&
        !!clientConfig.FancyBackGroundIconBlack &&
        !!pickIconSrc();

    // 4) 核心绘制逻辑
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !ready) return;

        const cssW = window.innerWidth;
        const cssH = window.innerHeight;
        const dpr = Math.max(1, Math.min(DPR_CAP, window.devicePixelRatio || 1));

        const iconSrc = pickIconSrc();
        const maskBase = pickMaskBaseColor();

        const tileW = Math.max(4, Number(clientConfig!.fancyBackGroundIconWidth) || 40);
        const tileH = Math.max(4, Number(clientConfig!.fancyBackGroundIconHeight) || 40);

        const key = [cssW, cssH, dpr, iconSrc, maskBase, tileW, tileH].join("|");
        if (key === lastDrawKeyRef.current) return;
        lastDrawKeyRef.current = key;

        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
        canvas.width = Math.floor(cssW * dpr);
        canvas.height = Math.floor(cssH * dpr);

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);

        const rotationRad = (ROTATION_DEG * Math.PI) / 180;

        // 网格：为避免边缘缺口，超出一圈
        const startX = -tileW;
        const startY = -tileH;
        const endX = cssW + tileW;
        const endY = cssH + tileH;

        // 铺贴旋转 logo
        for (let x = startX; x < endX; x += tileW) {
            for (let y = startY; y < endY; y += tileH) {
                const cx = x + tileW / 2;
                const cy = y + tileH / 2;
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(rotationRad);
                ctx.drawImage(imgRef.current, -tileW / 2, -tileH / 2, tileW, tileH);
                ctx.restore();
            }
        }

        // 左右线性遮罩
        const edgeWidth = Math.max(48, Math.floor(cssW * 0.12));
        const centerWidth = Math.max(0, cssW - edgeWidth * 2);

        // 左侧：不透明 -> 透明
        const leftGrad = ctx.createLinearGradient(0, 0, edgeWidth, 0);
        leftGrad.addColorStop(0, hexToRGBA(maskBase, 0.95));
        leftGrad.addColorStop(1, hexToRGBA(maskBase, 0.0));
        ctx.fillStyle = leftGrad;
        ctx.fillRect(0, 0, edgeWidth, cssH);

        // 右侧：透明 -> 不透明
        const rightGrad = ctx.createLinearGradient(cssW - edgeWidth, 0, cssW, 0);
        rightGrad.addColorStop(0, hexToRGBA(maskBase, 0.0));
        rightGrad.addColorStop(1, hexToRGBA(maskBase, 0.95));
        ctx.fillStyle = rightGrad;
        ctx.fillRect(cssW - edgeWidth, 0, edgeWidth, cssH);

        // 轻微上下 vignetting（可选）
        const vGrad = ctx.createLinearGradient(0, 0, 0, cssH);
        vGrad.addColorStop(0, hexToRGBA(maskBase, 0.08));
        vGrad.addColorStop(0.5, hexToRGBA(maskBase, 0.0));
        vGrad.addColorStop(1, hexToRGBA(maskBase, 0.08));
        ctx.fillStyle = vGrad;
        ctx.fillRect(edgeWidth, 0, centerWidth, cssH);
    }, [clientConfig, pickIconSrc, pickMaskBaseColor, ready]);

    // 5) 等图加载后绘制
    useEffect(() => {
        const img = imgRef.current;
        if (!ready) return;

        const src = pickIconSrc();
        if (!src) return;

        let cancelled = false;
        const onLoad = () => !cancelled && draw();

        if (img.src === src && img.complete) {
            draw();
        } else {
            img.removeEventListener("load", onLoad);
            img.addEventListener("load", onLoad);
            img.src = src;
        }

        return () => {
            cancelled = true;
            img.removeEventListener("load", onLoad);
        };
    }, [pickIconSrc, draw, ready]);

    // 防抖重绘
    useEffect(() => {
        if (!ready) return;

        let t: ReturnType<typeof setTimeout> | null = null;
        let raf = 0 as number | 0;

        const onResize = () => {
            if (t) clearTimeout(t);
            t = setTimeout(() => {
                if (raf) cancelAnimationFrame(raf);
                raf = requestAnimationFrame(() => draw());
            }, RESIZE_DEBOUNCE_MS);
        };

        window.addEventListener("resize", onResize);
        // 初次（若图片缓存已好）：
        if (imgRef.current.complete) draw();

        return () => {
            window.removeEventListener("resize", onResize);
            if (t) clearTimeout(t);
            if (raf) cancelAnimationFrame(raf);
        };
    }, [draw, ready]);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden
            className="fixed inset-0 pointer-events-none select-none opacity-10 blur-[2px]"
        />
    );
}
