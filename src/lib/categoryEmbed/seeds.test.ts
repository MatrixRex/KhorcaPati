import { describe, it, expect } from 'vitest';
import seeds from './seeds.json';
import { HELDOUT_ITEMS, HELDOUT_KEY_TERMS } from './heldout';
import { flattenSeeds, hashSeeds, normalizeSeedText } from './seedData';
import { EVAL_CATEGORIES } from '@/lib/aiEval/dataset';
import seedVectors from './seedVectors.json';
import { EMBED_MODEL_ID } from './model';

const entries = flattenSeeds(seeds);
const known = new Set<string>(EVAL_CATEGORIES);

describe('seed list', () => {
    it('only uses standard category names', () => {
        for (const cat of Object.keys(seeds.categories)) expect(known.has(cat), cat).toBe(true);
    });

    it('has at least 20 entries per category', () => {
        for (const [cat, words] of Object.entries(seeds.categories)) expect(words.length, cat).toBeGreaterThanOrEqual(20);
    });

    it('never lists the same text twice, even across categories', () => {
        const seen = new Map<string, string>();
        for (const e of entries) {
            const key = normalizeSeedText(e.text);
            expect(seen.has(key), `"${e.text}" in ${e.category} and ${seen.get(key)}`).toBe(false);
            seen.set(key, e.category);
        }
    });

    it('keeps held-out test items out of the seeds', () => {
        const seedTexts = new Set(entries.map(e => normalizeSeedText(e.text)));
        for (const item of HELDOUT_ITEMS) {
            expect(seedTexts.has(normalizeSeedText(item.text)), item.text).toBe(false);
            expect(known.has(item.category), item.category).toBe(true);
        }
    });

    it('never contains a distinctive held-out word, even inside a longer phrase', () => {
        const terms = HELDOUT_KEY_TERMS.map(t => ` ${normalizeSeedText(t)} `);
        const violations = entries.flatMap(e => {
            const words = ` ${normalizeSeedText(e.text)} `;
            return terms.filter(t => words.includes(t)).map(t => `"${e.text}" contains "${t.trim()}"`);
        });
        expect(violations).toEqual([]);
    });

    it('hashes deterministically and changes when the list changes', () => {
        expect(hashSeeds(entries, 'm')).toBe(hashSeeds(flattenSeeds(seeds), 'm'));
        expect(hashSeeds(entries, 'm')).not.toBe(hashSeeds(entries.slice(1), 'm'));
        expect(hashSeeds(entries, 'm')).not.toBe(hashSeeds(entries, 'other-model'));
    });
});

describe('prebuilt seed vectors', () => {
    it('match the current seed list and model (run `pnpm seeds:build` after editing seeds.json)', () => {
        expect(seedVectors.model).toBe(EMBED_MODEL_ID);
        expect(seedVectors.hash).toBe(hashSeeds(entries, EMBED_MODEL_ID));
        expect(seedVectors.vectors.count).toBe(entries.length);
        expect(seedVectors.vectors.dims).toBe(384);
    });
});
