import { useState } from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    date?: Date;
    setDate: (date?: Date) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export function DatePicker({ date, setDate, placeholder = "Pick a date", className, disabled }: DatePickerProps) {
    const [open, setOpen] = useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild disabled={disabled}>
                <Button
                    variant={"outline"}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-start text-left font-normal overflow-hidden",
                        !date && "text-muted-foreground",
                        className
                    )}
                >

                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate text-xs font-black uppercase tracking-tight">
                        {date ? format(date, "MMMM do, yy") : placeholder}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[100] !bg-background/80 backdrop-blur-md border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                        setDate(d);
                        setOpen(false);
                    }}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}
