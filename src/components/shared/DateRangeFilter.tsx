import * as React from 'react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useFilterStore, type Timeframe } from '@/stores/filterStore';
import { useTranslation } from 'react-i18next';

interface DateRangePickerProps {
    timeframe: Timeframe;
    startDate: Date;
    endDate: Date;
    onTimeframe: (tf: Timeframe) => void;
    onRange: (start: Date, end: Date) => void;
    /** Extra content shown at the top of the popover (e.g. an "All time" switch). */
    header?: React.ReactNode;
    /** Replaces the trigger label (e.g. "All time"). */
    labelOverride?: string;
    /** Open the popover upwards (for bottom-anchored triggers). */
    side?: 'top' | 'bottom';
    triggerClassName?: string;
    /** Open in the middle of the screen (both axes) instead of beside the trigger. */
    centered?: boolean;
    /** Hide the range options (e.g. while "All time" is on). */
    hideOptions?: boolean;
}

export function DateRangeFilter() {
    const { timeframe, startDate, endDate, setTimeframe, setDateRange } = useFilterStore();
    return (
        <DateRangePicker
            timeframe={timeframe}
            startDate={startDate}
            endDate={endDate}
            onTimeframe={setTimeframe}
            onRange={setDateRange}
        />
    );
}

export function DateRangePicker({
    timeframe, startDate, endDate, onTimeframe: setTimeframe, onRange: setDateRange,
    header, labelOverride, side, triggerClassName, centered, hideOptions,
}: DateRangePickerProps) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = React.useState(false);
    const [showCustom, setShowCustom] = React.useState(timeframe === 'custom');
    const [range, setRange] = React.useState<DateRange | undefined>(
        timeframe === 'custom' ? { from: startDate, to: endDate } : undefined
    );

    // Sync showCustom and range with timeframe when popover opens
    React.useEffect(() => {
        if (isOpen) {
            setShowCustom(timeframe === 'custom');
            setRange(timeframe === 'custom' ? { from: startDate, to: endDate } : undefined);
        }
    }, [isOpen, timeframe, startDate, endDate]);

    const customRef = React.useRef<HTMLDivElement>(null);

    // Keep the calendar reachable when it opens inside a height-limited popover.
    React.useEffect(() => {
        if (showCustom && isOpen) {
            customRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [showCustom, isOpen]);

    const label = React.useMemo(() => {
        if (labelOverride) return labelOverride;
        if (timeframe === 'today') return t('today');
        if (timeframe === 'this-week') return t('thisWeek') || 'Week';
        if (timeframe === 'this-month') return format(new Date(), 'MMM');
        if (timeframe === 'past-month') return t('pastMonth') || 'Month';
        return `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')}`;
    }, [timeframe, startDate, endDate, labelOverride, t]);

    const body = (
        <>
                {header}
                {!hideOptions && <div className="flex flex-col space-y-1">
                    <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('timeRange')}
                    </div>
                    <Button
                        variant={timeframe === 'today' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="justify-start font-normal h-9"
                        onClick={() => {
                            setTimeframe('today');
                            setIsOpen(false);
                        }}
                    >
                        {t('today')}
                    </Button>
                    <Button
                        variant={timeframe === 'this-week' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="justify-start font-normal h-9"
                        onClick={() => {
                            setTimeframe('this-week');
                            setIsOpen(false);
                        }}
                    >
                        {t('thisWeek') || 'Week'}
                    </Button>
                    <Button
                        variant={timeframe === 'this-month' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="justify-start font-normal h-9"
                        onClick={() => {
                            setTimeframe('this-month');
                            setIsOpen(false);
                        }}
                    >
                        {format(new Date(), 'MMM')}
                    </Button>
                    <Button
                        variant={timeframe === 'past-month' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="justify-start font-normal h-9"
                        onClick={() => {
                            setTimeframe('past-month');
                            setIsOpen(false);
                        }}
                    >
                        {t('pastMonth') || 'Month'}
                    </Button>
                    <Button
                        variant={(timeframe === 'custom' || showCustom) ? 'secondary' : 'ghost'}
                        size="sm"
                        className="justify-start font-normal h-9"
                        onClick={() => {
                            setShowCustom(true);
                            if (timeframe !== 'custom') {
                                setRange(undefined);
                            }
                        }}
                    >
                        Custom Range
                    </Button>

                    {showCustom && (
                        <div ref={customRef} className="border-t pt-2 mt-2 px-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex items-center justify-between mb-2 px-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Pick Range
                                </span>
                                {timeframe === 'custom' && (
                                    <span className="text-[10px] font-bold text-primary">
                                        Active
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={range?.from || startDate}
                                    selected={range}
                                    onSelect={(newRange) => {
                                        if (!range || (range.from && range.to)) {
                                            // Start new selection if no range or if range was already complete
                                            setRange({ from: newRange?.from, to: undefined });
                                        } else {
                                            // Complete the selection
                                            setRange(newRange);
                                            if (newRange?.from && newRange?.to) {
                                                setDateRange(newRange.from, newRange.to);
                                                // Small delay to let the user see the selection before closing
                                                setTimeout(() => setIsOpen(false), 300);
                                            }
                                        }
                                    }}
                                    numberOfMonths={1}
                                    className="p-0"
                                />
                            </div>
                            {timeframe === 'custom' && (
                                <div className="flex items-center justify-center border-t pt-2 mt-2 pb-1 px-1">
                                    <div className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                                        {format(startDate, 'MMM dd')} - {format(endDate, 'MMM dd, yy')}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>}
        </>
    );

    const trigger = (
        <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 gap-1 px-2 text-xs font-medium active:bg-accent/50 group", triggerClassName)}
        >
            <CalendarIcon className="h-3.5 w-3.5 opacity-60" />
            <span>{label}</span>
            <ChevronDown className={cn("h-3 w-3 opacity-40 transition-transform duration-200", isOpen && "rotate-180")} />
        </Button>
    );

    // Centered: a real dialog, so it sits in the middle of the viewport regardless of
    // transformed ancestors (anchored popovers drift when the trigger is inside one).
    if (centered) {
        return (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>{trigger}</DialogTrigger>
                <DialogContent
                    showCloseButton={false}
                    className="w-80 max-w-[calc(100vw-1rem)] p-2 gap-0 max-h-[85dvh] overflow-y-auto rounded-md"
                >
                    <DialogTitle className="sr-only">{t('timeRange')}</DialogTitle>
                    {body}
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen} backdrop>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent
                className="w-80 max-w-[calc(100vw-1rem)] p-2 max-h-[var(--radix-popover-content-available-height)] overflow-y-auto"
                align="end"
                side={side}
                collisionPadding={8}
            >
                {body}
            </PopoverContent>
        </Popover>
    );
}
