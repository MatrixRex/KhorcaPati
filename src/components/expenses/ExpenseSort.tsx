import * as React from 'react';
import { CalendarDays, Calendar, ArrowUpNarrowWide, ArrowDownWideNarrow, ListFilter, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useFilterStore, type ExpenseSortBy } from '@/stores/filterStore';

export function ExpenseSort() {
    const { expenseSortBy, setExpenseSortBy } = useFilterStore();
    const [isOpen, setIsOpen] = React.useState(false);

    const labels: Record<ExpenseSortBy, string> = {
        latest: 'Latest First',
        oldest: 'Oldest First',
        'amount-high': 'Amount: High → Low',
        'amount-low': 'Amount: Low → High'
    };

    const icons: Record<ExpenseSortBy, React.ReactNode> = {
        latest: <CalendarDays className="h-3.5 w-3.5 opacity-60" />,
        oldest: <Calendar className="h-3.5 w-3.5 opacity-60" />,
        'amount-high': <ArrowDownWideNarrow className="h-3.5 w-3.5 opacity-60" />,
        'amount-low': <ArrowUpNarrowWide className="h-3.5 w-3.5 opacity-60" />
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 px-2 text-xs font-medium hover:bg-accent/50 group"
                >
                    <ListFilter className="h-3.5 w-3.5 opacity-60" />
                    <span className="hidden sm:inline">{labels[expenseSortBy]}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 overflow-hidden" align="end">
                <div className="flex flex-col space-y-1">
                    <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Sort Records By
                    </div>
                    {(['latest', 'oldest', 'amount-high', 'amount-low'] as ExpenseSortBy[]).map((option) => (
                        <Button
                            key={option}
                            variant={expenseSortBy === option ? 'secondary' : 'ghost'}
                            size="sm"
                            className="justify-between font-normal h-9"
                            onClick={() => {
                                setExpenseSortBy(option);
                                setIsOpen(false);
                            }}
                        >
                            <span className="flex items-center gap-2 truncate">
                                {icons[option]}
                                {labels[option]}
                            </span>
                            {expenseSortBy === option && <Check className="h-3 w-3" />}
                        </Button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
