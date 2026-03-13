import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Goal } from '@/db/schema';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { useGoalStore } from '@/stores/goalStore';
import { Button } from '@/components/ui/button';
import { formatAmount } from '@/lib/utils';

interface GoalRecordsListProps {
    goal: Goal;
}

import { useTranslation } from 'react-i18next';

export function GoalRecordsList({ goal }: GoalRecordsListProps) {
    const { t } = useTranslation();
    const linkExpenseToGoal = useGoalStore((state) => state.linkExpenseToGoal);

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

    return (
        <div className="space-y-3">
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

            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 ml-1">
                {t('recentContributions')}
            </div>

            <div className="space-y-2">
                {sortedExpenses.map((exp) => (
                    <div
                        key={exp.id}
                        className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/20 group hover:border-primary/20 transition-all"
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                                exp.type === 'income' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500" : "bg-primary/10 text-primary"
                            )}>
                                {exp.type === 'income' ? '💰' : '💸'}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-black truncate capitalize">
                                    {exp.note || exp.category}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                                    <span>{exp.category}</span>
                                    <span>•</span>
                                    <span>{format(parseISO(exp.date), 'dd MMM yyyy')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <span className={cn(
                                    "text-sm font-black tabular-nums",
                                    exp.type === 'income' ? "text-green-600" : "text-primary"
                                )}>
                                    {exp.type === 'income' ? '-' : '+'}৳{formatAmount(exp.amount)}
                                </span>
                            </div>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 transition-all"
                                onClick={() => linkExpenseToGoal(exp.id!, null)}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
