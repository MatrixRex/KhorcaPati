import { parseItemList, type ListedItem, type UnitClass } from '@/parsers/itemListParser';

export type NoteItem = ListedItem;

/** Splits a record note on commas / newlines into items (see parseItemList for the repair rules). */
export function parseNoteItems(note: string | undefined | null, unitHints?: Record<string, UnitClass>): NoteItem[] {
    if (!note) return [];
    return parseItemList(note.split(/[,\n]/), unitHints);
}

/** A record's item while the record is being edited: parsed from the note, then possibly changed by hand. */
export interface EditableNoteItem extends NoteItem {
    /** 'note' items come from a comma piece of the note; 'manual' ones were added by hand. */
    origin: 'note' | 'manual';
    /** Changed by hand, so re-parsing the note keeps this version. */
    edited?: boolean;
    /** Removed by hand; kept hidden so re-parsing the note does not bring it back. */
    removed?: boolean;
}

type SavedItem = Pick<NoteItem, 'name' | 'qty' | 'unit' | 'rawInput'>;

const pieceKey = (rawInput: string) => rawInput.toLowerCase().replace(/\s+/g, ' ').trim();

function groupByPiece<T extends { rawInput: string }>(items: T[]): Map<string, T[]> {
    const groups = new Map<string, T[]>();
    for (const item of items) {
        const key = pieceKey(item.rawInput);
        groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return groups;
}

/**
 * Re-parses the note after it changed. Pieces the user edited or removed by hand keep that state while
 * their text is still in the note; hand-added items always stay.
 */
export function reconcileNoteItems(prev: EditableNoteItem[], note: string, unitHints?: Record<string, UnitClass>): EditableNoteItem[] {
    const pinned = groupByPiece(prev.filter(i => i.origin === 'note' && (i.edited || i.removed)));
    const fromNote = parseNoteItems(note, unitHints).map((p): EditableNoteItem =>
        pinned.get(pieceKey(p.rawInput))?.shift() ?? { ...p, origin: 'note' });
    return [...fromNote, ...prev.filter(i => i.origin === 'manual')];
}

/**
 * Rebuilds the editable list of a saved record: saved items that match a note piece are that piece (edited
 * when they differ from a fresh parse), pieces with no saved item were removed, other saved items were added.
 */
export function editableItemsFromSaved(saved: SavedItem[], note: string, unitHints?: Record<string, UnitClass>): EditableNoteItem[] {
    if (saved.length === 0) return reconcileNoteItems([], note, unitHints);

    const savedByPiece = groupByPiece(saved);
    const fromNote = parseNoteItems(note, unitHints).map((p): EditableNoteItem => {
        const match = savedByPiece.get(pieceKey(p.rawInput))?.shift();
        if (!match) return { ...p, origin: 'note', removed: true };
        const edited = match.name !== p.name || match.qty !== p.qty || match.unit !== p.unit;
        return { name: match.name, qty: match.qty, unit: match.unit, rawInput: p.rawInput, origin: 'note', edited };
    });
    const added = [...savedByPiece.values()].flat().map((s): EditableNoteItem => ({
        name: s.name, qty: s.qty, unit: s.unit, rawInput: s.rawInput, origin: 'manual',
    }));
    return [...fromNote, ...added];
}

export const visibleItems = (items: EditableNoteItem[]) => items.filter(i => !i.removed);

/** Items to store for the record: visible ones with a name. */
export function itemsToSave(items: EditableNoteItem[]): NoteItem[] {
    return visibleItems(items)
        .filter(i => i.name.trim())
        .map(i => ({ name: i.name.trim(), qty: i.qty, unit: i.unit.trim() || 'pcs', rawInput: i.rawInput || i.name.trim() }));
}

export function updateEditableItem(items: EditableNoteItem[], target: EditableNoteItem, updates: Partial<Pick<NoteItem, 'name' | 'qty' | 'unit'>>): EditableNoteItem[] {
    return items.map(i => (i === target ? { ...i, ...updates, edited: true } : i));
}

export function removeEditableItem(items: EditableNoteItem[], target: EditableNoteItem): EditableNoteItem[] {
    if (target.origin === 'manual') return items.filter(i => i !== target);
    return items.map(i => (i === target ? { ...i, removed: true } : i));
}

export function addManualItem(items: EditableNoteItem[]): EditableNoteItem[] {
    return [...items, { name: '', qty: 1, unit: 'pcs', rawInput: '', origin: 'manual' }];
}
