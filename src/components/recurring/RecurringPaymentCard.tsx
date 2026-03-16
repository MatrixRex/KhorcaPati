import { type RecurringPayment } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { parseISO, differenceInCalendarDays } from 'date-fns';
import { Calendar, AlertCircle, Clock } from 'lucide-react';
import { cn, formatAmount } from '@/lib/utils';
import { formatRelativeDate } from '@/utils/date';
import { useCategoryStore } from '@/stores/categoryStore';

import { useTranslation } from 'react-i18next';

interface RecurringPaymentCardProps {
    payment: RecurringPayment;
    onClick?: () => void;
}

export function RecurringPaymentCard({ payment, onClick }: RecurringPaymentCardProps) {
    const { t } = useTranslation();
    const nextDate = parseISO(payment.nextDueDate);
    const now = new Date();
    const diffInDays = differenceInCalendarDays(nextDate, now);
    const isOverdue = diffInDays < 0;
    const isUpcoming = diffInDays >= 0 && diffInDays <= 7;

    const { categories } = useCategoryStore();
    const catInfo = categories.find(c => c.name.toLowerCase() === payment.category.toLowerCase());
    const catColor = catInfo?.color || '#3b82f6';

    return (
        <Card
            className={cn(
                "cursor-pointer active:scale-[0.98] transition-all border-border/40 shadow-sm rounded-xl overflow-hidden group relative",
                isUpcoming ? "bg-amber-500/5" : "bg-green-500/5 shadow-none opacity-80",
                isOverdue && "bg-destructive/10 border-destructive/20"
            )}
            style={{ 
                background: `linear-gradient(to right, ${catColor}1F, transparent)`
            }}
            onClick={onClick}
        >
            {/* Categorical Glow (Standardized) */}
            <div 
                className={cn(
                    "card-glow",
                    isOverdue && "overdue-glow"
                )}
                style={{ backgroundColor: isOverdue ? 'oklch(var(--destructive))' : isUpcoming ? 'oklch(var(--warning))' : catColor }}
            />
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex flex-col flex-1 overflow-hidden pr-2">
                    <div className="flex flex-col mb-1.5">
                        <h3 className="font-bold text-base tracking-tight truncate leading-tight mb-1">
                            {payment.title}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-bold uppercase tracking-wider flex items-center shrink-0">
                                <Clock className="w-2 h-2 mr-1" /> {t(payment.interval.toLowerCase())}
                            </Badge>
                            {isUpcoming && !isOverdue && (
                                <Badge variant="secondary" className="text-[10px] px-2 py-0 h-4 font-black uppercase text-amber-600 bg-amber-500/10 border-amber-500/20">
                                    {t('inDaysShort', { count: diffInDays })}
                                </Badge>
                            )}
                            {isOverdue && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 uppercase font-black tracking-widest animate-pulse">
                                    {t('overdue')}
                                </Badge>
                            )}
                            {!isOverdue && !isUpcoming && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 uppercase font-bold tracking-tight bg-green-100 text-green-700 border-green-200">
                                    {t('paidScheduled')}
                                </Badge>
                            )}
                        </div>
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
                        isOverdue ? "text-destructive" : payment.type === 'income' ? "text-green-600" : "text-red-600"
                    )}>
                        {payment.type === 'income' ? '+' : ''}৳{formatAmount(payment.amount)}
                    </span>
                    {payment.note && (
                        <span className="text-[10px] text-muted-foreground/60 truncate max-w-[100px] font-medium italic mt-1 text-right">
                            {payment.note}
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
