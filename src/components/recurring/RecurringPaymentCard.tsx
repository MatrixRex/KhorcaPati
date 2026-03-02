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
                "cursor-pointer hover:bg-muted/50 transition-colors border-l-4 shadow-none",
                isOverdue ? "border-l-destructive" : isWithin5Days ? "border-l-amber-500" : "border-l-primary"
            )}
            onClick={onClick}
        >
            <CardContent className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex flex-col flex-1 overflow-hidden pr-2">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-sm truncate">
                            {payment.title}
                        </h3>
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 capitalize flex items-center">
                            <Clock className="w-2 h-2 mr-0.5" /> {payment.interval}
                        </Badge>
                        {isWithin5Days && !isOverdue && (
                            <span className="text-[9px] font-medium text-amber-600 ml-1">
                                in {diffInDays} {diffInDays === 1 ? 'day' : 'days'}
                            </span>
                        )}
                        {isOverdue && (
                            <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5 uppercase font-bold animate-pulse">
                                Overdue
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center text-[11px] gap-2">
                        {isOverdue ? (
                            <span className="text-destructive flex items-center font-medium">
                                <AlertCircle className="w-2.5 h-2.5 mr-0.5" /> {formatRelativeDate(nextDate, true)}
                            </span>
                        ) : (
                            <span className={cn(
                                "flex items-center",
                                isWithin5Days ? "text-amber-600 font-medium" : "text-muted-foreground"
                            )}>
                                <Calendar className="w-2.5 h-2.5 mr-0.5" /> {formatRelativeDate(nextDate, true)}
                            </span>
                        )}
                        <span className="text-muted-foreground/50">•</span>
                        <span className="text-muted-foreground truncate opacity-80">{payment.category}</span>
                    </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                    <span className={cn(
                        "font-bold text-base",
                        isOverdue ? "text-destructive" : "text-primary"
                    )}>
                        ৳{payment.amount.toFixed(2)}
                    </span>
                    {payment.note && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[80px] opacity-70">
                            {payment.note}
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
