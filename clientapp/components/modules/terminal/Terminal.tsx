import React, {
    Dispatch,
    SetStateAction,
    useEffect,
    useRef,
    useState,
} from "react";
import { createPortal } from "react-dom";
import { Rnd } from "react-rnd";
import { TerminalSquare, Minus, Maximize2, X } from "lucide-react";
import { cn } from "lib/utils";
import { useXTerm } from "react-xtermjs";
import { FitAddon } from "@xterm/addon-fit";

type Props = {
    teamName: string
    podName: string;
    containerName: string;
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    setTerminalPod: Dispatch<SetStateAction<string | null>>;
    setTerminalContainer: Dispatch<SetStateAction<string | null>>;
};

// spinner 动画字符集
const spinnerSets = [
    ["|", "/", "-", "\\"],                // 经典旋转
    [".  ", ".. ", "..."],                // 点点点
    ["◐", "◓", "◑", "◒"],                // 圆圈四象限
    ["←", "↖", "↑", "↗", "→", "↘", "↓", "↙"], // 箭头旋转
    ["▁", "▃", "▄", "▅", "▆", "▇", "█", "▇", "▆", "▅", "▄", "▃"], // 上升方块
    ["⠁", "⠂", "⠄", "⡀", "⢀", "⠠", "⠐", "⠈"], // 盲文点
];

function MyTerminal({
    podName,
    containerName,
    fitRef,
    wsRef,
}: {
    podName: string;
    containerName: string;
    fitRef: React.MutableRefObject<FitAddon>;
    wsRef: React.MutableRefObject<WebSocket | null>;
}) {
    const { instance, ref } = useXTerm();
    const pingTimerRef = useRef<number | null>(null);
    const spinnerTimerRef = useRef<number | null>(null);
    const dataHandlerBoundRef = useRef<boolean>(false);
    const decoderRef = useRef(new TextDecoder());


    useEffect(() => {
        if (!instance || !podName || !containerName) return;

        const fitAddon = fitRef.current!;
        instance.loadAddon(fitAddon);
        setTimeout(() => fitAddon.fit(), 1000);

        const clearTimers = () => {
            if (pingTimerRef.current) {
                window.clearInterval(pingTimerRef.current);
                pingTimerRef.current = null;
            }
            if (spinnerTimerRef.current) {
                window.clearInterval(spinnerTimerRef.current);
                spinnerTimerRef.current = null;
            }
        };

        const setupDataHandlersOnce = () => {
            if (dataHandlerBoundRef.current) return;
            dataHandlerBoundRef.current = true;

            instance.onData((data: string) => {
                const s = wsRef.current;
                if (s && s.readyState === WebSocket.OPEN) {
                    s.send(JSON.stringify({ op: "input", data }));
                }
            });

            instance.onResize(({ cols, rows }) => {
                const s = wsRef.current;
                if (s && s.readyState === WebSocket.OPEN) {
                    s.send(JSON.stringify({ op: "resize", cols, rows }));
                }
            });
        };

        // ===== 启动 spinner 动画 =====
        const spinnerFrames = spinnerSets[Math.floor(Math.random() * spinnerSets.length)];
        let spinnerIndex = 0;
        instance.write("Container Connecting"); // 初始输出
        spinnerTimerRef.current = window.setInterval(() => {
            const frame = spinnerFrames[spinnerIndex];
            instance.write(`\rContainer Connecting ${frame}`);
            spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
        }, 150);

        // 创建 WebSocket
        const https_enabled = window.location.protocol === "https:";
        const baseURL = window.location.host;
        const socket = new WebSocket(
            `${https_enabled ? "wss" : "ws"}://${baseURL}/api/pod/${podName}/${containerName}/exec`
        );
        socket.binaryType = "arraybuffer";
        wsRef.current = socket;

        socket.onopen = () => {

            clearTimers(); // 停掉 spinner
            instance.write("\rContainer Connected!\r\n")
            instance.write("\r\n")

            setupDataHandlersOnce();
            const cols = (instance as any)?.cols;
            const rows = (instance as any)?.rows;
            if (cols && rows) {
                socket.send(JSON.stringify({ op: "resize", cols, rows }));
            }

            if (!pingTimerRef.current) {
                pingTimerRef.current = window.setInterval(() => {
                    const s = wsRef.current;
                    if (s && s.readyState === WebSocket.OPEN) {
                        s.send(JSON.stringify({ op: "ping", t: Date.now() }));
                    }
                }, 20000);
            }
        };

        socket.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer) {
                const text = decoderRef.current.decode(new Uint8Array(event.data));
                instance.write(text);
                return;
            }
            if (event.data instanceof Blob) {
                const reader = new FileReader();
                reader.onload = () => instance.write(reader.result as string);
                reader.readAsText(event.data);
                return;
            }
            if (typeof event.data === "string") {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.op === "error") {
                        instance.write(`\r\nError: ${msg.data}\r\n`);
                        return;
                    }
                } catch {
                    // noop
                }
                instance.write(event.data);
                return;
            }
            try {
                instance.write(String(event.data));
            } catch { }
        };

        socket.onclose = () => {
            instance.write("\r\nConnection closed\r\n");
            clearTimers();
        };
        socket.onerror = () => {
            instance.write("\r\nWebSocket error\r\n");
            clearTimers();
        };

        const handleWindowResize = () => fitAddon.fit();
        window.addEventListener("resize", handleWindowResize);

        return () => {
            clearTimers();
            window.removeEventListener("resize", handleWindowResize);
            try {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ op: "exit" }));
                }
            } catch { }
            setTimeout(() => wsRef.current?.close(), 200);
        };
    }, [instance, podName, containerName, fitRef, wsRef]);

    return (
        <div
            ref={ref as any}
            className="w-full h-full bg-[#0f1720] rounded-b-md"
        />
    );
}

