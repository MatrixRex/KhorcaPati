import { describe, it, expect, vi } from 'vitest';
import { createUserCategorizer, mapStandardCategories } from './userCategorizer';
import { packVectors } from '@/lib/categoryEmbed/vectorPack';
import type { SeedVectorFile } from '@/lib/categoryEmbed/categorizer';

/** 4-dim fake space: food, groceries, transport, income. */
const AXES: Array<[RegExp, number[]]> = [
    [/lunch|biryani|cha|nasta|food/, [1, 0, 0, 0]],
    [/bazar|mach|sobji/, [0, 1, 0, 0]],
    [/uber|cng|rickshaw/, [0, 0, 1, 0]],
    [/salary|beton|client/, [0, 0, 0, 1]],
];
const vectorFor = (text: string) => AXES.find(([re]) => re.test(text))?.[1] ?? [0.5, 0.5, 0.5, 0.5];
const fakeEmbedder = () => ({ embed: vi.fn(async (texts: string[]) => texts.map(vectorFor)) });

const seedFile: SeedVectorFile = {
    model: 'm',
    entries: [
        { text: 'lunch', category: 'Food & Dining' },
        { text: 'biryani', category: 'Food & Dining' },
        { text: 'bazar', category: 'Groceries' },
        { text: 'mach', category: 'Groceries' },
        { text: 'uber', category: 'Transport' },
        { text: 'cng', category: 'Transport' },
        { text: 'salary', category: 'Salary' },
        { text: 'beton', category: 'Salary' },
    ],
    vectors: packVectors(['lunch', 'biryani', 'bazar', 'mach', 'uber', 'cng', 'salary', 'beton'].map(vectorFor)),
};

const baseContext = { userCategories: ['Unlisted'], deletedCategories: [], history: [], preferences: {} };

describe('mapStandardCategories', () => {
    it('maps standard names to the user’s own categories by exact name, then aliases', () => {
        const map = mapStandardCategories(['Food & Dining', 'Groceries', 'Transport', 'Salary'], ['Food', 'Bazar', 'Transport', 'Unlisted']);
        expect(map.get('Food & Dining')).toBe('Food');
        expect(map.get('Groceries')).toBe('Bazar');
        expect(map.get('Transport')).toBe('Transport');
        expect(map.get('Salary')).toBe('Salary'); // no match: keep the standard name (created on import)
    });

    it('matches case-insensitively', () => {
        expect(mapStandardCategories(['Transport'], ['transport']).get('Transport')).toBe('transport');
    });
});

describe('createUserCategorizer', () => {
    it('uses seed knowledge under the user’s category names', async () => {
        const categorizer = await createUserCategorizer(fakeEmbedder(), seedFile, { ...baseContext, userCategories: ['Food', 'Unlisted'] }, new Map());
        const [r] = await categorizer.categorize(['biryani khelam'], ['expense']);
        expect(r.category).toBe('Food');
    });

    it('never returns a deleted category', async () => {
        const categorizer = await createUserCategorizer(fakeEmbedder(), seedFile, { ...baseContext, deletedCategories: ['transport'] }, new Map());
        const [r] = await categorizer.categorize(['uber'], ['expense']);
        expect(r.category).not.toBe('Transport');
    });

    it('lets the user’s corrections and history decide over seeds, including custom categories', async () => {
        const categorizer = await createUserCategorizer(fakeEmbedder(), seedFile, {
            ...baseContext,
            userCategories: ['Office', 'Unlisted'],
            history: [{ text: 'uber office', category: 'Office', type: 'expense' }],
            preferences: { cng: 'Office' },
        }, new Map());
        const [fromHistory, fromCorrection] = await categorizer.categorize(['Uber office', 'cng'], ['expense', 'expense']);
        expect(fromHistory.category).toBe('Office');
        expect(fromCorrection.category).toBe('Office');
    });

    it('treats categories used on income history as income categories', async () => {
        const categorizer = await createUserCategorizer(fakeEmbedder(), seedFile, {
            ...baseContext,
            history: [{ text: 'client taka', category: 'Freelance', type: 'income' }],
        }, new Map());
        const [r] = await categorizer.categorize(['client taka'], ['income']);
        expect(r.category).toBe('Freelance');
        const [expense] = await categorizer.categorize(['client taka'], ['expense']);
        expect(expense.category).not.toBe('Freelance');
    });

    it('skips Unlisted history and only embeds texts it has not seen before', async () => {
        const embedder = fakeEmbedder();
        const cache = new Map();
        const context = { ...baseContext, history: [
            { text: 'mach', category: 'Groceries', type: 'expense' as const },
            { text: 'something', category: 'Unlisted', type: 'expense' as const },
        ] };
        await createUserCategorizer(embedder, seedFile, context, cache);
        await createUserCategorizer(embedder, seedFile, context, cache);
        const embedded = embedder.embed.mock.calls.flatMap(c => c[0]);
        expect(embedded).toEqual(['query: mach']);
    });
});
