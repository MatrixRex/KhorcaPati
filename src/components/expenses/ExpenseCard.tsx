import { type Expense } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeDate } from '@/utils/date';

interface ExpenseCardProps {
    expense: Expense;
    onClick?: () => void;
}

export function ExpenseCard({ expense, onClick }: ExpenseCardProps) {
    return (
        <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={onClick}
        >
            <CardContent className="px-4 py-2 flex items-center justify-between">
                <div className="flex flex-col flex-1 overflow-hidden pr-2">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-sm truncate">
                            {expense.note || ""}
                        </h3>
                        {expense.isRecurring && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">
                                ↺ {expense.recurringInterval}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center text-[11px] text-muted-foreground gap-2">
                        <span>{formatRelativeDate(expense.date, true)}</span>
                        <span className="opacity-50">•</span>
                        <span className="truncate">{expense.category}</span>
                    </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                    <span className="font-bold text-base text-primary">
                        ৳{expense.amount.toFixed(2)}
                    </span>
                    {expense.parentId && (
                        <Badge variant="outline" className="text-[9px] scale-90 origin-right h-3.5">
                            Sub
                        </Badge>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
