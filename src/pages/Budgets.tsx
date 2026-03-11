
import { BudgetList } from '@/components/budgets/BudgetList';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { useUIStore } from '@/stores/uiStore';

export default function Budgets() {
    const { openAddBudget, openEditBudget } = useUIStore();

    return (
        <PageContainer
            title="Budgets"
            showBackButton
            headerAction={
                <Button size="sm" onClick={openAddBudget} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md">
                    <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
            }
        >
            <div className="flex-1">
                <BudgetList onEdit={openEditBudget} />
            </div>
        </PageContainer>
    );
}