export default function ContainerTerminal({
    teamName,
    podName,
    containerName,
    isOpen,
    setIsOpen,
    setTerminalPod,
    setTerminalContainer,
}: Props) {
    const [minimized, setMinimized] = useState(false);
    const [maximized, setMaximized] = useState(false);

    const initialW = Math.min(Math.round(window.innerWidth * 0.75), 1100);
    const initialH = Math.min(Math.round(window.innerHeight * 0.72), 720);
    const initialX = Math.round((window.innerWidth - initialW) / 2);
    const initialY = Math.round((window.innerHeight - initialH) / 2);

    const [pos, setPos] = useState({ x: initialX, y: initialY });
    const [size, setSize] = useState({ width: initialW, height: initialH });
    const lastBoundsRef = useRef({ x: initialX, y: initialY, width: initialW, height: initialH });

    const fitRef = useRef<FitAddon>(new FitAddon());
    const rndRef = useRef<any>(null);
    const wsRef = useRef<WebSocket | null>(null);

    if (!isOpen) return null;

    const portalRoot = typeof document !== "undefined" ? document.body : null;

    const onDragStop = (_: any, d: { x: number; y: number }) => {
        setPos({ x: d.x, y: d.y });
        lastBoundsRef.current = { ...lastBoundsRef.current, x: d.x, y: d.y };
    };

    const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onResizeStop = (
        _event: MouseEvent | TouchEvent | PointerEvent,
        _direction: any,
        ref: HTMLElement,
        _delta: any,
        position: { x: number; y: number }
    ) => {
        const w = ref.offsetWidth;
        const h = ref.offsetHeight;
        setSize({ width: w, height: h });
        setPos({ x: position.x, y: position.y });
        lastBoundsRef.current = { x: position.x, y: position.y, width: w, height: h };

        // 清除上一次的 timeout
        if (resizeTimeoutRef.current) {
            clearTimeout(resizeTimeoutRef.current);
        }

        // 重新设定防抖 timeout, fit terminal 并发送 resize
        resizeTimeoutRef.current = setTimeout(() => {
            const fitAddon = fitRef.current;
            fitAddon?.fit();
            // 用 xterm 本身实例获取 cols/rows
            const term: any = (fitAddon as any)._terminal;
            if (term && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(
                    JSON.stringify({ op: "resize", cols: term.cols, rows: term.rows })
                );
            }
        }, 1000); // 1s 防抖
    };

    const handleMinimize = () => setMinimized(true);
    const handleRestoreFromMin = () => {
        setMinimized(false);
        setTimeout(() => fitRef.current?.fit(), 50);
    };

    const handleToggleMaximize = () => {
        if (!maximized) {
            lastBoundsRef.current = { ...lastBoundsRef.current, x: pos.x, y: pos.y, width: size.width, height: size.height };
            setPos({ x: 0, y: 0 });
            setSize({ width: window.innerWidth, height: window.innerHeight });
            setMaximized(true);
            setTimeout(() => fitRef.current?.fit(), 50);
        } else {
            const last = lastBoundsRef.current;
            setPos({ x: last.x, y: last.y });
            setSize({ width: last.width, height: last.height });
            setMaximized(false);
            setTimeout(() => fitRef.current?.fit(), 50);
        }
    };

    const handleClose = () => {
        setTerminalPod(null);
        setTerminalContainer(null);
        setIsOpen(false);
    };

    const rndNode = (
        <Rnd
            ref={rndRef}
            position={{ x: pos.x, y: pos.y }}
            minWidth={400}
            minHeight={300}
            size={{ width: size.width, height: size.height }}
            bounds="window"
            onDragStop={onDragStop}
            onResizeStop={onResizeStop}
            enableResizing={!maximized}
            disableDragging={maximized}
            className={cn(
                "shadow-2xl rounded-lg flex flex-col border overflow-hidden z-50",
                "bg-white text-black dark:bg-[#0b1220] dark:text-white",
            )}
            style={{
                display: minimized ? "none" : "block",
                position: "fixed",
            }}
            // 只有标题栏才能拖拽
            dragHandleClassName="a1ctf-container-terminal-drag-handle"
        >
            <div className="flex flex-col w-full h-full">
                {/* 标题栏 */}
                <div className="a1ctf-container-terminal-drag-handle flex-none flex justify-between items-center px-3 py-2 border-b cursor-move bg-gray-100 dark:bg-[#0f1720] rounded-t-md select-none">
                    <div className="flex items-center gap-2">
                        <TerminalSquare className="w-4 h-4" />
                        <span className="text-sm font-medium">
                            [Terminal] {containerName}({podName}) / {teamName}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleMinimize} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                            <Minus className="w-4 h-4" />
                        </button>
                        <button onClick={handleToggleMaximize} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                            <Maximize2 className="w-4 h-4" />
                        </button>
                        <button onClick={handleClose} className="p-1 rounded hover:bg-red-600 hover:text-white transition">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* 终端容器 */}
                <div className="flex-1 min-h-0 overflow-hidden p-2 bg-[#0f1720]">
                    <MyTerminal podName={podName} containerName={containerName} fitRef={fitRef} wsRef={wsRef} />
                </div>
            </div>
        </Rnd>
    );

    return (
        <>
            {portalRoot && createPortal(rndNode, portalRoot)}

            {minimized && (
                <div
                    className="absolute bottom-4 right-4 px-3 py-2 bg-gray-200 dark:bg-gray-800 rounded shadow cursor-pointer flex items-center gap-2"
                    onClick={handleRestoreFromMin}
                    title="Restore terminal"
                >
                    <TerminalSquare className="w-4 h-4" />
                    <span className="text-sm">{podName}</span>
                </div>
            )}
        </>
    );
}
