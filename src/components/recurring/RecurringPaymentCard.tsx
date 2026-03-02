import { type RecurringPayment } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { parseISO, differenceInCalendarDays } from 'date-fns';
import { Calendar, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeDate } from '@/utils/date';

interface RecurringPaymentCardProps {
    payment: RecurringPayment;
    onClick?: () => void;
}

export function RecurringPaymentCard({ payment, onClick }: RecurringPaymentCardProps) {
    const nextDate = parseISO(payment.nextDueDate);
    const now = new Date();
    const diffInDays = differenceInCalendarDays(nextDate, now);
    const isOverdue = diffInDays < 0;
    const isWithin5Days = diffInDays >= 0 && diffInDays <= 5;

    return (
        <Card
            className={cn(
                "mb-2 cursor-pointer hover:bg-muted/50 transition-colors border-l-4",
                isOverdue ? "border-l-destructive shadow-sm" : isWithin5Days ? "border-l-amber-500" : "border-l-primary"
            )}
            onClick={onClick}
        >
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex flex-col flex-1 overflow-hidden pr-2">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base truncate">
                            {payment.title}
                        </h3>
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 capitalize">
                            <Clock className="w-2.5 h-2.5 mr-1" /> {payment.interval}
                        </Badge>
                        {isWithin5Days && !isOverdue && (
                            <span className="text-[10px] font-medium text-amber-600 ml-1">
                                in {diffInDays} {diffInDays === 1 ? 'day' : 'days'}
                            </span>
                        )}
                        {isOverdue && (
                            <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4 uppercase font-bold animate-pulse">
                                Overdue
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center text-xs gap-2">
                        {isOverdue ? (
                            <span className="text-destructive flex items-center font-medium">
                                <AlertCircle className="w-3 h-3 mr-1" /> Missed: {formatRelativeDate(nextDate, true)}
                            </span>
                        ) : (
                            <span className={cn(
                                "flex items-center",
                                isWithin5Days ? "text-amber-600 font-medium" : "text-muted-foreground"
                            )}>
                                <Calendar className="w-3 h-3 mr-1" /> Next: {formatRelativeDate(nextDate, true)}
                            </span>
                        )}
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground truncate">{payment.category}</span>
                    </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                    <span className={cn(
                        "font-bold text-lg",
                        isOverdue ? "text-destructive" : "text-primary"
                    )}>
                        ৳{payment.amount.toFixed(2)}
                    </span>
                    {payment.note && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                            {payment.note}
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
