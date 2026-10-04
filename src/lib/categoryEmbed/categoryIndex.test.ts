import { describe, it, expect } from 'vitest';
import { buildCategoryIndex, categorize } from './categoryIndex';
import type { LabelledVector } from './classifier';

const ex = (text: string, category: string, vector: number[], source: LabelledVector['source'] = 'seed'): LabelledVector =>
    ({ text, category, source, vector });

describe('buildCategoryIndex', () => {
    const examples = [
        ex('a', 'X', [1, 1, 0]),
        ex('b', 'X', [1, 0.8, 0]),
        ex('c', 'Y', [1, 0, 1]),
    ];

    it('subtracts the shared mean so examples spread apart', () => {
        const index = buildCategoryIndex(examples);
        expect(index.mean[0]).toBeCloseTo(1);
        // The shared first component is gone, so X and Y now point in different directions.
        expect(index.examples[0].vector[0]).toBeCloseTo(0);
        expect(index.centroids.size).toBe(2);
    });

    it('can skip centering', () => {
        const index = buildCategoryIndex(examples, { center: false });
        expect(Array.from(index.mean)).toEqual([0, 0, 0]);
    });
});

describe('categorize', () => {
    it('centers the query with the index mean before classifying', () => {
        const index = buildCategoryIndex([
            ex('bazar', 'Groceries', [1, 1, 0]),
            ex('mach', 'Groceries', [1, 0.9, 0.1]),
            ex('uber', 'Transport', [1, 0, 1]),
            ex('cng', 'Transport', [1, 0.1, 0.9]),
        ]);
        expect(categorize(index, [1, 0.95, 0.05]).category).toBe('Groceries');
        expect(categorize(index, [1, 0.05, 0.95]).category).toBe('Transport');
    });

    it('lets user corrections win for the same item', () => {
        const index = buildCategoryIndex([
            ex('pathao food', 'Transport', [1, 0.5, 0.5]),
            ex('uber', 'Transport', [1, 0.4, 0.6]),
            ex('lunch', 'Food & Dining', [1, 0.9, 0]),
            ex('pathao food', 'Food & Dining', [1, 0.5, 0.5], 'correction'),
        ]);
        expect(categorize(index, [1, 0.5, 0.5]).category).toBe('Food & Dining');
    });
});
