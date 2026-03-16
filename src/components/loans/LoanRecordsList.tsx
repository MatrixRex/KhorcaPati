import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Loan } from '@/db/schema';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Edit2, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatRelativeDate } from '@/utils/date';
import { formatAmount } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/uiStore';

interface LoanRecordsListProps {
    loan: Loan;
}

export function LoanRecordsList({ loan }: LoanRecordsListProps) {
    const { t } = useTranslation();
    const openEditExpense = useUIStore((state) => state.openEditExpense);

    const linkedExpenses = useLiveQuery(() => 
        db.expenses
            .where('loanId')
            .equals(loan.id!)
            .toArray()
    , [loan.id]) || [];

    const sortedExpenses = [...linkedExpenses].sort((a, b) => b.date.localeCompare(a.date));

    // For 'taken' (borrowed) loan:
    // primary action (Deposit/Repayment) = expense
    // inverse action (Withdrawal/Borrowed More) = income
    
    // For 'given' (lent) loan:
    // primary action (Deposit/Repayment received) = income
    // inverse action (Withdrawal/Lent More) = expense

    const totalRepayments = linkedExpenses
        .filter(e => (loan.type === 'taken' ? e.type === 'expense' : e.type === 'income'))
        .reduce((s, e) => s + e.amount, 0);
        
    const totalAdditionalAmount = linkedExpenses
        .filter(e => (loan.type === 'taken' ? e.type === 'income' : e.type === 'expense'))
        .reduce((s, e) => s + e.amount, 0);

    const totalGrossAmount = loan.totalAmount + totalAdditionalAmount;
    const remainingAmount = Math.max(0, totalGrossAmount - totalRepayments);
    const percentage = Math.min((totalRepayments / totalGrossAmount) * 100, 100);
    const isTaken = loan.type === 'taken';

    if (sortedExpenses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                    <TrendingUp className="w-8 h-8 text-muted-foreground/20" />
                </div>
                <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground">{t('noRecords')}</h4>
                <p className="text-[10px] text-muted-foreground/60 mt-2 font-bold uppercase">
                    {t('goalLinkDescription')}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Progress Section */}
            <div className="space-y-3 px-1">
                <div className="flex justify-between items-end mb-1">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                            {t('loanProgress')}
                        </span>
                        <span className={cn(
                            "text-lg font-black",
                            isTaken ? "text-destructive" : "text-primary"
                        )}>
                            {t('percentDone', { percent: Math.round(percentage) })}
                        </span>
                    </div>
                    {loan.dueDate && (
                        <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-lg border border-border/20">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                {formatRelativeDate(loan.dueDate, true)}
                            </span>
                        </div>
                    )}
                </div>
                <div className="relative h-3 w-full bg-muted/40 rounded-full overflow-hidden border border-border/10">
                    <Progress
                        value={percentage}
                        className="h-full bg-transparent"
                        indicatorClassName={cn(
                            "transition-all duration-1000 ease-out",
                            isTaken ? "bg-destructive shadow-[0_0_12px_rgba(239,68,68,0.3)]" : "bg-primary shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                        )}
                    />
                </div>
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mt-1">
                    <span>৳{formatAmount(totalRepayments)} {t('done')}</span>
                    <span>৳{formatAmount(remainingAmount)} {t('remaining')}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-primary/5 p-4 rounded-3xl border border-primary/10">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-3 h-3 text-primary" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                            {loan.type === 'taken' ? t('paidBack') : t('receivedBack')}
                        </span>
                    </div>
                    <div className="text-xl font-black">
                        ৳{formatAmount(totalRepayments)}
                    </div>
                </div>
                <div className="bg-green-600/5 p-4 rounded-3xl border border-green-600/10">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingDown className="w-3 h-3 text-green-600" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-green-600/60">
                            {loan.type === 'taken' ? t('taken') : t('given')}
                        </span>
                    </div>
                    <div className="text-xl font-black">
                        ৳{formatAmount(totalGrossAmount)}
                    </div>
                </div>
            </div>

            <div className="divide-y divide-border/20">
                {sortedExpenses.map((exp) => {
                     const isPrimary = (loan.type === 'taken' && exp.type === 'expense') || (loan.type === 'given' && exp.type === 'income');
                     
                     return (
                        <div
                            key={exp.id}
                            className="flex items-center justify-between py-4 transition-all px-2 -mx-2 rounded-xl"
                        >
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm font-black text-xs",
                                    isPrimary ? "bg-primary/10 text-primary" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500"
                                )}>
                                    {isPrimary ? '✅' : (exp.type === 'income' ? '💰' : '💸')}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-black truncate capitalize leading-tight">
                                        {exp.note || exp.category}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight mt-0.5">
                                        <span className="text-primary/60">{exp.category}</span>
                                        <span>•</span>
                                        <span>{format(parseISO(exp.date), 'dd MMM yy')}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <span className={cn(
                                        "text-base font-black tabular-nums",
                                        exp.type === 'income' ? "text-green-600" : "text-red-600"
                                    )}>
                                        {exp.type === 'income' ? '+' : '-'}৳{formatAmount(exp.amount)}
                                    </span>
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-9 w-9 rounded-xl text-primary bg-primary/5 transition-all"
                                    onClick={() => openEditExpense(exp)}
                                >
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                     );
                })}
            </div>
        </div>
    );
}
