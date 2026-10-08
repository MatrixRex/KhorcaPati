import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface EditableItemValue {
    name: string;
    qty: number;
    unit: string;
}

interface EditableItemListProps<T extends EditableItemValue> {
    items: T[];
    onUpdate: (item: T, index: number, updates: Partial<EditableItemValue>) => void;
    onRemove: (item: T, index: number) => void;
    /** Called when a field loses focus, e.g. to save the record. */
    onCommit?: () => void;
}

/** Rows of name / qty / unit inputs with a remove button. A qty of 0 (not written) shows as empty. */
export function EditableItemList<T extends EditableItemValue>({ items, onUpdate, onRemove, onCommit }: EditableItemListProps<T>) {
    return (
        <div className="space-y-1.5">
            {items.map((it, i) => (
                <div key={i} className="flex items-center gap-1 p-1 rounded-xl bg-background/70 border border-border/40 shadow-2xs">
                    <Input
                        type="text"
                        value={it.name}
                        onChange={(e) => onUpdate(it, i, { name: e.target.value })}
                        onBlur={onCommit}
                        placeholder="Item name"
                        className="h-7 text-xs font-semibold px-2 rounded-lg flex-1 min-w-0 bg-background/90"
                    />
                    <Input
                        type="number"
                        step="any"
                        min="0"
                        value={it.qty || ''}
                        onChange={(e) => onUpdate(it, i, { qty: parseFloat(e.target.value) || 0 })}
                        onBlur={onCommit}
                        placeholder="Qty"
                        className="h-7 text-xs font-bold text-center px-1 rounded-lg w-12 shrink-0 bg-background/90"
                    />
                    <Input
                        type="text"
                        value={it.unit}
                        onChange={(e) => onUpdate(it, i, { unit: e.target.value })}
                        onBlur={onCommit}
                        placeholder="Unit"
                        className="h-7 text-xs font-medium text-center px-1 rounded-lg w-14 shrink-0 bg-background/90"
                    />
                    <button
                        type="button"
                        onClick={() => onRemove(it, i)}
                        className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all duration-200 shrink-0"
                        title="Remove Item"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
}
