import { ItemTracker } from '@/components/items/ItemTracker';
import { PageContainer } from '@/components/shared/PageContainer';

export default function Items() {
    return (
        <PageContainer title="Inventory" showDateFilter>
            <div className="flex-1">
                <ItemTracker />
            </div>
        </PageContainer>
    );
}
