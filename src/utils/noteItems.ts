import { parseItemInput, type ParsedItem } from '@/parsers/itemParser';

export interface NoteItem extends ParsedItem {
    /** The original line the user typed, e.g. "Oil 1L". */
    rawInput: string;
}

/** Splits a record note on commas / newlines and parses each line into an item. */
export function parseNoteItems(note: string | undefined | null): NoteItem[] {
    if (!note) return [];
    const out: NoteItem[] = [];
    for (const line of note.split(/[,\n]/)) {
        const rawInput = line.trim();
        if (!rawInput) continue;
        const parsed = parseItemInput(rawInput);
        if (parsed.name) out.push({ ...parsed, rawInput });
    }
    return out;
}
