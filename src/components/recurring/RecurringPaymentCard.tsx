import { type RecurringPayment } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { Calendar, AlertCircle, Clock } from 'lucide-react';

interface RecurringPaymentCardProps {
    payment: RecurringPayment;
    onClick?: () => void;
}

export function RecurringPaymentCard({ payment, onClick }: RecurringPaymentCardProps) {
    const nextDate = parseISO(payment.nextDueDate);
    const isMissed = isPast(nextDate) && !isToday(nextDate);

    return (
        <Card
            className="mb-2 cursor-pointer hover:bg-muted/50 transition-colors border-l-4 border-l-blue-500"
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
                    </div>
                    <div className="flex items-center text-xs gap-2">
                        {isMissed ? (
                            <span className="text-destructive flex items-center font-medium">
                                <AlertCircle className="w-3 h-3 mr-1" /> Missed: {format(nextDate, 'MMM d, yyyy')}
                            </span>
                        ) : (
                            <span className="text-muted-foreground flex items-center">
                                <Calendar className="w-3 h-3 mr-1" /> Next: {format(nextDate, 'MMM d, yyyy')}
                            </span>
                        )}
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground truncate">{payment.category}</span>
                    </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                    <span className="font-bold text-lg text-primary">
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
