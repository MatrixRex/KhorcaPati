import { ExpenseList } from '@/components/expenses/ExpenseList';
import { useUIStore } from '@/stores/uiStore';

export default function Expenses() {
    const { openEditExpense } = useUIStore();

    return (
        <div className="p-4 h-full flex flex-col pt-10 pb-20 bg-background text-foreground">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
            </div>

            <div className="flex-1 overflow-auto -mx-4 px-4">
                <ExpenseList onEdit={openEditExpense} />
            </div>
        </div>
    );
}
