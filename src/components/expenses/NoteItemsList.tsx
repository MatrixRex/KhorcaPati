import { Package, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/lib/utils';
import { EditableItemList, type EditableItemValue } from '@/components/items/EditableItemList';
import type { EditableNoteItem } from '@/utils/noteItems';

interface NoteItemsListProps {
    /** Visible items (already without the removed ones). */
    items: EditableNoteItem[];
    onUpdate: (item: EditableNoteItem, updates: Partial<EditableItemValue>) => void;
    onRemove: (item: EditableNoteItem) => void;
    onAdd: () => void;
    /** Called after a field loses focus or an item is removed, to save the record. */
    onCommit?: () => void;
}

/** Editable item list of a record, parsed from its note (shown while auto-track is on). */
export function NoteItemsList({ items, onUpdate, onRemove, onAdd, onCommit }: NoteItemsListProps) {
    const { t } = useTranslation();

    return (
        <div className="p-3 rounded-2xl bg-primary/5 border border-primary/15 space-y-2.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-primary">
                    <Package className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('itemsInRecord')}</span>
                    {items.length > 0 && <span className="text-[10px] font-bold text-muted-foreground/60">{formatNumber(items.length)}</span>}
                </div>
                <button
                    type="button"
                    onClick={onAdd}
                    className="p-1 rounded-lg text-primary hover:bg-primary/10 active:scale-95 transition-all duration-200"
                    title="Add Item"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>
            {items.length > 0 && (
                <EditableItemList
                    items={items}
                    onUpdate={(item, _, updates) => onUpdate(item, updates)}
                    onRemove={(item) => onRemove(item)}
                    onCommit={onCommit}
                />
            )}
        </div>
    );
}
