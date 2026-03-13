import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Expense } from '@/db/schema';
import { ExpenseCard } from './ExpenseCard';
import { useFilterStore } from '@/stores/filterStore';
import { isWithinInterval } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface ExpenseListProps {
    onEdit?: (expense: Expense) => void;
}

export function ExpenseList({ onEdit }: ExpenseListProps) {
    const { t } = useTranslation();
    const { startDate, endDate, selectedCategory, expenseSortBy } = useFilterStore();

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
    }, [startDate, endDate, selectedCategory, expenseSortBy]);


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
            {expenses.map((expense) => (
                <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    onClick={() => onEdit?.(expense)}
                />
            ))}
        </div>
    );
}
