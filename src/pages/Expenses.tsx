import { ExpenseList } from '@/components/expenses/ExpenseList';
import { useUIStore } from '@/stores/uiStore';
import { PageContainer } from '@/components/shared/PageContainer';
import { CategoryFilter } from '@/components/shared/CategoryFilter';
import { ExpenseSort } from '@/components/expenses/ExpenseSort';
import { useTranslation } from 'react-i18next';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Expenses() {
    const { t } = useTranslation();
    const { openEditExpense, openSmartBatchParser } = useUIStore();

    return (
        <PageContainer
            title={t('records')}
            showDateFilter
            headerAction={
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openSmartBatchParser()}
                        className="h-8 px-2.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10 flex items-center gap-1.5 active:scale-95 transition-all duration-200"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold">{t('aiSmartNote', { defaultValue: 'AI Note' })}</span>
                    </Button>
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
