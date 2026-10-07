import { describe, it, expect } from 'vitest';
import { parseNoteItems } from './noteItems';

describe('parseNoteItems', () => {
    it('returns empty for blank notes', () => {
        expect(parseNoteItems('')).toEqual([]);
        expect(parseNoteItems(undefined)).toEqual([]);
        expect(parseNoteItems(' , \n ')).toEqual([]);
    });

    it('splits on commas and newlines and keeps raw input', () => {
        const items = parseNoteItems('Oil 1L, Rice 2kg\nEggs');
        expect(items.map(i => i.rawInput)).toEqual(['Oil 1L', 'Rice 2kg', 'Eggs']);
        expect(items[0]).toMatchObject({ name: 'oil', qty: 1, unit: 'L' });
        expect(items[1]).toMatchObject({ name: 'rice', qty: 2, unit: 'kg' });
    });
});
