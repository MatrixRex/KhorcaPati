import { describe, it, expect } from 'vitest';
import { editDistance, searchExpenses, searchItems, scoreFields, normalizeText } from './search';
import { type Expense, type Item } from '@/db/schema';

const exp = (id: number, over: Partial<Expense> = {}): Expense => ({
    id, parentId: null, isNested: false, amount: 100, type: 'expense', category: 'Food',
    date: '2026-01-01', note: '', isRecurring: false, recurringInterval: null,
    recurringNextDue: null, itemAutoTrack: true, tags: [], createdAt: '', updatedAt: '', ...over,
});
const item = (id: number, name: string, over: Partial<Item> = {}): Item => ({
    id, expenseId: 1, name, rawInput: name, qty: 1, unit: 'pcs', date: '2026-01-01', note: '', createdAt: '', ...over,
});

describe('search', () => {
    it('normalizes Bangla digits and punctuation', () => {
        expect(normalizeText('  Oil,  ১২০ ')).toBe('oil 120');
    });

    it('edit distance handles transposition', () => {
        expect(editDistance('milk', 'mlik')).toBe(1);
        expect(editDistance('abc', 'abc')).toBe(0);
    });

    it('returns nothing for blank query or no match', () => {
        expect(searchExpenses([exp(1, { note: 'rice' })], '   ')).toEqual([]);
        expect(searchExpenses([exp(1, { note: 'rice' })], 'zebra')).toEqual([]);
    });

    it('tolerates typos', () => {
        expect(searchExpenses([exp(1, { note: 'chicken biryani' })], 'chiken')).toHaveLength(1);
        expect(searchExpenses([exp(1, { note: 'chicken biryani' })], 'biriyani')).toHaveLength(1);
    });

    it('does not fuzzy-match very short words', () => {
        expect(searchExpenses([exp(1, { note: 'cat' })], 'car')).toEqual([]);
    });

    it('ranks exact above prefix above substring', () => {
        const list = [
            exp(3, { note: 'steak' }),
            exp(2, { note: 'teacher fee' }),
            exp(1, { note: 'tea stall' }),
        ];
        expect(searchExpenses(list, 'tea').map(x => x.item.id)).toEqual([1, 2, 3]);
    });

    it('requires every token to match', () => {
        const list = [exp(1, { note: 'oil 1L' }), exp(2, { note: 'oil', category: 'Grocery' })];
        expect(searchExpenses(list, 'oil grocery').map(x => x.item.id)).toEqual([2]);
    });

    it('matches amount exactly and by leading digits, not fuzzily', () => {
        const list = [exp(1, { amount: 120 }), exp(2, { amount: 1250 }), exp(3, { amount: 99 })];
        expect(searchExpenses(list, '120').map(x => x.item.id).sort()).toEqual([1]);
        expect(searchExpenses(list, '12').map(x => x.item.id).sort()).toEqual([1, 2]);
    });

    it('understands intent words for type', () => {
        const list = [exp(1, { type: 'income', note: 'x' }), exp(2, { type: 'expense', note: 'x' })];
        expect(searchExpenses(list, 'earned').map(x => x.item.id)).toEqual([1]);
    });

    it('matches category with a typo', () => {
        expect(searchExpenses([exp(1, { category: 'Transport' })], 'transprot')).toHaveLength(1);
    });

    it('searches items by name, raw input and unit', () => {
        const list = [item(1, 'oil', { rawInput: 'Oil 1L', unit: 'L' }), item(2, 'rice', { unit: 'kg' })];
        expect(searchItems(list, 'oil').map(x => x.item.id)).toEqual([1]);
        expect(searchItems(list, 'kg').map(x => x.item.id)).toEqual([2]);
    });

    it('whole-phrase hit scores higher than scattered words', () => {
        const a = scoreFields('green tea', [{ text: 'green tea', weight: 1 }]);
        const b = scoreFields('green tea', [{ text: 'tea with green apple', weight: 1 }]);
        expect(a).toBeGreaterThan(b);
    });
});
