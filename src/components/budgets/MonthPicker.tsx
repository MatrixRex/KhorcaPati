import * as React from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { format, parse } from 'date-fns';
import { cn } from '@/lib/utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthPickerProps {
    value: string; // "yyyy-MM"
    onChange: (value: string) => void;
}

export function MonthPicker({ value, onChange }: MonthPickerProps) {
    const [open, setOpen] = React.useState(false);

    const parsed = React.useMemo(() => {
        try {
            return parse(value, 'yyyy-MM', new Date());
        } catch {
            return new Date();
        }
    }, [value]);

    const [year, setYear] = React.useState(parsed.getFullYear());
    const selectedMonth = parsed.getMonth();
    const selectedYear = parsed.getFullYear();

    // Sync year display when value changes externally
    React.useEffect(() => {
        setYear(parsed.getFullYear());
    }, [parsed]);

    const handleSelect = (monthIndex: number) => {
        const newDate = new Date(year, monthIndex, 1);
        onChange(format(newDate, 'yyyy-MM'));
        setOpen(false);
    };

    const displayLabel = format(parsed, 'MMMM yyyy');

    return (
        <div className="relative">
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    'flex items-center gap-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                    'transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    open && 'ring-2 ring-ring ring-offset-2'
                )}
            >
                <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{displayLabel}</span>
            </button>

            {/* Dropdown picker */}
            {open && (
                <div className="mt-1 rounded-xl border border-border bg-popover shadow-xl overflow-hidden z-50 w-full">
                    {/* Year navigation */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <button
                            type="button"
                            onClick={() => setYear((y) => y - 1)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-semibold">{year}</span>
                        <button
                            type="button"
                            onClick={() => setYear((y) => y + 1)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Month grid */}
                    <div className="grid grid-cols-3 gap-1.5 p-3">
                        {MONTHS.map((label, idx) => {
                            const isSelected = idx === selectedMonth && year === selectedYear;
                            const isCurrentMonth =
                                idx === new Date().getMonth() && year === new Date().getFullYear();
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => handleSelect(idx)}
                                    className={cn(
                                        'rounded-lg py-2 text-sm font-medium transition-all',
                                        isSelected
                                            ? 'bg-primary text-primary-foreground shadow'
                                            : isCurrentMonth
                                                ? 'bg-muted text-foreground ring-1 ring-primary/40'
                                                : 'hover:bg-muted text-foreground'
                                    )}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
