import { type Expense } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatRelativeDate } from '@/utils/date';

interface ExpenseCardProps {
    expense: Expense;
    onClick?: () => void;
}

export function ExpenseCard({ expense, onClick }: ExpenseCardProps) {
    return (
        <Card
            className="cursor-pointer hover:bg-muted/30 active:scale-[0.98] transition-all border-border/40 shadow-sm rounded-2xl overflow-hidden group"
            onClick={onClick}
        >
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex flex-col flex-1 overflow-hidden pr-2">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-sm tracking-tight truncate group-hover:text-primary transition-colors capitalize">
                            {expense.note || expense.type}
                        </h3>
                        {expense.isRecurring && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-bold uppercase tracking-wider">
                                ↺ {expense.recurringInterval}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center text-[11px] font-medium text-muted-foreground/70 gap-2">
                        <span>{formatRelativeDate(expense.date, true)}</span>
                        <span className="opacity-30">•</span>
                        <span className="truncate uppercase tracking-tighter">{expense.category}</span>
                    </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                    <span className={cn(
                        "font-black text-base",
                        expense.type === 'income' ? "text-green-600" : "text-primary"
                    )}>
                        {expense.type === 'income' ? '+' : ''}৳{expense.amount.toFixed(0)}
                    </span>
                    {expense.parentId && (
                        <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20 text-primary px-1 h-3.5 mt-0.5">
                            Sub
                        </Badge>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
