import { describe, it, expect } from 'vitest';
import {
    parseNoteItems, reconcileNoteItems, editableItemsFromSaved, itemsToSave, visibleItems,
    updateEditableItem, removeEditableItem, addManualItem,
} from './noteItems';

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

describe('parseNoteItems item list rules', () => {
    it('uses qty 0 for items without a quantity and repairs misplaced commas', () => {
        expect(parseNoteItems('onion, rice ,5kg bread 1').map(i => [i.name, i.qty, i.unit])).toEqual([
            ['onion', 0, 'pcs'], ['rice', 5, 'kg'], ['bread', 1, 'pcs'],
        ]);
    });
});

describe('editable record items', () => {
    const brief = (items: ReturnType<typeof itemsToSave>) => items.map(i => [i.name, i.qty, i.unit]);

    it('keeps hand edits and removals while the note keeps changing', () => {
        let items = reconcileNoteItems([], 'oil 1l, rice');
        items = updateEditableItem(items, items[1], { qty: 5, unit: 'kg' });
        items = reconcileNoteItems(items, 'oil 1l, rice, egg 12');
        expect(brief(itemsToSave(items))).toEqual([['oil', 1, 'L'], ['rice', 5, 'kg'], ['egg', 12, 'pcs']]);

        items = removeEditableItem(items, items[0]);
        items = reconcileNoteItems(items, 'oil 1l, rice, egg 12, salt 1kg');
        expect(brief(itemsToSave(items))).toEqual([['rice', 5, 'kg'], ['egg', 12, 'pcs'], ['salt', 1, 'kg']]);
    });

    it('drops an edited item once its text leaves the note, but keeps hand-added items', () => {
        let items = reconcileNoteItems([], 'oil 1l, rice');
        items = updateEditableItem(items, items[1], { qty: 5, unit: 'kg' });
        items = addManualItem(items);
        items = updateEditableItem(items, items[2], { name: 'soap', qty: 2 });
        items = reconcileNoteItems(items, 'oil 1l');
        expect(brief(itemsToSave(items))).toEqual([['oil', 1, 'L'], ['soap', 2, 'pcs']]);
    });

    it('removes hand-added items for good and skips nameless ones when saving', () => {
        let items = addManualItem(reconcileNoteItems([], 'oil 1l'));
        expect(visibleItems(items)).toHaveLength(2);
        expect(itemsToSave(items)).toHaveLength(1);
        items = removeEditableItem(items, items[1]);
        expect(items).toHaveLength(1);
    });

    it('rebuilds edits, removals and additions from saved items', () => {
        const saved = [
            { name: 'rice', qty: 5, unit: 'kg', rawInput: 'rice' },
            { name: 'soap', qty: 2, unit: 'pcs', rawInput: 'soap' },
        ];
        const items = editableItemsFromSaved(saved, 'oil 1l, rice');
        expect(items.map(i => [i.name, i.origin, Boolean(i.edited), Boolean(i.removed)])).toEqual([
            ['oil', 'note', false, true],
            ['rice', 'note', true, false],
            ['soap', 'manual', false, false],
        ]);
        // The removal survives further typing in the note.
        expect(brief(itemsToSave(reconcileNoteItems(items, 'oil 1l, rice, egg')))).toEqual([['rice', 5, 'kg'], ['egg', 0, 'pcs'], ['soap', 2, 'pcs']]);
    });

    it('parses the note fresh when nothing was saved', () => {
        expect(brief(itemsToSave(editableItemsFromSaved([], 'oil 1l')))).toEqual([['oil', 1, 'L']]);
    });

    it('saves round-trip: what is saved rebuilds the same list', () => {
        let items = reconcileNoteItems([], 'oil 1l, rice');
        items = updateEditableItem(items, items[1], { qty: 5, unit: 'kg' });
        const saved = itemsToSave(items);
        expect(itemsToSave(editableItemsFromSaved(saved, 'oil 1l, rice'))).toEqual(saved);
    });
});
