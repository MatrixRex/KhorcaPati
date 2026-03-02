import { ItemTracker } from '@/components/items/ItemTracker';
import { DateRangeFilter } from '@/components/shared/DateRangeFilter';

export default function Items() {
    return (
        <div className="p-4 h-full flex flex-col pt-4 pb-20">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
                <DateRangeFilter />
            </div>

            <div className="flex-1 overflow-auto -mx-4 px-4">
                <ItemTracker />
            </div>
        </div>
    );
}
