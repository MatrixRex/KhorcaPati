import { ItemTracker } from '@/components/items/ItemTracker';
import { InventorySort } from '@/components/items/InventorySort';
import { PageContainer } from '@/components/shared/PageContainer';
import { CategoryFilter } from '@/components/shared/CategoryFilter';
import { SearchBar } from '@/components/shared/SearchBar';
import { useTranslation } from 'react-i18next';

export default function Items() {
    const { t } = useTranslation();
    return (
        <PageContainer
            title={t('inventory')}
            showDateFilter
            overlay={<SearchBar placeholder={t('searchItemsPlaceholder')} />}
            headerAction={
                <div className="flex items-center gap-1">
                    <InventorySort />
                    <CategoryFilter />
                </div>
            }
        >
            <div className="flex-1">
                <ItemTracker />
            </div>
        </PageContainer>
    );
}
