import LazyMdxCompoents from "components/modules/LazyMdxCompoents";
import LazyThemedEditor from "components/modules/LazyThemedEditor";
import { Button } from 'components/ui/button';
import { Save } from 'lucide-react';
import { MacScrollbar } from 'mac-scrollbar';
import { useTheme } from 'next-themes';
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { SystemSettingsValues } from '~/routes/admin/system/AdminSettingsPage';

export default function AboutPage(
    { form, onSubmit }: {
        form: UseFormReturn<SystemSettingsValues>,
        onSubmit: (value: SystemSettingsValues) => Promise<void>
    }
) {

    const [aboutMeSource, setAboutMeSource] = useState<string>("");
    const [debouncedSource, setDebouncedSource] = useState<string>("");
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const { t } = useTranslation("system_settings")

    // 防抖函数
    const debouncedUpdateSource = useCallback((value: string) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            setDebouncedSource(value);
        }, 1000);
    }, []);

    // 清理定时器
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // 使用 useMemo 优化 Mdx 组件，只在 debouncedSource 改变时重新渲染
    const memoizedMdx = useMemo(() => {
        return <LazyMdxCompoents source={debouncedSource} />;
    }, [debouncedSource]);

    const watchValue = useWatch({
        control: form.control,
        name: `aboutus`, // Watch the specific field
    });

    useEffect(() => {
        setAboutMeSource(watchValue || "A1CTF Platform")
        setDebouncedSource(watchValue || "A1CTF Platform")
    }, [watchValue])

    const { theme } = useTheme()

    return (
        <div className='flex-1 overflow-hidden w-full flex flex-col h-full p-10'>
            <div className='w-full flex items-center justify-between mb-6'>
                <span className='font-bold text-2xl'>{t("aboutus")}</span>
                <Button
                    onClick={form.handleSubmit(onSubmit)}
                >
                    <Save />
                    {t("save")}
                </Button>
            </div>
            <div className='w-full h-full overflow-hidden'>
                <div className="h-full w-full flex gap-4">
                    <div className='h-full w-1/2'>
                        <LazyThemedEditor
                            value={aboutMeSource}
                            onChange={(value) => {
                                const newValue = value || "";
                                form.setValue("aboutus", value)
                                setAboutMeSource(newValue);
                                debouncedUpdateSource(newValue);
                            }}
                            language="markdown"
                            className='h-full'
                        />
                    </div>
                    <div className='h-full w-1/2 border-2 rounded-md overflow-hidden relative'>

                        <MacScrollbar className='h-full w-full select-none'
                            skin={theme == "light" ? "light" : "dark"}
                        >
                            <div className='p-4 px-6'>
                                {memoizedMdx}
                            </div>
                        </MacScrollbar>
                    </div>
                </div>
            </div>
        </div>
    )
}