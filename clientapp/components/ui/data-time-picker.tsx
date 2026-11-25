import * as React from "react";
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns";

import { cn } from "lib/utils";
import { Button } from "components/ui/button";
import { Calendar } from "components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "components/ui/popover";
import { ScrollArea, ScrollBar } from "components/ui/scroll-area";

// trigger 可选：传入时用自定义元素作为弹出触发器（需能接收 ref 和点击事件），不传则使用默认按钮
export function DateTimePicker24h({ date, setDate = undefined, onDateSelect = undefined, trigger = undefined }: { date: Date | undefined, setDate?: React.Dispatch<React.SetStateAction<Date>>, onDateSelect?: (date: Date) => void, trigger?: React.ReactNode }) {
    const [isOpen, setIsOpen] = React.useState(false);

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const handleDateSelect = (selectedDate: Date | undefined) => {
        if (selectedDate) {
            if (setDate) {
                setDate(selectedDate);
            }
            if (onDateSelect) {
                onDateSelect(selectedDate);
            }
        }
    };

    const handleTimeChange = (
        type: "hour" | "minute",
        value: string
    ) => {
        if (date) {
            const newDate = new Date(date);
            if (type === "hour") {
                newDate.setHours(parseInt(value));
            } else if (type === "minute") {
                newDate.setMinutes(parseInt(value));
            }
            if (setDate) {
                setDate(newDate);
            }
            if (onDateSelect) {
                onDateSelect(newDate)
            }
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                {trigger ?? <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? (
                        format(date, "MM/dd/yyyy HH:mm")
                    ) : (
                        <span>MM/DD/YYYY hh:mm</span>
                    )}
                </Button>}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <div className="sm:flex">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleDateSelect}
                        initialFocus
                    />
                    <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
                        <ScrollArea className="w-64 sm:w-auto">
                            <div className="flex sm:flex-col p-2">
                                {hours.reverse().map((hour) => (
                                    <Button
                                        key={hour}
                                        size="icon"
                                        variant={date && date.getHours() === hour ? "default" : "ghost"}
                                        className="sm:w-full shrink-0 aspect-square"
                                        onClick={() => handleTimeChange("hour", hour.toString())}
                                    >
                                        {hour}
                                    </Button>
                                ))}
                            </div>
                            <ScrollBar orientation="horizontal" className="sm:hidden" />
                        </ScrollArea>
                        <ScrollArea className="w-64 sm:w-auto">
                            <div className="flex sm:flex-col p-2">
                                {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                                    <Button
                                        key={minute}
                                        size="icon"
                                        variant={date && date.getMinutes() === minute ? "default" : "ghost"}
                                        className="sm:w-full shrink-0 aspect-square"
                                        onClick={() => handleTimeChange("minute", minute.toString())}
                                    >
                                        {minute.toString().padStart(2, '0')}
                                    </Button>
                                ))}
                            </div>
                            <ScrollBar orientation="horizontal" className="sm:hidden" />
                        </ScrollArea>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
