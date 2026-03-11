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
    const isUpcoming = diffInDays >= 0 && diffInDays <= 7;

    return (
        <Card
            className={cn(
                "cursor-pointer hover:bg-muted/30 active:scale-[0.98] transition-all border-border/40 shadow-sm rounded-2xl overflow-hidden group border-l-4",
                isOverdue ? "border-l-destructive bg-destructive/5" : isUpcoming ? "border-l-amber-500 bg-amber-500/5" : "border-l-green-500 bg-green-500/5 shadow-none opacity-80"
            )}
            onClick={onClick}
        >
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex flex-col flex-1 overflow-hidden pr-2">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-sm tracking-tight truncate group-hover:text-primary transition-colors">
                            {payment.title}
                        </h3>
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-bold uppercase tracking-wider flex items-center">
                            <Clock className="w-2 h-2 mr-1" /> {payment.interval}
                        </Badge>
                        {isUpcoming && !isOverdue && (
                            <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                                In {diffInDays} {diffInDays === 1 ? 'day' : 'days'}
                            </span>
                        )}
                        {isOverdue && (
                            <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 uppercase font-black tracking-widest animate-pulse">
                                Overdue
                            </Badge>
                        )}
                        {!isOverdue && !isUpcoming && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 uppercase font-bold tracking-tight bg-green-100 text-green-700 hover:bg-green-100">
                                Paid / Scheduled
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center text-[11px] font-medium gap-2">
                        {isOverdue ? (
                            <span className="text-destructive flex items-center font-bold uppercase tracking-tighter">
                                <AlertCircle className="w-3 h-3 mr-1" /> {formatRelativeDate(nextDate, true)}
                            </span>
                        ) : (
                            <span className={cn(
                                "flex items-center",
                                isUpcoming ? "text-amber-600 font-bold uppercase tracking-tighter" : "text-muted-foreground/70 font-medium"
                            )}>
                                <Calendar className="w-3 h-3 mr-1" /> {formatRelativeDate(nextDate, true)}
                            </span>
                        )}
                        <span className="text-muted-foreground/30">•</span>
                        <span className="text-muted-foreground/70 truncate uppercase tracking-tighter">{payment.category}</span>
                    </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                    <span className={cn(
                        "font-black text-base transition-colors",
                        isOverdue ? "text-destructive" : payment.type === 'income' ? "text-green-600" : "text-primary group-hover:text-primary"
                    )}>
                        {payment.type === 'income' ? '+' : ''}৳{payment.amount.toFixed(0)}
                    </span>
                    {payment.note && (
                        <span className="text-[9px] text-muted-foreground/60 truncate max-w-[80px] font-medium italic mt-0.5">
                            {payment.note}
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
