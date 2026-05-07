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
import { useFilterStore } from '@/stores/filterStore';
import { useTranslation } from 'react-i18next';

export function DateRangeFilter() {
    const { t } = useTranslation();
    const { timeframe, startDate, endDate, setTimeframe, setDateRange } = useFilterStore();
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

    const label = React.useMemo(() => {
        if (timeframe === 'today') return t('today');
        if (timeframe === 'this-week') return t('thisWeek') || 'This Week';
        if (timeframe === 'this-month') return format(new Date(), 'MMMM');
        if (timeframe === 'past-month') return t('pastMonth') || 'Past Month';
        return `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')}`;
    }, [timeframe, startDate, endDate, t]);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 px-2 text-xs font-medium active:bg-accent/50 group"
                >
                    <CalendarIcon className="h-3.5 w-3.5 opacity-60" />
                    <span>{label}</span>
                    <ChevronDown className={cn("h-3 w-3 opacity-40 transition-transform duration-200", isOpen && "rotate-180")} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" align="end">
                <div className="flex flex-col space-y-1">
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
                        {t('thisWeek') || 'This Week'}
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
                        {format(new Date(), 'MMMM')}
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
                        {t('pastMonth') || 'Past Month'}
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
                        <div className="border-t pt-2 mt-2 px-1 animate-in fade-in slide-in-from-top-1 duration-200">
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
                </div>
            </PopoverContent>
        </Popover>
    );
}
