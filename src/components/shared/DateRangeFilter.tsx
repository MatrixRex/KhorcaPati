import * as React from 'react';
import { format } from 'date-fns';
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

export function DateRangeFilter() {
    const { timeframe, startDate, endDate, setTimeframe, setDateRange } = useFilterStore();
    const [isOpen, setIsOpen] = React.useState(false);
    const [showCustom, setShowCustom] = React.useState(timeframe === 'custom');

    // Sync showCustom with timeframe when popover opens
    React.useEffect(() => {
        if (isOpen) {
            setShowCustom(timeframe === 'custom');
        }
    }, [isOpen, timeframe]);

    const label = React.useMemo(() => {
        if (timeframe === 'this-month') return 'This Month';
        if (timeframe === 'this-week') return 'This Week';
        return `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')}`;
    }, [timeframe, startDate, endDate]);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 px-2 text-xs font-medium hover:bg-accent/50 group"
                >
                    <CalendarIcon className="h-3.5 w-3.5 opacity-60" />
                    <span>{label}</span>
                    <ChevronDown className={cn("h-3 w-3 opacity-40 transition-transform duration-200", isOpen && "rotate-180")} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 overflow-hidden" align="end">
                <div className="flex flex-col p-2 space-y-1">
                    <Button
                        variant={timeframe === 'this-month' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="justify-start font-normal"
                        onClick={() => {
                            setTimeframe('this-month');
                            setIsOpen(false);
                        }}
                    >
                        This Month
                    </Button>
                    <Button
                        variant={timeframe === 'this-week' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="justify-start font-normal"
                        onClick={() => {
                            setTimeframe('this-week');
                            setIsOpen(false);
                        }}
                    >
                        This Week
                    </Button>
                    <Button
                        variant={(timeframe === 'custom' || showCustom) ? 'secondary' : 'ghost'}
                        size="sm"
                        className="justify-start font-normal"
                        onClick={() => setShowCustom(true)}
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
                            <div className="relative"> {/* Container for absolute navigation fix */}
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={startDate}
                                    selected={{
                                        from: startDate,
                                        to: endDate,
                                    }}
                                    onSelect={(range) => {
                                        if (range?.from && range?.to) {
                                            setDateRange(range.from, range.to);
                                        } else if (range?.from) {
                                            useFilterStore.setState({ startDate: range.from, endDate: range.from, timeframe: 'custom' });
                                        }
                                    }}
                                    numberOfMonths={1}
                                    className="p-0"
                                />
                            </div>
                            {timeframe === 'custom' && (
                                <div className="flex items-center justify-between gap-2 border-t pt-2 mt-2 pb-1 px-1">
                                    <div className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                                        {format(startDate, 'MMM dd')} - {format(endDate, 'MMM dd, yyyy')}
                                    </div>
                                    <Button
                                        size="sm"
                                        className="h-7 px-3 text-[11px] font-bold shadow-sm"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        Apply
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
