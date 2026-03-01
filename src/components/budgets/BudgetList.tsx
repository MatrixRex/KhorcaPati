import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { BudgetCard } from './BudgetCard';
import { format } from 'date-fns';

export function BudgetList() {
    const currentMonth = format(new Date(), 'yyyy-MM');

    const budgets = useLiveQuery(
        () => db.budgets.where('month').equals(currentMonth).toArray(),
        [currentMonth]
    );

    if (!budgets) {
        return <div className="p-4 text-center text-muted-foreground">Loading budgets...</div>;
    }

    if (budgets.length === 0) {
        return (
            <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="font-semibold text-lg">No budgets set</h3>
                <p className="text-muted-foreground text-sm">Add a budget to track your limits.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2 pb-20">
            {budgets.map((budget) => (
                <BudgetCard
                    key={budget.id}
                    budget={budget}
                    onClick={() => console.log('Edit budget', budget.id)}
                />
            ))}
        </div>
    );
}
