import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Budget } from '@/db/schema';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { TrendingDown, Receipt } from 'lucide-react';
import { getBudgetWindow } from '@/utils/budgetWindow';
import { formatAmount } from '@/lib/utils';

interface BudgetRecordsListProps {
    budget: Budget;
}

import { useTranslation } from 'react-i18next';

export function BudgetRecordsList({ budget }: BudgetRecordsListProps) {
    const { t } = useTranslation();
    const window = getBudgetWindow(budget);
    
    const expenses = useLiveQuery(() => 
        db.expenses
            .where('category')
            .equals(budget.category)
            .reverse()
            .toArray()
    , [budget.category]) || [];

    const filteredExpenses = expenses.filter(exp => {
        if (exp.type !== 'expense') return false;
        if (!window) return true;
        try {
            return isWithinInterval(parseISO(exp.date), {
                start: parseISO(window.start),
                end: parseISO(window.end),
            });
        } catch {
            return false;
        }
    });

    const totalSpent = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const remaining = Math.max(0, budget.limitAmount - totalSpent);

    if (filteredExpenses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                    <Receipt className="w-8 h-8 text-muted-foreground/20" />
                </div>
                <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground">{t('noRecords')}</h4>
                <p className="text-[10px] text-muted-foreground/60 mt-2 font-bold uppercase">
                    {t('recordsInPeriod', { category: budget.category })}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-destructive/5 p-4 rounded-3xl border border-destructive/10">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingDown className="w-3 h-3 text-destructive" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-destructive/60">{t('spent')}</span>
                    </div>
                    <div className="text-xl font-black">
                        ৳{formatAmount(totalSpent)}
                    </div>
                </div>
                <div className="bg-primary/5 p-4 rounded-3xl border border-primary/10">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full bg-primary/20 flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-primary" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">{t('remaining')}</span>
                    </div>
                    <div className="text-xl font-black">
                        ৳{formatAmount(remaining)}
                    </div>
                </div>
            </div>

            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 ml-1">
                {t('recordsForCategory', { category: budget.category })}
            </div>

            <div className="space-y-2">
                {filteredExpenses.map((exp) => (
                    <div
                        key={exp.id}
                        className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/20 group hover:border-primary/20 transition-all"
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-muted/50 text-muted-foreground font-bold">
                                {exp.category.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-black truncate capitalize">
                                    {exp.note || exp.category}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                                    <span>{format(parseISO(exp.date), 'dd MMM yyyy')}</span>
                                    {exp.isNested && (
                                        <>
                                            <span>•</span>
                                            <span className="text-primary/60">{t('nestedRecord')}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-black tabular-nums text-destructive">
                                ৳{formatAmount(exp.amount)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
