import { ItemTracker } from '@/components/items/ItemTracker';
import { InventorySort } from '@/components/items/InventorySort';
import { PageContainer } from '@/components/shared/PageContainer';

export default function Items() {
    return (
        <PageContainer
            title="Inventory"
            showDateFilter
            headerAction={<InventorySort />}
        >
            <div className="flex-1">
                <ItemTracker />
            </div>
        </PageContainer>
    );
}
