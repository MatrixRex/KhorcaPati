import { db, type Loan, type Expense } from '@/db/schema';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatRelativeDate } from '@/utils/date';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { cn, formatAmount } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface LoanCardProps {
    loan: Loan;
    onClick?: () => void;
}

export function LoanCard({ loan, onClick }: LoanCardProps) {
    const { t } = useTranslation();
    const { openLoanRecords } = useUIStore();

    // Query linked expenses in real-time to ensure progress is always accurate
    const linkedExpenses = useLiveQuery(() => 
        db.expenses.where('loanId').equals(loan.id!).toArray()
    , [loan.id]) || [];

    const totalRepayments = linkedExpenses
        .filter((e: Expense) => (loan.type === 'taken' ? e.type === 'expense' : e.type === 'income'))
        .reduce((s: number, e: Expense) => s + e.amount, 0);
        
    const totalAdditionalAmount = linkedExpenses
        .filter((e: Expense) => (loan.type === 'taken' ? e.type === 'income' : e.type === 'expense'))
        .reduce((s: number, e: Expense) => s + e.amount, 0);

    const totalGrossAmount = loan.totalAmount + totalAdditionalAmount;
    const currentProgress = totalRepayments;
    const percentage = totalGrossAmount > 0 ? Math.min((totalRepayments / totalGrossAmount) * 100, 100) : 0;
    
    const isCompleted = currentProgress >= totalGrossAmount && totalGrossAmount > 0;
    const isTaken = loan.type === 'taken';

    return (
        <Card
            onClick={onClick || (() => openLoanRecords(loan))}
            className={cn(
                "group relative overflow-hidden border-border cursor-pointer shadow-sm active:scale-[0.98] transition-all rounded-xl",
                isCompleted && "border-primary/30"
            )}
            style={{ 
                background: `linear-gradient(to right, color-mix(in oklch, var(${isTaken ? '--destructive' : '--primary'}) 12%, transparent), transparent)`
            }}
        >
            {/* Status Glow */}
            <div 
                className={cn(
                    "card-glow",
                    isTaken ? "bg-destructive" : "bg-primary"
                )}
            />
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-black text-sm uppercase tracking-tight truncate transition-colors">
                                {loan.title}
                            </h3>
                            {isCompleted && (
                                <span className="flex-shrink-0 text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md shadow-sm">
                                    {t('done')}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase tracking-wider line-clamp-1">
                            {isTaken ? <ArrowDownLeft className="w-3 h-3 text-destructive" /> : <ArrowUpRight className="w-3 h-3 text-primary" />}
                            <span>{isTaken ? t('borrowedFrom') : t('lentTo')}: {loan.person}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                        <span className="text-xs text-muted-foreground font-black uppercase text-right shrink-0 bg-muted px-1.5 py-0.5 rounded-md">
                            ৳{formatAmount(currentProgress)} <span className="opacity-60">/</span> ৳{formatAmount(totalGrossAmount)}
                        </span>
                    </div>
                </div>

                <div className="space-y-2">
                    <Progress
                        value={percentage}
                        className="premium-progress"
                        indicatorClassName="premium-progress-indicator"
                        style={{ "--progress-indicator": isTaken ? "var(--destructive)" : "var(--primary)" } as any}
                    />

                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest mt-1">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="text-muted-foreground shrink-0">
                                {t('percentDone', { percent: Math.round(percentage) })}
                            </span>
                            {loan.dueDate && (
                                <span className="text-muted-foreground/50">•</span>
                            )}
                            {loan.dueDate && (
                                <span className="text-muted-foreground truncate">
                                    {formatRelativeDate(loan.dueDate, true)}
                                </span>
                            )}
                        </div>
                        <div className="text-[10px] font-black text-muted-foreground/60">
                             {t('remaining')}: ৳{formatAmount(totalGrossAmount - currentProgress)}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
