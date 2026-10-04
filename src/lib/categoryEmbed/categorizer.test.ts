import { describe, it, expect, vi } from 'vitest';
import { createCategorizer, evaluateCategorizer, examplesFromSeedFile } from './categorizer';
import { packVectors } from './vectorPack';

const seedFile = {
    model: 'm',
    entries: [
        { text: 'bazar', category: 'Groceries' },
        { text: 'mach', category: 'Groceries' },
        { text: 'uber', category: 'Transport' },
        { text: 'cng', category: 'Transport' },
    ],
    vectors: packVectors([[1, 1, 0], [1, 0.9, 0.1], [1, 0, 1], [1, 0.1, 0.9]]),
};

/** Fake embedder: words containing "bazar"/"mach" point at Groceries, anything else at Transport. */
const fakeEmbedder = () => ({
    embed: vi.fn(async (texts: string[]) =>
        texts.map(t => (/bazar|mach|sobji/.test(t) ? [1, 0.95, 0.05] : [1, 0.05, 0.95]))),
});

describe('examplesFromSeedFile', () => {
    it('unpacks seed vectors into labelled seed examples', () => {
        const examples = examplesFromSeedFile(seedFile);
        expect(examples).toHaveLength(4);
        expect(examples[2]).toMatchObject({ text: 'uber', category: 'Transport', source: 'seed' });
        expect(examples[0].vector[0]).toBeCloseTo(1, 1);
    });
});

describe('createCategorizer', () => {
    it('prepares and prefixes text before embedding, then returns categories in order', async () => {
        const embedder = fakeEmbedder();
        const categorizer = createCategorizer(embedder, examplesFromSeedFile(seedFile));
        const results = await categorizer.categorize(['Sobji kinlam', 'uber e office']);
        expect(embedder.embed).toHaveBeenCalledWith(['query: sobji', 'query: uber office']);
        expect(results.map(r => r.category)).toEqual(['Groceries', 'Transport']);
    });

    it('uses an example with identical prepared text directly, without trusting vector similarity', async () => {
        // Vectors deliberately disagree with the text: only the text lookup can get this right.
        const file = { ...seedFile, entries: [{ text: 'khata kolom kinlam', category: 'Education' }, ...seedFile.entries.slice(1)] };
        const categorizer = createCategorizer(fakeEmbedder(), examplesFromSeedFile(file));
        const [r] = await categorizer.categorize(['Khata  kolom']);
        expect(r.category).toBe('Education');
        expect(r.score).toBe(1);
    });

    it('restricts income items to income categories and expenses to the rest', async () => {
        const file = {
            ...seedFile,
            entries: [...seedFile.entries.slice(0, 3), { text: 'tuition taka pelam', category: 'Salary' }],
        };
        const categorizer = createCategorizer(fakeEmbedder(), examplesFromSeedFile(file), { incomeCategories: ['Salary'] });
        // "tuition er taka dilam" prepares to the same text as the Salary seed; as an expense it must not be Salary.
        const [paid] = await categorizer.categorize(['tuition er taka dilam'], ['expense']);
        const [received] = await categorizer.categorize(['tuition er taka dilam'], ['income']);
        expect(paid.category).not.toBe('Salary');
        expect(received.category).toBe('Salary');
    });

    it('skips the embedder for an empty batch', async () => {
        const embedder = fakeEmbedder();
        expect(await createCategorizer(embedder, examplesFromSeedFile(seedFile)).categorize([])).toEqual([]);
        expect(embedder.embed).not.toHaveBeenCalled();
    });
});

describe('evaluateCategorizer', () => {
    it('reports accuracy by language and novelty, timing and mistakes', async () => {
        const categorizer = createCategorizer(fakeEmbedder(), examplesFromSeedFile(seedFile));
        let t = 0;
        const report = await evaluateCategorizer(categorizer, [
            { text: 'mach kinlam', category: 'Groceries', lang: 'banglish' },
            { text: 'sobji', category: 'Groceries', lang: 'en' },
            { text: 'rickshaw', category: 'Transport', lang: 'en' },
            { text: 'potol', category: 'Groceries', lang: 'banglish' },
        ], seedFile.entries, { batchSize: 2, now: () => (t += 10) });

        expect(report.total).toBe(4);
        expect(report.correct).toBe(3); // "potol" maps to Transport in the fake embedder
        expect(report.byLang.en).toEqual({ total: 2, correct: 2 });
        expect(report.novel).toEqual({ total: 3, correct: 2 }); // only "mach kinlam" shares a seed word
        expect(report.variant).toEqual({ total: 1, correct: 1 });
        expect(report.msPerItem).toBe(5);
        expect(report.mistakes).toEqual([{ text: 'potol', expected: 'Groceries', got: 'Transport', nearest: expect.any(Array) }]);
    });

    it('passes the known transaction type for each item when asked', async () => {
        const categorize = vi.fn(async (texts: string[]) => texts.map(() => ({ category: 'Salary', score: 1, neighbors: [] })));
        await evaluateCategorizer({ categorize }, [
            { text: 'beton', category: 'Salary', lang: 'banglish' },
            { text: 'bazar', category: 'Groceries', lang: 'banglish' },
        ], seedFile.entries, { batchSize: 2, typeOf: item => (item.category === 'Salary' ? 'income' : 'expense') });
        expect(categorize).toHaveBeenCalledWith(['beton', 'bazar'], ['income', 'expense']);
    });
});
