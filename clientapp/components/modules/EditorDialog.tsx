import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "components/ui/dialog"
import React, { ReactNode, useState } from "react"
import LazyThemedEditor from "components/modules/LazyThemedEditor";
import { cn } from "lib/utils"
import { PencilRulerIcon } from "lucide-react"
import type { editor } from 'monaco-editor';

export default function EditorDialog(
    {
        children,
        value,
        onChange,
        language,
        className = "",
        title = "修改内容",
        options = undefined
    }: {
        children: ReactNode,
        value: string | undefined
        onChange: (value: string | undefined) => void,
        language: string,
        className?: string,
        title?: string,
        options?: editor.IStandaloneEditorConstructionOptions | undefined
    }
) {

    const [isOpen, setIsOpen] = useState(false)

    return (
        <Dialog
            open={isOpen}
            onOpenChange={setIsOpen}
        >
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className={cn("w-[80vw]! h-[80vh]! max-w-none!", className)}
                onInteractOutside={(e) => e.preventDefault()}
                aria-describedby={undefined}
            >
                <DialogHeader>
                    <DialogTitle>
                        <div className="flex gap-4 items-center">
                            <PencilRulerIcon />
                            {title}
                        </div>
                    </DialogTitle>
                </DialogHeader>
                <LazyThemedEditor
                    value={value}
                    onChange={onChange}
                    language={language}
                    className=""
                    options={options}
                />
            </DialogContent>
        </Dialog>
    )
}