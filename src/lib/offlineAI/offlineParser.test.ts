import { describe, it, expect, vi } from 'vitest';
import { parseNoteOffline } from './offlineParser';

const categorizerReturning = (categories: Array<string | null>) => ({
    categorize: vi.fn(async (texts: string[]) => texts.map((_, i) => ({ category: categories[i] ?? null, score: 1, neighbors: [] }))),
});

const input = {
    noteText: 'bazar 1200\nbeton pelam 30000\nsoybean oil 2 ltr 380',
    referenceDate: '2026-10-04',
    categories: [{ name: 'Groceries' }, { name: 'Unlisted' }],
};

describe('parseNoteOffline', () => {
    it('extracts with rules, asks the categorizer with each transaction type, and post-processes like online', async () => {
        const categorizer = categorizerReturning(['groceries', 'Salary', 'Groceries']);
        const txs = await parseNoteOffline(input, categorizer);

        expect(categorizer.categorize).toHaveBeenCalledWith(['bazar', 'beton', 'soybean oil 2 ltr'], ['expense', 'income', 'expense']);
        expect(txs.map(t => [t.title, t.amount, t.type, t.category, t.date])).toEqual([
            ['Bazar', 1200, 'expense', 'Groceries', '2026-10-04'], // matched to the existing category's casing
            ['Beton', 30000, 'income', 'Salary', '2026-10-04'],
            ['Soybean oil 2 ltr', 380, 'expense', 'Groceries', '2026-10-04'],
        ]);
        expect(txs[2].items).toEqual([{ name: 'soybean oil', qty: 2, unit: 'L' }]);
        expect(txs.every(t => t.selected)).toBe(true);
    });

    it('falls back to Unlisted when the categorizer has no answer', async () => {
        const [tx] = await parseNoteOffline({ ...input, noteText: 'misc 50' }, categorizerReturning([null]));
        expect(tx.category).toBe('Unlisted');
    });

    it('keeps learned keyword preferences and deleted-category rules from post-processing', async () => {
        const txs = await parseNoteOffline({
            ...input,
            noteText: 'fan 2500\nuber 250',
            categories: [{ name: 'House' }, { name: 'Transport' }, { name: 'Unlisted' }],
            categoryPreferences: { fan: 'House' },
            deletedCategories: ['Transport'],
        }, categorizerReturning(['Shopping', 'Transport']));
        expect(txs.map(t => t.category)).toEqual(['House', 'Unlisted']);
    });

    it('returns nothing and skips the categorizer when the note has no amounts', async () => {
        const categorizer = categorizerReturning([]);
        expect(await parseNoteOffline({ ...input, noteText: 'remind me to pay rent' }, categorizer)).toEqual([]);
        expect(categorizer.categorize).not.toHaveBeenCalled();
    });
});
