import { ExpenseList } from '@/components/expenses/ExpenseList';
import { useUIStore } from '@/stores/uiStore';
import { PageContainer } from '@/components/shared/PageContainer';
import { CategoryFilter } from '@/components/shared/CategoryFilter';
import { ExpenseSort } from '@/components/expenses/ExpenseSort';
import { useTranslation } from 'react-i18next';

export default function Expenses() {
    const { t } = useTranslation();
    const { openEditExpense } = useUIStore();

    return (
        <PageContainer
            title={t('records')}
            showDateFilter
            headerAction={
                <div className="flex items-center gap-1">
                    <ExpenseSort />
                    <CategoryFilter />
                </div>
            }
        >
            <div className="flex-1">
                <ExpenseList onEdit={openEditExpense} />
            </div>
        </PageContainer>
    );
}
