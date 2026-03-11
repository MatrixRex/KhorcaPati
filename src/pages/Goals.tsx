
import { GoalList } from '@/components/goals/GoalList';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { useUIStore } from '@/stores/uiStore';

export default function Goals() {
    const { openAddGoal } = useUIStore();

    return (
        <PageContainer
            title="Goals"
            showBackButton
            headerAction={
                <Button size="sm" onClick={openAddGoal} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md">
                    <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
            }
        >
            <div className="flex-1">
                <GoalList />
            </div>
        </PageContainer>
    );
}
