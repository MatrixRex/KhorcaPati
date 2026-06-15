import * as React from "react"
import { useState, useMemo } from "react"
import { format, startOfDay, addDays, subDays, isSameDay } from "date-fns"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react"
import { motion } from "framer-motion"
import i18next from "i18next"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { getNearbyDates } from "@/utils/date"

interface DatePickerProps {
    date?: Date;
    setDate: (date?: Date) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>;
    
    // Drawer variant additions
    variant?: 'default' | 'drawer';
    onNext?: () => void;
}

export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
    ({ date, setDate, placeholder = "Pick a date", className, disabled, onKeyDown, variant = 'default', onNext }, ref) => {
        const { t } = useTranslation()
        const [open, setOpen] = useState(false)
        const [view, setView] = useState<'swipe' | 'scroll' | 'calendar'>('swipe')
        const [tempDate, setTempDate] = useState<Date>(date || new Date())

        const nearbyDates = useMemo(() => {
            return getNearbyDates(new Date(), 30)
        }, [])

        const today = startOfDay(new Date())
        const isSelectedDateToday = isSameDay(startOfDay(tempDate), today)

        const handlePrevDay = () => {
            setTempDate(prev => subDays(startOfDay(prev), 1))
        }

        const handleNextDay = () => {
            const next = addDays(startOfDay(tempDate), 1)
            if (next <= today) {
                setTempDate(next)
            }
        }

        const handleConfirm = () => {
            setDate(tempDate)
            setOpen(false)
            setTimeout(() => onNext?.(), 100)
        }

        const handleCrossClick = () => {
            if (view === 'swipe') {
                setOpen(false)
                setDate(tempDate)
            } else {
                setView('swipe')
            }
        }

        const formattedDateText = new Intl.DateTimeFormat(i18next.language, {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(tempDate)

        // Drawer presentation variant
        if (variant === 'drawer') {
            return (
                <Sheet open={open} onOpenChange={(val) => {
                    setOpen(val)
                    if (!val) {
                        // When drawer is closed (swiped down or backdrop clicked), save current tempDate
                        setDate(tempDate)
                    }
                }}>
                    <Button
                        ref={ref}
                        type="button"
                        variant={"outline"}
                        disabled={disabled}
                        className={cn(
                            "w-full justify-start text-left font-normal overflow-hidden",
                            !date && "text-muted-foreground",
                            className
                        )}
                        onKeyDown={onKeyDown}
                        onClick={() => {
                            if (date) {
                                setTempDate(date)
                            }
                            setView('swipe')
                            setOpen(true)
                        }}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                        <span className="truncate text-xs font-black uppercase tracking-tight">
                            {date ? format(date, "MMMM do, yy") : placeholder}
                        </span>
                    </Button>
                    <SheetContent
                        id="date-picker-drawer"
                        side="bottom"
                        showCloseButton={false}
                        className="z-[100] p-0 border-t-2 border-primary/20 bg-background/95 backdrop-blur-md rounded-t-3xl max-w-[480px]"
                        overlayClassName="z-[99]"
                    >
                        <SheetHeader className="pb-2 pt-4 border-b border-border/40 flex flex-row items-center justify-between px-6 relative">
                            <SheetTitle className="text-base font-black uppercase tracking-wider text-primary">
                                {t('selectDate', { defaultValue: 'Select Date' })}
                            </SheetTitle>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleCrossClick}
                                className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-full hover:bg-muted active:scale-95 transition-all duration-200"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </SheetHeader>

                        {view === 'swipe' && (
                            <div className="flex items-center justify-between px-6 py-6 gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handlePrevDay}
                                    className="h-10 w-10 p-0 rounded-full hover:bg-primary/5 text-primary shrink-0 active:scale-90 transition-all duration-200"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </Button>

                                <div className="flex-1 overflow-hidden relative h-28 flex items-center justify-center">
                                    <motion.div
                                        key={tempDate.toISOString()}
                                        drag="x"
                                        dragConstraints={{ left: 0, right: 0 }}
                                        dragElastic={0.6}
                                        onDragEnd={(_event, info) => {
                                            const swipeThreshold = 50
                                            if (info.offset.x > swipeThreshold) {
                                                handlePrevDay()
                                            } else if (info.offset.x < -swipeThreshold) {
                                                handleNextDay()
                                            }
                                        }}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        onClick={() => setView('scroll')}
                                        className="cursor-grab active:cursor-grabbing w-full h-full flex flex-col justify-center items-center rounded-2xl bg-primary/[0.03] border border-primary/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:bg-primary/[0.05] transition-colors p-4"
                                    >
                                        <span className="text-sm font-black text-foreground text-center">
                                            {formattedDateText}
                                        </span>
                                        <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mt-2">
                                            {t('tapToScrollDates', { defaultValue: 'Tap to scroll nearby dates' })}
                                        </span>
                                    </motion.div>
                                </div>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleNextDay}
                                    disabled={isSelectedDateToday}
                                    className="h-10 w-10 p-0 rounded-full hover:bg-primary/5 text-primary shrink-0 active:scale-90 transition-all duration-200 disabled:opacity-20"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </Button>
                            </div>
                        )}

                        {view === 'scroll' && (
                            <div className="flex flex-col h-96 overflow-y-auto py-2 px-6 gap-1 divide-y divide-border/10">
                                {nearbyDates.map((item) => (
                                    <button
                                        key={item.formattedValue}
                                        type="button"
                                        onClick={() => {
                                            setTempDate(item.date)
                                            setView('swipe')
                                        }}
                                        className={cn(
                                            "w-full text-left py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-200 active:scale-[0.98]",
                                            isSameDay(tempDate, item.date)
                                                ? "bg-primary text-primary-foreground shadow-md font-black"
                                                : "hover:bg-muted text-foreground/80"
                                        )}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {view === 'calendar' && (
                            <div className="flex justify-center p-4 pt-10">
                                <Calendar
                                    mode="single"
                                    selected={tempDate}
                                    onSelect={(d) => {
                                        if (d) {
                                            setTempDate(d)
                                            setView('swipe')
                                        }
                                    }}
                                    disabled={(d) => d > new Date()}
                                    initialFocus
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-4 p-4 border-t border-border/40 bg-muted/20">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => setView(view === 'calendar' ? 'swipe' : 'calendar')}
                                className={cn(
                                    "h-12 w-12 rounded-xl border-primary/20 shrink-0",
                                    view === 'calendar' && "bg-primary/10 text-primary border-primary"
                                )}
                            >
                                <CalendarIcon className="w-5 h-5" />
                            </Button>
                            <Button
                                type="button"
                                onClick={handleConfirm}
                                className="flex-1 h-12 btn-premium text-xs uppercase tracking-widest"
                            >
                                {t('next')}
                            </Button>
                        </div>
                    </SheetContent>
                </Sheet>
            )
        }

        // Standard popover presentation variant
        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild disabled={disabled}>
                    <Button
                        ref={ref}
                        variant={"outline"}
                        disabled={disabled}
                        className={cn(
                            "w-full justify-start text-left font-normal overflow-hidden",
                            !date && "text-muted-foreground",
                            className
                        )}
                        onKeyDown={onKeyDown}
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
)

DatePicker.displayName = "DatePicker"
