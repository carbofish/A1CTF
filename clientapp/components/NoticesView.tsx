import {
    animated,
    useTransition,
} from '@react-spring/web'

import { Dispatch, SetStateAction, useEffect, useRef, useState, useMemo, memo } from "react";
import { Button } from "./ui/button";
import { CalendarClock, X } from "lucide-react";
import dayjs from "dayjs";
import { GameNotice, NoticeCategory } from "utils/A1API";
import LazyMdxCompoents from "./modules/LazyMdxCompoents";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { MacScrollbar } from "mac-scrollbar";

let messages: GameNotice[] = []

// 单独的消息卡片组件，使用React.memo优化
const NoticeCard = memo(({
    notice,
    index: _index,
    theme
}: {
    notice: GameNotice,
    index: number,
    theme: string | undefined
}) => {
    const { t } = useTranslation("notices_view");

    const getNoticeMessage = useMemo(() => {
        switch (notice.notice_category) {
            case NoticeCategory.NewAnnouncement:
                return (<LazyMdxCompoents source={notice.data[1]}></LazyMdxCompoents>)
            case NoticeCategory.NewHint:
                return (<span>{`💡 ${t("challenge_name")} `}<strong>{notice.data.join(", ")}</strong>{` ${t("new_hint")}`}</span>)
            case NoticeCategory.FirstBlood:
                return (<span>{`🥇 ${notice.data[0]} ${t("blood_message_p1")} `}<strong>{notice.data[1]}</strong>{` ${t("blood1")}`}</span>)
            case NoticeCategory.SecondBlood:
                return (<span>{`🥈 ${notice.data[0]} ${t("blood_message_p1")} `}<strong>{notice.data[1]}</strong>{` ${t("blood2")}`}</span>)
            case NoticeCategory.ThirdBlood:
                return (<span>{`🥉 ${notice.data[0]} ${t("blood_message_p1")} `}<strong>{notice.data[1]}</strong>{` ${t("blood3")}`}</span>)
        }
    }, [notice.notice_category, notice.data, t]);

    const getNoticeIconColor = useMemo(() => {
        switch (notice.notice_category) {
            case NoticeCategory.NewAnnouncement:
                return "text-blue-400"
            case NoticeCategory.NewHint:
                return "text-green-400"
            case NoticeCategory.FirstBlood:
                return "text-red-400"
            case NoticeCategory.SecondBlood:
                return "text-orange-400"
            case NoticeCategory.ThirdBlood:
                return "text-yellow-400"
        }
    }, [notice.notice_category]);

    const noticeTitle = useMemo(() => {
        return notice.notice_category == NoticeCategory.NewAnnouncement
            ? `${dayjs(notice.create_time).format("YYYY-MM-DD HH:mm:ss")} | ${notice.data[0]}`
            : dayjs(notice.create_time).format("YYYY-MM-DD HH:mm:ss");
    }, [notice.notice_category, notice.create_time, notice.data]);

    return (
        <div
            className={
                `relative overflow-hidden flex-none transition-colors duration-300 group ` +
                `rounded-2xl shadow-lg border border-foreground/10 ` +
                `bg-gradient-to-br ` +
                (theme === 'dark'
                    ? 'from-[#23272f]/80 to-[#181a20]/90 hover:from-[#23272f]/90 hover:to-[#23272f]/95'
                    : 'from-white/90 to-gray-100/80 hover:from-white/95 hover:to-gray-200/90') +
                'hover:shadow-2xl w-full'
            }
        >
            <div className="flex flex-col gap-2 px-6 pt-5 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 select-none mb-2">
                    <div className="flex gap-4 items-center">
                        <CalendarClock className={getNoticeIconColor} />
                        <span className="font-bold text-base sm:text-lg tracking-wide">
                            {noticeTitle}
                        </span>
                    </div>
                </div>
                <div className="border-t border-dashed border-foreground/10" />
                <div className="prose prose-sm sm:prose-base max-w-none text-foreground/90 dark:text-foreground/80 mt-2 break-words overflow-x-auto">
                    {getNoticeMessage}
                </div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // 自定义比较函数，只有当消息内容或主题发生变化时才重新渲染
    return (
        prevProps.notice.notice_id === nextProps.notice.notice_id &&
        prevProps.notice.notice_category === nextProps.notice.notice_category &&
        JSON.stringify(prevProps.notice.data) === JSON.stringify(nextProps.notice.data) &&
        prevProps.notice.create_time === nextProps.notice.create_time &&
        prevProps.theme === nextProps.theme
    );
});

NoticeCard.displayName = 'NoticeCard';

const shouldAnimated = (index: number) => {
    const height = window.innerHeight

    let boxHeight = 0
    let untilCurBoxHeight = 0

    // 估计信息盒子的高度
    messages.forEach((ele, curIndex) => {
        // 先根据换行符拆开
        const lines = ele.data[0].split("\n")

        // 当前盒子的高度
        let curBoxHeight = 64
        // 基础的 内外高度
        boxHeight += 64

        lines.forEach((line) => {
            const line_count = Math.ceil(line.length / 68)
            // 测试得到一行文本的高度大概为 24
            boxHeight += line_count * 24
            curBoxHeight += line_count * 24
        })

        // gap 为 16px
        boxHeight += 16
        curBoxHeight += 16

        if (curIndex < index) untilCurBoxHeight += curBoxHeight
    })

    boxHeight = Math.min(boxHeight, height - 80)
    const paddingTop = (height - boxHeight) / 2

    return (untilCurBoxHeight + paddingTop) < height - 40
}

export function NoticesView({ opened, setOpened, notices }: { opened: boolean, setOpened: Dispatch<SetStateAction<boolean>>, notices: GameNotice[] }) {

    messages = notices

    const { theme } = useTheme();
    const { t } = useTranslation("notices_view")

    // 消息卡片的可见列表
    const [visible, setVisible] = useState<boolean>(false)

    // 延迟和动画时间
    const [durationTime, setDurationTime] = useState<Record<string, number>>({})

    // 懒加载，屏幕外面的消息卡片不需要动画时间
    const observerRef = useRef<IntersectionObserver | null>(null);
    const [visibleItems, setVisibleItems] = useState<Record<string, boolean>>({});

    // 使用useMemo缓存notices，避免每次渲染都重新计算
    const memoizedNotices = useMemo(() => notices, [notices]);

    useEffect(() => {

        // 观察
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
                rootMargin: "200px 0px",
            });

        // 打开公告列表前计算每一个元素的动画时间和延迟列表
        if (opened) {
            const newDelayTime: Record<string, number> = {};
            const newDurationTime: Record<string, number> = {};

            // 由于刚打开元素没有渲染，无法得知真实宽度，只能计算得出 shouldAnimated 就是根据模拟计算出来的宽度来判断是否在屏幕内
            messages.forEach((ele, index) => {
                newDurationTime[index.toString()] = shouldAnimated(index) ? 0.9 : 0
                newDelayTime[index.toString()] = shouldAnimated(index) ? 0.1 * index : 0
            })

            // 更新
            setDurationTime(newDurationTime)

            // 计算完成后设置可视状态
            setVisible(true)
        } else {
            // 关闭动画由于已经渲染卡片，可以直接得到这个卡片是否在屏幕外面或者里面
            const newDelayTime: Record<string, number> = {};
            const newDurationTime: Record<string, number> = {};

            let countVar1 = 0
            let foundTop = false

            // 第一步找到有多少个可见的，第一张可见卡片前面的卡片需要在所有可视卡片动画完成后瞬间消失
            // 也就是 duration = 0, delay = visibleCount * 0.1
            let visibleCount = 0
            Object.values(visibleItems).forEach((value) => { visibleCount += value ? 1 : 0 })

            // 计算每一张卡片的动画时间和延迟时间
            messages.forEach((ele, index) => {
                newDurationTime[index.toString()] = visibleItems[index.toString()] ? 0.9 : 0

                if (visibleItems[index.toString()]) {
                    newDelayTime[index.toString()] = 0.1 * countVar1
                    countVar1 += 1
                    foundTop = true
                } else {
                    if (!foundTop) {
                        // 第一张可视卡片前面的卡片延迟时间都为 0.1 * 可视卡片的数量
                        newDelayTime[index.toString()] = 0.1 * visibleCount
                    } else {
                        // 后面的全部瞬间消失
                        newDelayTime[index.toString()] = 0
                    }
                }
            })

            setDurationTime(newDurationTime)
        }
    }, [opened])

    useEffect(() => {
        // 关闭盒子
        if (!opened) {
            let visibleCount = 0
            Object.values(visibleItems).forEach((value) => { visibleCount += value ? 1 : 0 })
            setVisible(false)
        }
    }, [durationTime])

    const transitions = useTransition(visible, {
        from: {
            opacity: 0,
            backdropFilter: 'blur(0px)',
            backgroundColor: 'rgba(0, 0, 0, 0)',
            transform: 'translateY(40px)'
        },
        enter: {
            opacity: 1,
            backdropFilter: 'blur(4px)',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            transform: 'translateY(0)'
        },
        leave: {
            opacity: 0,
            backdropFilter: 'blur(0px)',
            backgroundColor: 'rgba(0, 0, 0, 0)',
            transform: 'translateY(40px)'
        },
        config: { tension: 220, friction: 20 }
    });


    return (
        transitions((style, visible2) =>
            visible2 && (
                <div>
                    <animated.div className="absolute top-0 left-0 w-screen h-screen z-30"
                        style={{
                            opacity: style.opacity,
                            backgroundColor: style.backgroundColor,
                            backdropFilter: style.backdropFilter
                        }}
                    >

                    </animated.div>
                    <animated.div
                        className="absolute top-0 left-0 w-screen h-screen flex justify-center items-center z-30 overflow-hidden"
                        style={{
                            opacity: style.opacity,
                        }}
                    >
                        <MacScrollbar className="w-full h-full flex-1" skin={theme === "dark" ? "dark" : "light"}>
                            <div className="w-full flex flex-col items-center">
                                <div className="container flex flex-col gap-4 items-center justify-center pb-10">
                                    <div className="w-full p-10 pb-0 mb-8 flex items-center">
                                        <span className="font-bold text-3xl">{t("announcement")}</span>
                                        <div className="flex-1" />
                                        <Button className='w-[50px] h-[50px] [&_svg]:size-8 rounded-lg' variant="default"
                                            onClick={() => {
                                                setOpened(false)
                                            }}
                                        >
                                            <X />
                                        </Button>
                                    </div>
                                    {memoizedNotices.map((notice, index) => (
                                        <NoticeCard
                                            key={`notice-${notice.notice_id}`}
                                            notice={notice}
                                            index={index}
                                            theme={theme}
                                        />
                                    ))}
                                </div>

                            </div>
                        </MacScrollbar>
                    </animated.div>
                </div>
            ))
    )
}