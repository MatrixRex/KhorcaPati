import { useMemo } from 'react';
import { Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/lib/utils';
import { parseNoteItems } from '@/utils/noteItems';

interface NoteItemsListProps {
    note: string;
}

/** Live item list parsed from a record's note (shown while auto-track is on). */
export function NoteItemsList({ note }: NoteItemsListProps) {
    const { t } = useTranslation();
    const items = useMemo(() => parseNoteItems(note), [note]);

    if (items.length === 0) return null;

    return (
        <div className="rounded-2xl border border-border/40 bg-muted/20 p-2 space-y-1">
            <div className="flex items-center justify-between px-2 pt-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">{t('itemsInRecord')}</span>
                <span className="text-[10px] font-bold text-muted-foreground/50">{formatNumber(items.length)}</span>
            </div>
            {items.map((item, idx) => (
                <div key={`${item.rawInput}-${idx}`} className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-xl bg-background/40">
                    <div className="flex items-center gap-2 min-w-0">
                        <Package className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-sm font-bold capitalize truncate">{item.name}</span>
                    </div>
                    <div className="flex items-baseline gap-1 shrink-0">
                        <span className="text-sm font-black text-primary tabular-nums">{formatNumber(item.qty)}</span>
                        <span className="text-[10px] font-black text-muted-foreground uppercase">{item.unit}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
