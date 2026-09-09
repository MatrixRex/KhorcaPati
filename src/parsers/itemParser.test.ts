import { describe, it, expect } from 'vitest';
import { parseItemInput } from './itemParser';

describe('Smart Item Parser', () => {
    it('parses typical items with volume units', () => {
        expect(parseItemInput('Oil 1L')).toEqual({ name: 'oil', qty: 1, unit: 'L' });
        expect(parseItemInput('Milk 500ml')).toEqual({ name: 'milk', qty: 0.5, unit: 'L' });
        expect(parseItemInput('Water 2.5 liter')).toEqual({ name: 'water', qty: 2.5, unit: 'L' });
        expect(parseItemInput('Oil 1ltr')).toEqual({ name: 'oil', qty: 1, unit: 'L' });
        expect(parseItemInput('Oil 2 ltr')).toEqual({ name: 'oil', qty: 2, unit: 'L' });
        expect(parseItemInput('Oil 2 ltrs')).toEqual({ name: 'oil', qty: 2, unit: 'L' });
        expect(parseItemInput('Oil 2lt')).toEqual({ name: 'oil', qty: 2, unit: 'L' });
        expect(parseItemInput('Oil 2-ltr')).toEqual({ name: 'oil', qty: 2, unit: 'L' });
        expect(parseItemInput('Water 2 litter')).toEqual({ name: 'water', qty: 2, unit: 'L' });
        expect(parseItemInput('Water 2 litters')).toEqual({ name: 'water', qty: 2, unit: 'L' });
        expect(parseItemInput('Juice 1.5 litre')).toEqual({ name: 'juice', qty: 1.5, unit: 'L' });
        expect(parseItemInput('Juice 2 litres')).toEqual({ name: 'juice', qty: 2, unit: 'L' });
    });

    it('parses items with weight units', () => {
        expect(parseItemInput('rice 2kg')).toEqual({ name: 'rice', qty: 2, unit: 'kg' });
        expect(parseItemInput('Sugar 500g')).toEqual({ name: 'sugar', qty: 0.5, unit: 'kg' });
        expect(parseItemInput('Rice 250 gm')).toEqual({ name: 'rice', qty: 0.25, unit: 'kg' });
        expect(parseItemInput('Salt 100gms')).toEqual({ name: 'salt', qty: 0.1, unit: 'kg' });
        expect(parseItemInput('Flour 1.5 lb')).toEqual({ name: 'flour', qty: 1.5, unit: 'lb' });
        expect(parseItemInput('Apples 3 kgs')).toEqual({ name: 'apple', qty: 3, unit: 'kg' });
        expect(parseItemInput('Mango 2 kilo')).toEqual({ name: 'mango', qty: 2, unit: 'kg' });
    });

    it('parses items with count and packaging units', () => {
        expect(parseItemInput('egg 12')).toEqual({ name: 'egg', qty: 12, unit: 'pcs' }); // Fallback to pcs if no unit
        expect(parseItemInput('dozen eggs')).toEqual({ name: 'egg', qty: 12, unit: 'pcs' });
        expect(parseItemInput('soap 3 pcs')).toEqual({ name: 'soap', qty: 3, unit: 'pcs' });
        expect(parseItemInput('apple 5 pieces')).toEqual({ name: 'apple', qty: 5, unit: 'pcs' });
        expect(parseItemInput('coke 2 bottles')).toEqual({ name: 'coke', qty: 2, unit: 'bottle' });
        expect(parseItemInput('rice 1 bag')).toEqual({ name: 'rice', qty: 1, unit: 'bag' });
        expect(parseItemInput('napa 2 strips')).toEqual({ name: 'napa', qty: 2, unit: 'strip' });
        expect(parseItemInput('soda 3 cans')).toEqual({ name: 'soda', qty: 3, unit: 'can' });
        expect(parseItemInput('tissue 2 boxes')).toEqual({ name: 'tissue', qty: 2, unit: 'box' });
    });

    it('parses South Asian and regional units', () => {
        expect(parseItemInput('1 hali eggs')).toEqual({ name: 'egg', qty: 4, unit: 'pcs' });
        expect(parseItemInput('2 hali egg')).toEqual({ name: 'egg', qty: 8, unit: 'pcs' });
        expect(parseItemInput('1 pair shoes')).toEqual({ name: 'shoe', qty: 2, unit: 'pcs' });
        expect(parseItemInput('1 poa chili')).toEqual({ name: 'chili', qty: 0.25, unit: 'kg' });
        expect(parseItemInput('cloth 3 gaj')).toEqual({ name: 'cloth', qty: 3, unit: 'gaj' });
    });

    it('handles Bengali numerals and units correctly', () => {
        expect(parseItemInput('২ লিটার তেল')).toEqual({ name: 'তেল', qty: 2, unit: 'L' });
        expect(parseItemInput('১ কেজি চিনি')).toEqual({ name: 'চিনি', qty: 1, unit: 'kg' });
        expect(parseItemInput('২ হালি ডিম')).toEqual({ name: 'ডিম', qty: 8, unit: 'pcs' });
        expect(parseItemInput('১ জোড়া জুতো')).toEqual({ name: 'জুতো', qty: 2, unit: 'pcs' });
    });

    it('handles fractional multipliers properly', () => {
        expect(parseItemInput('half liter of milk')).toEqual({ name: 'milk', qty: 0.5, unit: 'L' });
        expect(parseItemInput('half ltr of milk')).toEqual({ name: 'milk', qty: 0.5, unit: 'L' });
        expect(parseItemInput('half litter of milk')).toEqual({ name: 'milk', qty: 0.5, unit: 'L' });
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
    });

    it('handles fallback qty', () => {
        expect(parseItemInput('apple')).toEqual({ name: 'apple', qty: 1, unit: 'pcs' });
    });

    it('singularizes correctly', () => {
        expect(parseItemInput('apples 5')).toEqual({ name: 'apple', qty: 5, unit: 'pcs' });
        expect(parseItemInput('potatoes 2kg')).toEqual({ name: 'potato', qty: 2, unit: 'kg' });
    });

    it('handles count multipliers like x24 and 24x with or without trailing price', () => {
        expect(parseItemInput('egg x24')).toEqual({ name: 'egg', qty: 24, unit: 'pcs' });
        expect(parseItemInput('egg 24x')).toEqual({ name: 'egg', qty: 24, unit: 'pcs' });
        expect(parseItemInput('egg x24 120')).toEqual({ name: 'egg', qty: 24, unit: 'pcs' });
        expect(parseItemInput('x12 eggs')).toEqual({ name: 'egg', qty: 12, unit: 'pcs' });
    });

    it('cleans trailing prices and currency markers properly', () => {
        expect(parseItemInput('oil 2ltr 380 tk')).toEqual({ name: 'oil', qty: 2, unit: 'L' });
        expect(parseItemInput('oil 2 ltr 380')).toEqual({ name: 'oil', qty: 2, unit: 'L' });
        expect(parseItemInput('soybean oil 5 ltr 850 taka')).toEqual({ name: 'soybean oil', qty: 5, unit: 'L' });
    });
});
