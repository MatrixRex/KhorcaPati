import { ExpenseList } from '@/components/expenses/ExpenseList';
import { useUIStore } from '@/stores/uiStore';
import { PageContainer } from '@/components/shared/PageContainer';

export default function Expenses() {
    const { openEditExpense } = useUIStore();

    return (
        <PageContainer title="Records" showDateFilter>
            <div className="flex-1">
                <ExpenseList onEdit={openEditExpense} />
            </div>
        </PageContainer>
    );
}
