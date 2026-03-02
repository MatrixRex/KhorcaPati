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
            className="mb-2 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={onClick}
        >
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex flex-col flex-1 overflow-hidden pr-2">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base truncate">
                            {expense.note || ""}
                        </h3>
                        {expense.isRecurring && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                ↺ {expense.recurringInterval}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                        <span>{formatRelativeDate(expense.date, true)}</span>
                        <span>•</span>
                        <span className="truncate">{expense.category}</span>
                    </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                    <span className="font-bold text-lg text-primary">
                        ৳{expense.amount.toFixed(2)}
                    </span>
                    {expense.parentId && (
                        <Badge variant="outline" className="text-[10px] scale-90 origin-right mt-1">
                            Sub
                        </Badge>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
