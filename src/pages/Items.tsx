import { ItemTracker } from '@/components/items/ItemTracker';
import { InventorySort } from '@/components/items/InventorySort';
import { PageContainer } from '@/components/shared/PageContainer';
import { useTranslation } from 'react-i18next';

export default function Items() {
    const { t } = useTranslation();
    return (
        <PageContainer
            title={t('inventory')}
            showDateFilter
            headerAction={<InventorySort />}
        >
            <div className="flex-1">
                <ItemTracker />
            </div>
        </PageContainer>
    );
}
