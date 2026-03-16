import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Goal } from '@/db/schema';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Edit2, TrendingUp, TrendingDown, Calendar, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatRelativeDate } from '@/utils/date';
import { formatAmount } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/uiStore';

interface GoalRecordsListProps {
    goal: Goal;
}

export function GoalRecordsList({ goal }: GoalRecordsListProps) {
    const { t } = useTranslation();
    const openEditExpense = useUIStore((state) => state.openEditExpense);

    const linkedExpenses = useLiveQuery(() => 
        db.expenses
            .where('goalId')
            .equals(goal.id!)
            .toArray()
    , [goal.id]) || [];

    const sortedExpenses = [...linkedExpenses].sort((a, b) => b.date.localeCompare(a.date));

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

    const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);

    return (
        <div className="space-y-6">
            {/* Progress Section */}
            <div className="space-y-3 px-1">
                <div className="flex justify-between items-end mb-1">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                            {t('goalProgress')}
                        </span>
                        <span className="text-lg font-black text-primary">
                            {t('percentDone', { percent: Math.round(percentage) })}
                        </span>
                    </div>
                    {goal.deadline && (
                        <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-lg border border-border/20">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                {formatRelativeDate(goal.deadline, true)}
                            </span>
                        </div>
                    )}
                </div>
                <Progress
                    value={percentage}
                    className="premium-progress"
                    indicatorClassName="premium-progress-indicator"
                    style={{ "--progress-indicator": "var(--primary)" } as any}
                />
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mt-1">
                    <span>৳{formatAmount(goal.currentAmount)} {t('saved')}</span>
                    <span>৳{formatAmount(goal.targetAmount - goal.currentAmount)} {t('remaining')}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-primary/5 p-4 rounded-3xl border border-primary/10">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-3 h-3 text-primary" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">{t('totalDeposits')}</span>
                    </div>
                    <div className="text-xl font-black">
                        ৳{formatAmount(linkedExpenses.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0))}
                    </div>
                </div>
                <div className="bg-green-600/5 p-4 rounded-3xl border border-green-600/10">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingDown className="w-3 h-3 text-green-600" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-green-600/60">{t('totalWithdrawals')}</span>
                    </div>
                    <div className="text-xl font-black">
                        ৳{formatAmount(linkedExpenses.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0))}
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {sortedExpenses.map((exp) => (
                    <div
                        key={exp.id}
                        className="record-item-glass"
                    >
                        <div className="flex items-center gap-4 overflow-hidden">
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm font-black text-xs",
                                exp.type === 'income' ? "bg-green-600/10 text-green-600 dark:bg-green-900/30 dark:text-green-500" : "bg-primary/10 text-primary"
                            )}>
                                {exp.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-black truncate capitalize leading-tight">
                                    {exp.note || exp.category}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight mt-0.5">
                                    {exp.note && <span className="text-primary/60">{exp.category}</span>}
                                    {exp.note && <span>•</span>}
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
                                    {exp.type === 'income' ? '-' : '+'}৳{formatAmount(exp.amount)}
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
                ))}
            </div>
        </div>
    );
}
