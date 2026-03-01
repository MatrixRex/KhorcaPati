import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { ExpenseCard } from './ExpenseCard';

export function ExpenseList() {
    const expenses = useLiveQuery(
        () => db.expenses.orderBy('date').reverse().toArray()
    );

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
        <div className="space-y-2 pb-20">
            {expenses.map((expense) => (
                <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    onClick={() => console.log('Edit', expense.id)}
                />
            ))}
        </div>
    );
}
