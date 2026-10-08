import { describe, it, expect } from 'vitest';
import { parseItemList, itemClassOf, buildUnitHints } from './itemListParser';

const list = (text: string) => parseItemList(text.split(',')).map(({ name, qty, unit }) => ({ name, qty, unit }));

describe('parseItemList', () => {
    it('gives one item per comma piece, with qty 0 when no quantity is written', () => {
        expect(list('onion, oil 1l, egg x12')).toEqual([
            { name: 'onion', qty: 0, unit: 'pcs' },
            { name: 'oil', qty: 1, unit: 'L' },
            { name: 'egg', qty: 12, unit: 'pcs' },
        ]);
    });

    it('moves a stray leading quantity back to the previous item when it fits', () => {
        expect(list('onion, oil 1l, rice ,5kg bread 1')).toEqual([
            { name: 'onion', qty: 0, unit: 'pcs' },
            { name: 'oil', qty: 1, unit: 'L' },
            { name: 'rice', qty: 5, unit: 'kg' },
            { name: 'bread', qty: 1, unit: 'pcs' },
        ]);
    });

    it('drops the stray quantity when it does not fit the previous item', () => {
        expect(list('rice ,5l bread 1')).toEqual([
            { name: 'rice', qty: 0, unit: 'pcs' },
            { name: 'bread', qty: 1, unit: 'pcs' },
        ]);
    });

    it('drops the stray quantity when the previous item already has one', () => {
        expect(list('rice 2kg, 5kg bread 1')).toEqual([
            { name: 'rice', qty: 2, unit: 'kg' },
            { name: 'bread', qty: 1, unit: 'pcs' },
        ]);
    });

    it('keeps quantities written before the name', () => {
        expect(list('5kg rice, 2kg onion, 2 hali egg')).toEqual([
            { name: 'rice', qty: 5, unit: 'kg' },
            { name: 'onion', qty: 2, unit: 'kg' },
            { name: 'egg', qty: 8, unit: 'pcs' },
        ]);
    });

    it('gives a quantity-only piece to the item before it', () => {
        expect(list('peyaj, 2kg, bread')).toEqual([
            { name: 'peyaj', qty: 2, unit: 'kg' },
            { name: 'bread', qty: 0, unit: 'pcs' },
        ]);
    });

    it('lets unknown items and packaging units take a stray quantity', () => {
        expect(list('miniket ,1 bag bread 2')[0]).toEqual({ name: 'miniket', qty: 1, unit: 'bag' });
        expect(list('rice ,1 bag bread 2')[0]).toEqual({ name: 'rice', qty: 1, unit: 'bag' });
    });

    it('records the joined raw text on a repaired item', () => {
        expect(parseItemList(['rice ', '5kg bread 1']).map(i => i.rawInput)).toEqual(['rice 5kg', 'bread 1']);
    });
});

describe('itemClassOf', () => {
    it('knows common items by full name or last word, and prefers hints', () => {
        expect(itemClassOf('rice')).toBe('weight');
        expect(itemClassOf('sorisha oil')).toBe('volume');
        expect(itemClassOf('ডিম')).toBe('count');
        expect(itemClassOf('widget')).toBeUndefined();
        expect(itemClassOf('rice', { rice: 'count' })).toBe('count');
    });
});

describe('buildUnitHints', () => {
    it('learns the unit class used most per item, ignoring missing quantities and packaging', () => {
        const hints = buildUnitHints([
            { name: 'Miniket', qty: 5, unit: 'kg' },
            { name: 'miniket', qty: 10, unit: 'kg' },
            { name: 'miniket', qty: 1, unit: 'pcs' },
            { name: 'rice', qty: 1, unit: 'bag' },
            { name: 'onion', qty: 0, unit: 'pcs' },
        ]);
        expect(hints).toEqual({ miniket: 'weight' });
    });

    it('lets learned hints decide where a stray quantity goes', () => {
        const pieces = ['miniket ', '5l bread 1'];
        expect(parseItemList(pieces)[0]).toMatchObject({ qty: 5, unit: 'L' }); // unknown item: accepted
        expect(parseItemList(pieces, { miniket: 'weight' })[0]).toMatchObject({ qty: 0 }); // learned: rejected
    });
});
