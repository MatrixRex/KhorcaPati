import { describe, it, expect } from 'vitest';
import { parseItemInput } from './itemParser';

describe('Smart Item Parser', () => {
    it('parses typical items with volume units', () => {
        expect(parseItemInput('Oil 1L')).toEqual({ name: 'oil', qty: 1, unit: 'L' });
        expect(parseItemInput('Milk 500ml')).toEqual({ name: 'milk', qty: 0.5, unit: 'L' });
        expect(parseItemInput('Water 2.5 liter')).toEqual({ name: 'water', qty: 2.5, unit: 'L' });
    });

    it('parses items with weight units', () => {
        expect(parseItemInput('rice 2kg')).toEqual({ name: 'rice', qty: 2, unit: 'kg' });
        expect(parseItemInput('Sugar 500g')).toEqual({ name: 'sugar', qty: 0.5, unit: 'kg' });
        expect(parseItemInput('Rice 250 gm')).toEqual({ name: 'rice', qty: 0.25, unit: 'kg' });
        expect(parseItemInput('Salt 100gms')).toEqual({ name: 'salt', qty: 0.1, unit: 'kg' });
        expect(parseItemInput('Flour 1.5 lb')).toEqual({ name: 'flour', qty: 1.5, unit: 'lb' });
    });

    it('parses items with count units', () => {
        expect(parseItemInput('egg 12')).toEqual({ name: 'egg', qty: 12, unit: 'pcs' }); // Fallback to pcs if no unit
        expect(parseItemInput('dozen eggs')).toEqual({ name: 'egg', qty: 12, unit: 'pcs' });
        expect(parseItemInput('soap 3 pcs')).toEqual({ name: 'soap', qty: 3, unit: 'pcs' });
        expect(parseItemInput('apple 5 pieces')).toEqual({ name: 'apple', qty: 5, unit: 'pcs' });
    });

    it('handles fractional multipliers properly', () => {
        expect(parseItemInput('half liter of milk')).toEqual({ name: 'milk', qty: 0.5, unit: 'L' });
        expect(parseItemInput('quarter kg of sugar')).toEqual({ name: 'sugar', qty: 0.25, unit: 'kg' });
        expect(parseItemInput('half dozen eggs')).toEqual({ name: 'egg', qty: 6, unit: 'pcs' });
        expect(parseItemInput('half-dozen apples')).toEqual({ name: 'apple', qty: 6, unit: 'pcs' });
    });

    it('handles couple or few multipliers properly', () => {
        expect(parseItemInput('couple of apples')).toEqual({ name: 'apple', qty: 2, unit: 'pcs' });
        expect(parseItemInput('few packs of noodles')).toEqual({ name: 'noodle', qty: 3, unit: 'pack' });
    });

    it('handles strings ending in number', () => {
        expect(parseItemInput('shampoo2 1')).toEqual({ name: 'shampoo', qty: 1, unit: 'pcs' });
        // Assuming compromise correctly parses 'shampoo2 1' as qty=1 name=shampoo
    });

    it('handles fallback qty', () => {
        // If user typed 'apple'
        expect(parseItemInput('apple')).toEqual({ name: 'apple', qty: 1, unit: 'pcs' });
    });

    it('singularizes correctly', () => {
        expect(parseItemInput('apples 5')).toEqual({ name: 'apple', qty: 5, unit: 'pcs' });
        expect(parseItemInput('potatoes 2kg')).toEqual({ name: 'potato', qty: 2, unit: 'kg' });
    });
});
