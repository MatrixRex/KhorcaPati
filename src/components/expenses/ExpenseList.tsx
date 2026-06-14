import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Expense } from '@/db/schema';
import { ExpenseCard } from './ExpenseCard';
import { useFilterStore } from '@/stores/filterStore';
import { isWithinInterval } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useExpenseStore } from '@/stores/expenseStore';
import { formatRelativeDate } from '@/utils/date';
import { formatAmount } from '@/lib/utils';
import { useMemo } from 'react';

interface ExpenseListProps {
    onEdit?: (expense: Expense) => void;
}

export function ExpenseList({ onEdit }: ExpenseListProps) {
    const { t } = useTranslation();
    const { startDate, endDate, selectedCategory, expenseSortBy } = useFilterStore();
    const storeExpenses = useExpenseStore(state => state.expenses);

    const expenses = useLiveQuery(async () => {
        // Only fetch top-level records
        let collection;

        if (selectedCategory) {
            collection = db.expenses.where('category').equals(selectedCategory);
        } else {
            collection = db.expenses.toCollection();
        }

        const all = await collection
            .filter(e => !e.parentId)
            .toArray();

        // Apply visual filtering first
        const filtered = all.filter(exp => {
            const date = new Date(exp.date);
            return isWithinInterval(date, { start: startDate, end: endDate });
        });

        // Apply selected sort
        filtered.sort((a, b) => {
            if (expenseSortBy === 'latest' || expenseSortBy === 'oldest') {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                if (dateA !== dateB) {
                    return expenseSortBy === 'latest' ? dateB - dateA : dateA - dateB;
                }
                return (b.id || 0) - (a.id || 0);
            }
            if (expenseSortBy === 'amount-high' || expenseSortBy === 'amount-low') {
                if (a.amount !== b.amount) {
                    return expenseSortBy === 'amount-high' ? b.amount - a.amount : a.amount - b.amount;
                }
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            }
            return 0;
        });

        return filtered;
    }, [startDate, endDate, selectedCategory, expenseSortBy, storeExpenses]);


    const dailySummaries = useLiveQuery(() => db.dailySummaries.toArray());
    const summaryMap = useMemo(() => {
        const map = new Map<string, { expenseTotal: number; incomeTotal: number }>();
        if (dailySummaries) {
            for (const s of dailySummaries) {
                map.set(s.date, s);
            }
        }
        return map;
    }, [dailySummaries]);

    const items = useMemo(() => {
        if (!expenses) return [];
        const result: Array<{ type: 'divider'; date: string } | { type: 'expense'; expense: Expense }> = [];
        let lastDate = '';
        for (const exp of expenses) {
            if (expenseSortBy === 'latest' && exp.date !== lastDate) {
                lastDate = exp.date;
                result.push({ type: 'divider', date: exp.date });
            }
            result.push({ type: 'expense', expense: exp });
        }
        return result;
    }, [expenses, expenseSortBy]);

    if (!expenses) {
        return <div className="p-4 text-center text-muted-foreground">{t('loading')}</div>;
    }

    if (expenses.length === 0) {
        return (
            <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="font-semibold text-lg">{t('noExpenses')}</h3>
                <p className="text-muted-foreground text-sm">{t('tapAdd')}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-[var(--item-gap)] pb-20">
            {items.map((item) => {
                if (item.type === 'divider') {
                    const summary = summaryMap.get(item.date);
                    return (
                        <div key={`divider-${item.date}`} className="flex items-center justify-between px-3 py-2.5 my-1 rounded-2xl bg-white/5 dark:bg-black/10 border border-white/10 dark:border-white/5 backdrop-blur-md shadow-sm transition-all duration-300">
                            <span className="text-xs font-black text-muted-foreground/80 tracking-wide">
                                {formatRelativeDate(item.date, true)}
                            </span>
                            <div className="flex items-center gap-3 text-xs font-black tabular-nums tracking-tight">
                                {summary && summary.incomeTotal > 0 && (
                                    <span className="text-success">
                                        +৳{formatAmount(summary.incomeTotal)}
                                    </span>
                                )}
                                {summary && summary.expenseTotal > 0 && (
                                    <span className="text-destructive">
                                        -৳{formatAmount(summary.expenseTotal)}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                }

                return (
                    <ExpenseCard
                        key={item.expense.id}
                        expense={item.expense}
                        onClick={() => onEdit?.(item.expense)}
                    />
                );
            })}
        </div>
    );
}
