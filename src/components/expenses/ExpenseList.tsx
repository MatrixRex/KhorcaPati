import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Expense } from '@/db/schema';
import { ExpenseCard } from './ExpenseCard';
import { useFilterStore } from '@/stores/filterStore';
import { isWithinInterval } from 'date-fns';

interface ExpenseListProps {
    onEdit?: (expense: Expense) => void;
}

export function ExpenseList({ onEdit }: ExpenseListProps) {
    const { startDate, endDate, selectedCategory } = useFilterStore();

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

        // Sort by date descending, then by ID descending
        all.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateB - dateA;
            return (b.id || 0) - (a.id || 0); // Tie-breaker: Newer ID first
        });


        return all.filter(exp => {
            const date = new Date(exp.date);
            return isWithinInterval(date, { start: startDate, end: endDate });
        });
    }, [startDate, endDate, selectedCategory]);


    if (!expenses) {
        return <div className="p-4 text-center text-muted-foreground">Loading...</div>;
    }

    if (expenses.length === 0) {
        return (
            <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="font-semibold text-lg">No expenses yet</h3>
                <p className="text-muted-foreground text-sm">Tap the + button to add one.</p>
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
