import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { useUIStore } from '@/stores/uiStore';
import { useRecurringPaymentStore } from '@/stores/recurringPaymentStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTranslation } from 'react-i18next';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { DevBadge } from '@/components/shared/DevBadge';
import { Edit2, Calendar, Clock, AlertCircle } from 'lucide-react';
import { cn, formatAmount } from '@/lib/utils';
import { formatRelativeDate } from '@/utils/date';
import { format, addDays, addWeeks, addMonths, addYears, parseISO, differenceInCalendarDays } from 'date-fns';

export function RecurringPaymentDetailDrawer() {
    const { t } = useTranslation();
    const {
        isRecurringPaymentDetailOpen,
        recurringPaymentForDetail,
        closeRecurringPaymentDetail,
        openEditRecurringPayment,
        isExpenseSheetOpen,
        isRecurringPaymentSheetOpen,
        isBudgetSheetOpen,
        isGoalSheetOpen,
        isLoanSheetOpen,
        isSubRecordSheetOpen,
        isGoalProgressSheetOpen,
        isBalanceEditDrawerOpen
    } = useUIStore();

    const [recordDate, setRecordDate] = useState<Date>(new Date());

    useEffect(() => {
        if (isRecurringPaymentDetailOpen) {
            setRecordDate(new Date());
        }
    }, [isRecurringPaymentDetailOpen, recurringPaymentForDetail?.id]);

    const addExpense = useExpenseStore((state) => state.addExpense);
    const updateRecurringPayment = useRecurringPaymentStore((state) => state.updateRecurringPayment);
    const deleteRecurringPayment = useRecurringPaymentStore((state) => state.deleteRecurringPayment);
    const { categories } = useCategoryStore();

    // Track active payment via LiveQuery to sync changes dynamically
    const payment = useLiveQuery(
        async () => recurringPaymentForDetail?.id ? await db.recurringPayments.get(recurringPaymentForDetail.id) : null,
        [recurringPaymentForDetail?.id]
    ) || recurringPaymentForDetail;

    const nextDate = payment ? parseISO(payment.nextDueDate) : new Date();
    const now = new Date();
    const diffInDays = payment ? differenceInCalendarDays(nextDate, now) : 0;
    const isOverdue = diffInDays < 0;

    const catInfo = payment ? categories.find(c => c.name.toLowerCase() === payment.category.toLowerCase()) : null;
    const catColor = catInfo?.color || '#3b82f6';

    const isAnySpecializedOpen = isSubRecordSheetOpen || isGoalProgressSheetOpen || useUIStore.getState().isLoanLinkerOpen;
    const isAnyFormOpen = isExpenseSheetOpen || isRecurringPaymentSheetOpen || isBudgetSheetOpen || isGoalSheetOpen || isLoanSheetOpen || isBalanceEditDrawerOpen;

    const getDetailStackLevel = () => {
        if (isAnySpecializedOpen) return isAnyFormOpen ? 2 : 1;
        return isAnyFormOpen ? 1 : 0;
    };

    const getNextDueDate = (current: Date, interval: string) => {
        switch (interval) {
            case 'daily': return addDays(current, 1);
            case 'weekly': return addWeeks(current, 1);
            case 'monthly': return addMonths(current, 1);
            case 'yearly': return addYears(current, 1);
            default: return current;
        }
    };

    const handleConfirm = async () => {
        if (!payment) return;
        try {
            // 1. Create Expense
            await addExpense({
                amount: payment.amount,
                type: payment.type,
                category: payment.category,
                date: format(recordDate, 'yyyy-MM-dd'),
                note: payment.note || '',
                isRecurring: false,
                recurringInterval: null,
                recurringNextDue: null,
                parentId: null,
                isNested: false,
                itemAutoTrack: false,
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            // 2. Update or Delete Recurring schedule
            if (payment.interval === 'one-time') {
                await deleteRecurringPayment(payment.id!);
            } else {
                const currentNext = parseISO(payment.nextDueDate);
                const nextDueDate = getNextDueDate(currentNext, payment.interval);
                await updateRecurringPayment(payment.id!, {
                    nextDueDate: format(nextDueDate, 'yyyy-MM-dd')
                });
            }
            closeRecurringPaymentDetail();
        } catch (err) {
            console.error(err);
        }
    };

    const handleSkip = async () => {
        if (!payment) return;
        try {
            if (payment.interval === 'one-time') {
                await deleteRecurringPayment(payment.id!);
            } else {
                const currentNext = parseISO(payment.nextDueDate);
                const nextDueDate = getNextDueDate(currentNext, payment.interval);
                await updateRecurringPayment(payment.id!, {
                    nextDueDate: format(nextDueDate, 'yyyy-MM-dd')
                });
            }
            closeRecurringPaymentDetail();
        } catch (err) {
            console.error(err);
        }
    };

    const stackedStyle = cn(
        "transition-all duration-500 ease-in-out origin-bottom",
        "data-[stack-level='1']:-translate-y-6 data-[stack-level='1']:scale-[0.97] data-[stack-level='1']:opacity-80 data-[stack-level='1']:brightness-[0.9] data-[stack-level='1']:pointer-events-none",
        "data-[stack-level='2']:-translate-y-12 data-[stack-level='2']:scale-[0.94] data-[stack-level='2']:opacity-60 data-[stack-level='2']:brightness-[0.8] data-[stack-level='2']:pointer-events-none",
        "data-[stack-level='3']:-translate-y-18 data-[stack-level='3']:scale-[0.91] data-[stack-level='3']:opacity-40 data-[stack-level='3']:brightness-[0.7] data-[stack-level='3']:pointer-events-none"
    );

    return (
        <Sheet open={isRecurringPaymentDetailOpen} onOpenChange={(open) => !open && closeRecurringPaymentDetail()}>
            <SheetContent
                side="bottom"
                className={cn(
                    "max-h-[92dvh] h-auto rounded-t-xl p-0 glass backdrop-blur-xl overflow-hidden z-70 flex flex-col",
                    stackedStyle
                )}
                data-stack-level={getDetailStackLevel()}
                style={{ background: `linear-gradient(to bottom, color-mix(in srgb, ${catColor}, transparent 93%), transparent)` }}
            >
                <div className="absolute top-0 left-0 right-0 h-32 opacity-15 blur-3xl pointer-events-none" style={{ backgroundColor: catColor }} />
                <div className="h-1.5 w-12 bg-muted/40 rounded-full mx-auto mt-3 mb-2 relative z-10 shrink-0" />
                {payment && (
                    <div className="flex-1 overflow-y-auto px-6 pb-12 text-foreground relative z-10" data-scroll-container>
                        <SheetHeader className="mb-6 text-left border-b pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-[10px] font-black uppercase tracking-tight text-primary mb-0.5">{t('recurringPaymentDetail')}</span>
                                    <div className="flex items-center gap-1">
                                        <SheetTitle className="text-2xl font-black truncate leading-tight">{payment.title}</SheetTitle>
                                        <DevBadge id="d:recurring-payment-detail" className="mb-0.5" />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full text-primary transition-all shrink-0 active:scale-95 duration-200"
                                            onClick={() => {
                                                openEditRecurringPayment(payment);
                                            }}
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </SheetHeader>

                        <div className="flex flex-col items-center justify-center py-6 text-center">
                            <span className={cn(
                                "text-4xl font-black tracking-tight font-heading mb-2",
                                isOverdue ? "text-destructive" : payment.type === 'income' ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                            )}>
                                {payment.type === 'income' ? '+' : ''}৳{formatAmount(payment.amount)}
                            </span>
                            <div className="flex flex-wrap gap-2 justify-center items-center">
                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                                    <Clock className="w-3.5 h-3.5" />
                                    {t(payment.interval.toLowerCase())}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catColor }} />
                                    {payment.category}
                                </span>
                            </div>
                        </div>

                        <div className="bg-background/25 border border-white/5 rounded-2xl p-5 space-y-4 mb-8">
                            <div className="flex items-start gap-3">
                                {isOverdue ? (
                                    <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                                ) : (
                                    <Calendar className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                                )}
                                <div>
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('recurringDate')}</h4>
                                    <p className={cn(
                                        "text-sm font-black mt-0.5",
                                        isOverdue ? "text-destructive" : "text-foreground"
                                    )}>
                                        {isOverdue ? t('overdue') + ' — ' : ''}{formatRelativeDate(nextDate, true)} ({format(nextDate, 'MMMM d, yyyy')})
                                    </p>
                                </div>
                            </div>

                            {payment.note && (
                                <div className="border-t border-white/5 pt-3">
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{t('note')}</h4>
                                    <p className="text-sm font-medium italic text-muted-foreground/90 pl-3 border-l-2 border-primary/20 py-0.5">
                                        {payment.note}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 mb-6">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('date')}</Label>
                            <DatePicker
                                date={recordDate}
                                setDate={(date) => {
                                    if (date) setRecordDate(date);
                                }}
                                className="input-glass w-full"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <Button
                                type="button"
                                variant="default"
                                onClick={handleConfirm}
                                className="w-full btn-premium active:scale-95 transition-all duration-200"
                            >
                                {t('confirmPayment')}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleSkip}
                                className="w-full btn-secondary-premium active:scale-95 transition-all duration-200"
                            >
                                {t('skipNext')}
                            </Button>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
