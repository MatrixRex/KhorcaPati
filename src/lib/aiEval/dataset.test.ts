import { describe, it, expect } from 'vitest';
import { EVAL_CASES, EVAL_CATEGORIES } from './dataset';
import { HOLDOUT_EVAL_CASES } from './holdoutDataset';

const LANG_TAGS = ['en', 'banglish', 'bangla', 'mixed'];
const categorySet = new Set<string>(EVAL_CATEGORIES);

const ALL_CASES = [...EVAL_CASES, ...HOLDOUT_EVAL_CASES];

describe('eval dataset integrity', () => {
    it('has unique case ids', () => {
        const ids = ALL_CASES.map(c => c.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('starts every tag list with a language tag', () => {
        for (const c of ALL_CASES) {
            expect(LANG_TAGS, c.id).toContain(c.tags[0]);
        }
    });

    it('uses valid dates and only known categories', () => {
        for (const c of ALL_CASES) {
            expect(c.referenceDate, c.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            for (const tx of c.expected) {
                const cats = Array.isArray(tx.category) ? tx.category : [tx.category];
                for (const cat of cats) expect(categorySet.has(cat), `${c.id}: ${cat}`).toBe(true);
                if (tx.date) expect(tx.date, c.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
                expect(tx.amount, c.id).toBeGreaterThan(0);
            }
        }
    });

    it('covers every language with at least five cases', () => {
        for (const lang of LANG_TAGS) {
            expect(EVAL_CASES.filter(c => c.tags[0] === lang).length, lang).toBeGreaterThanOrEqual(5);
        }
    });
});
