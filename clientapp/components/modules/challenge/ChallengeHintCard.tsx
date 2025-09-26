import LazyMdxCompoents from "components/modules/LazyMdxCompoents";
import dayjs from "dayjs";
import { BringToFront, CalendarClock } from "lucide-react";
import { useTheme } from "next-themes";

export default function ChallengeHintCard(
    { hint, index, publish_time } : { hint: string, index: number, publish_time: dayjs.Dayjs }
) {

    const { theme } = useTheme()

    return (
        <div className={
            `w-full relative overflow-hidden flex-none transition-colors duration-300 group ` +
            `rounded-2xl shadow-lg border border-foreground/10 ` +
            `bg-gradient-to-br ` +
            (theme === 'dark'
                ? 'from-[#23272f]/80 to-[#181a20]/90 hover:from-[#23272f]/90 hover:to-[#23272f]/95'
                : 'from-white/90 to-gray-100/80 hover:from-white/95 hover:to-gray-200/90') +
            'hover:shadow-2xl'
        }>
            <div className="flex flex-col gap-2 px-6 pt-5 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 select-none mb-2">
                    <div className="flex gap-4 items-center">
                        <BringToFront className="text-yellow-500" />
                        <span className="font-bold text-base sm:text-lg tracking-wide">Hint {index}</span>
                    </div>
                    <div className="flex gap-2 items-center text-xs sm:text-sm text-foreground/60 mt-1 sm:mt-0">
                        <CalendarClock className="" />
                        <span>发布时间 { publish_time.format("YYYY-MM-DD HH:mm:ss") }</span>
                    </div>
                </div>
                <div className="border-t border-dashed border-foreground/10" />
                <div className="prose prose-sm sm:prose-base max-w-none text-foreground/90 dark:text-foreground/80">
                    <LazyMdxCompoents source={hint} />
                </div>
            </div>
        </div>
    )
}