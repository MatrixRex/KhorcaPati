import { describe, it, expect } from 'vitest';
import { scoreCase, summarize, percentile, type CaseResult } from './scoring';
import type { EvalCase, PredictedTransaction } from './types';

const baseCase = (overrides: Partial<EvalCase> = {}): EvalCase => ({
    id: 'c1',
    tags: ['en'],
    note: 'lunch 180, bus 40',
    referenceDate: '2026-10-04',
    expected: [
        { amount: 180, type: 'expense', category: 'Food & Dining' },
        { amount: 40, type: 'expense', category: 'Transport' },
    ],
    ...overrides,
});

const pred = (overrides: Partial<PredictedTransaction> = {}): PredictedTransaction => ({
    amount: 180,
    type: 'expense',
    category: 'Food & Dining',
    date: '2026-10-04',
    items: [],
    ...overrides,
});

describe('scoreCase', () => {
    it('marks a fully correct prediction as perfect', () => {
        const s = scoreCase(baseCase(), [pred(), pred({ amount: 40, category: 'Transport' })]);
        expect(s.matchedCount).toBe(2);
        expect(s.categoryCorrect).toBe(2);
        expect(s.typeCorrect).toBe(2);
        expect(s.dateCorrect).toBe(2);
        expect(s.perfect).toBe(true);
        expect(s.mismatches).toEqual([]);
    });

    it('matches transactions by amount regardless of order', () => {
        const s = scoreCase(baseCase(), [pred({ amount: 40, category: 'Transport' }), pred()]);
        expect(s.perfect).toBe(true);
    });

    it('counts missing and extra transactions', () => {
        const s = scoreCase(baseCase(), [pred(), pred({ amount: 999 })]);
        expect(s.expectedCount).toBe(2);
        expect(s.predictedCount).toBe(2);
        expect(s.matchedCount).toBe(1);
        expect(s.perfect).toBe(false);
        expect(s.mismatches.some(m => m.includes('missing') && m.includes('40'))).toBe(true);
        expect(s.mismatches.some(m => m.includes('extra') && m.includes('999'))).toBe(true);
    });

    it('accepts any category from an alternatives list, case-insensitively', () => {
        const c = baseCase({ expected: [{ amount: 180, type: 'expense', category: ['Food & Dining', 'Groceries'] }] });
        expect(scoreCase(c, [pred({ category: 'groceries' })]).categoryCorrect).toBe(1);
        expect(scoreCase(c, [pred({ category: 'Transport' })]).categoryCorrect).toBe(0);
    });

    it('prefers a same-category candidate when several predictions share an amount', () => {
        const c = baseCase({
            expected: [
                { amount: 50, type: 'expense', category: 'Transport' },
                { amount: 50, type: 'expense', category: 'Food & Dining' },
            ],
        });
        const s = scoreCase(c, [pred({ amount: 50, category: 'Food & Dining' }), pred({ amount: 50, category: 'Transport' })]);
        expect(s.categoryCorrect).toBe(2);
    });

    it('checks type and date, defaulting the expected date to the reference date', () => {
        const c = baseCase({ expected: [{ amount: 180, type: 'income', category: 'Food & Dining', date: '2026-10-03' }] });
        const s = scoreCase(c, [pred()]);
        expect(s.typeCorrect).toBe(0);
        expect(s.dateCorrect).toBe(0);
        expect(scoreCase(baseCase({ expected: [baseCase().expected[0]] }), [pred()]).dateCorrect).toBe(1);
    });

    it('only scores items when the expectation lists them', () => {
        const c = baseCase({
            expected: [{
                amount: 100,
                type: 'expense',
                category: 'Groceries',
                items: [{ name: ['dim', 'egg'], qty: 8, unit: 'pcs' }],
            }],
        });
        const good = scoreCase(c, [pred({ amount: 100, category: 'Groceries', items: [{ name: 'eggs', qty: 8, unit: 'PCS' }] })]);
        expect(good.itemsChecked).toBe(1);
        expect(good.itemsCorrect).toBe(1);

        const wrongQty = scoreCase(c, [pred({ amount: 100, category: 'Groceries', items: [{ name: 'egg', qty: 2, unit: 'pcs' }] })]);
        expect(wrongQty.itemsCorrect).toBe(0);
        expect(wrongQty.perfect).toBe(false);

        const unchecked = scoreCase(baseCase({ expected: [baseCase().expected[0]] }), [pred({ items: [{ name: 'x', qty: 1, unit: 'pcs' }] })]);
        expect(unchecked.itemsChecked).toBe(0);
    });

    it('treats an empty expectation with no predictions as perfect', () => {
        const s = scoreCase(baseCase({ expected: [] }), []);
        expect(s.perfect).toBe(true);
        expect(scoreCase(baseCase({ expected: [] }), [pred()]).perfect).toBe(false);
    });
});

describe('percentile', () => {
    it('uses nearest-rank and handles empty input', () => {
        expect(percentile([], 50)).toBe(0);
        expect(percentile([30, 10, 20], 50)).toBe(20);
        expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95)).toBe(10);
    });
});

describe('summarize', () => {
    const result = (overrides: Partial<CaseResult>): CaseResult => ({
        caseId: 'c',
        tags: ['en'],
        durationMs: 100,
        predicted: [],
        score: scoreCase(baseCase(), [pred(), pred({ amount: 40, category: 'Transport' })]),
        ...overrides,
    });

    it('aggregates accuracy, latency and per-tag results', () => {
        const ok = result({ caseId: 'a', durationMs: 100 });
        const partial = result({
            caseId: 'b',
            tags: ['bangla'],
            durationMs: 300,
            score: scoreCase(baseCase(), [pred({ category: 'Transport' })]),
        });
        const failed = result({ caseId: 'c', tags: ['bangla'], durationMs: 200, score: scoreCase(baseCase(), []), error: 'bad json' });

        const s = summarize([ok, partial, failed]);
        expect(s.cases).toBe(3);
        expect(s.perfect).toBe(1);
        expect(s.errors).toBe(1);
        // expected 6, predicted 3, matched 3
        expect(s.amountRecall).toBeCloseTo(0.5);
        expect(s.amountPrecision).toBeCloseTo(1);
        expect(s.amountF1).toBeCloseTo(2 / 3);
        // category: 2 of 2 in ok, 0 of 1 in partial
        expect(s.categoryAccuracy).toBeCloseTo(2 / 3);
        expect(s.typeAccuracy).toBeCloseTo(1);
        expect(s.itemAccuracy).toBeNull();
        expect(s.latency.meanMs).toBe(200);
        expect(s.latency.p50Ms).toBe(200);
        expect(s.byTag.bangla).toEqual({ cases: 2, perfect: 0 });
        expect(s.byTag.en).toEqual({ cases: 1, perfect: 1 });
    });

    it('returns zeros for an empty run', () => {
        const s = summarize([]);
        expect(s.cases).toBe(0);
        expect(s.amountF1).toBe(0);
        expect(s.categoryAccuracy).toBeNull();
    });
});
