import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from 'components/ui/button';

export const writeupFormatOptions = ["pdf", "zip", "doc", "docx", "md", "txt"]

/**
 * WriteUp 允许格式的选择按钮组（创建比赛和编辑比赛共用）
 * 点击按钮切换选中；鼠标悬停时右上角显示小 x，点击可把该格式从列表中移除
 */
export function WriteupFormatChips({ value, onChange }: { value: string[] | undefined, onChange: (value: string[]) => void }) {
    const { t } = useTranslation("game_edit")
    // 被移除的预设格式，只在当前页面生效；已选中的格式会随表单保存，移除即取消选中
    const [removedPresets, setRemovedPresets] = useState<string[]>([])

    const current = value ?? []
    const options = Array.from(new Set([
        ...writeupFormatOptions.filter((fmt) => !removedPresets.includes(fmt)),
        ...current,
    ]))

    return (
        <div className="flex flex-wrap gap-2">
            {options.map((fmt) => {
                const selected = current.includes(fmt)
                // 至少保留一个已选格式，最后一个已选格式不可取消也不可移除
                const isLastSelected = selected && current.length === 1
                return (
                    <div key={fmt} className="relative group">
                        <Button
                            type="button"
                            size="sm"
                            variant={selected ? "default" : "outline"}
                            className="rounded-full text-xs"
                            onClick={() => {
                                if (isLastSelected) return
                                onChange(selected ? current.filter((val) => val !== fmt) : [...current, fmt])
                            }}
                        >
                            {fmt.toUpperCase()}
                        </Button>
                        {!isLastSelected && (
                            <button
                                type="button"
                                title={t("detail.wp_formats.remove")}
                                aria-label={t("detail.wp_formats.remove")}
                                className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white shadow cursor-pointer"
                                onClick={() => {
                                    if (selected) onChange(current.filter((val) => val !== fmt))
                                    if (writeupFormatOptions.includes(fmt)) setRemovedPresets((prev) => [...prev, fmt])
                                }}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
