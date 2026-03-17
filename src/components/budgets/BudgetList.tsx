import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Budget } from '@/db/schema';
import { BudgetCard } from './BudgetCard';
import { useUIStore } from '@/stores/uiStore';

interface BudgetListProps {
    onClick?: (budget: Budget) => void;
}

export function BudgetList({ onClick }: BudgetListProps) {
    const { openBudgetRecords } = useUIStore();
    const budgets = useLiveQuery(() => db.budgets.toArray());

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
        <div className="flex flex-col gap-[var(--item-gap)] pb-20">
            {budgets.map((budget) => (
                <BudgetCard
                    key={budget.id}
                    budget={budget}
                    onClick={() => onClick ? onClick(budget) : openBudgetRecords(budget)}
                />
            ))}
        </div>
    );
}
