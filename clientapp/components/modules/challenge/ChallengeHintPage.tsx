import { MacScrollbar } from "mac-scrollbar";
import ChallengeHintCard from "./ChallengeHintCard";
import { useTheme } from "next-themes";
import SafeComponent from "components/SafeComponent";
import dayjs from "dayjs";
import { UserDetailGameChallenge } from "utils/A1API";
import { Dispatch, SetStateAction } from "react";
import { Button } from "components/ui/button";
import { Hourglass, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
    animated,
    useTransition,
} from '@react-spring/web'

export default function ChallengeHintPage(
    {
        curChallenge,
        visible,
        setVisible
    }: {
        curChallenge: UserDetailGameChallenge | undefined,
        visible: boolean,
        setVisible: Dispatch<SetStateAction<boolean>>
    }
) {

    const { theme } = useTheme()
    const { t } = useTranslation("challenge_view")

    // 后端只下发已放出的 hint，待放出的只给数量和最近放出时间
    const pendingHintCount = curChallenge?.pending_hint_count ?? 0
    const pendingHintTip = pendingHintCount > 0 && curChallenge?.next_hint_release_time ? (
        <div className="flex items-center gap-2 px-10 pb-6 text-foreground/70 select-none">
            <Hourglass size={18} />
            <span>{t("pending_hints", { count: pendingHintCount, time: dayjs(curChallenge.next_hint_release_time).format("YYYY-MM-DD HH:mm:ss") })}</span>
        </div>
    ) : null

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
        <SafeComponent animation={false}>
            {transitions((style, item) =>
                item && (
                    <div>
                        <animated.div className="absolute top-0 left-0 w-screen h-screen z-30" 
                            style={{
                                opacity: style.opacity,
                                backgroundColor: style.backgroundColor,
                                backdropFilter: style.backdropFilter
                            }}
                        />
                        <animated.div className="absolute top-0 left-0 w-screen h-screen flex justify-center items-center z-30 overflow-hidden"
                            style={{
                                opacity: style.opacity,
                                // transform: style.transform
                            }}
                        >
                            <MacScrollbar
                                className="w-full h-full overflow-auto flex flex-col container"
                                skin={theme == "light" ? "light" : "dark"}
                            >
                                <div className="w-full p-10 pb-0 mb-8 flex items-center">
                                    <span className="font-bold text-3xl">Hints</span>
                                    <div className="flex-1" />
                                    <Button className='w-[50px] h-[50px] [&_svg]:size-8 rounded-lg' variant="default"
                                        onClick={() => {
                                            setVisible(false)
                                        }}
                                    >
                                        <X />
                                    </Button>
                                </div>
                                {pendingHintTip}
                                {curChallenge?.hints?.length ? (
                                    <div className="flex flex-col w-full h-full gap-8 px-10 pb-8">
                                        {curChallenge?.hints?.map((hint, index) => (
                                            <ChallengeHintCard key={index}
                                                hint={hint.content}
                                                index={index + 1}
                                                publish_time={
                                                    // 定时放出的 hint 以放出时间为发布时间（取两者中较晚的）
                                                    hint.release_time && dayjs(hint.release_time).isAfter(dayjs(hint.create_time))
                                                        ? dayjs(hint.release_time)
                                                        : dayjs(hint.create_time)
                                                }
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex w-full h-full items-center justify-center">
                                        <span className="font-bold text-3xl">{pendingHintCount > 0 ? t("no_released_hints") : "No hints"}</span>
                                    </div>
                                )}
                            </MacScrollbar>
                        </animated.div>
                    </div>
                ))}
        </SafeComponent>
    )
}