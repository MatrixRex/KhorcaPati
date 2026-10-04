import { describe, it, expect } from 'vitest';
import { classifyVector, cosine, type LabelledVector } from './classifier';

const ex = (text: string, category: string, vector: number[], source: LabelledVector['source'] = 'seed'): LabelledVector =>
    ({ text, category, source, vector });

describe('cosine', () => {
    it('is 1 for same direction, 0 for orthogonal, and safe for zero vectors', () => {
        expect(cosine([1, 0], [2, 0])).toBeCloseTo(1);
        expect(cosine([1, 0], [0, 3])).toBeCloseTo(0);
        expect(cosine([0, 0], [1, 0])).toBe(0);
    });
});

describe('classifyVector', () => {
    const examples = [
        ex('uber', 'Transport', [1, 0, 0]),
        ex('cng', 'Transport', [0.9, 0.1, 0]),
        ex('bazar', 'Groceries', [0, 1, 0]),
        ex('mach', 'Groceries', [0.1, 0.9, 0]),
        ex('napa', 'Healthcare', [0, 0, 1]),
    ];

    it('picks the category of the nearest examples and reports neighbours', () => {
        const r = classifyVector([0.95, 0.05, 0], examples, { k: 3 });
        expect(r.category).toBe('Transport');
        expect(r.score).toBeGreaterThan(0.9);
        expect(r.neighbors[0].text).toBe('uber');
        expect(r.neighbors).toHaveLength(3);
    });

    it('lets one user correction outweigh several seeds', () => {
        const withCorrection = [...examples, ex('pathao food', 'Food & Dining', [0.7, 0.3, 0], 'correction')];
        const query = [0.72, 0.28, 0];
        expect(classifyVector(query, examples, { k: 3 }).category).toBe('Transport');
        expect(classifyVector(query, withCorrection, { k: 3 }).category).toBe('Food & Dining');
    });

    it('lets a clearly closer neighbour beat several slightly farther ones', () => {
        const near = [
            ex('fuchka', 'Food & Dining', [1, 0, 0]),
            ex('doctor fee', 'Healthcare', [0.8, 0.6, 0]),
            ex('tuition fee', 'Education', [0.8, 0.6, 0]),
            ex('exam fee', 'Education', [0.8, 0.6, 0]),
        ];
        // Closest is fuchka (~0.99); the three "fee" entries sit ~0.85 and would win a plain count.
        expect(classifyVector([0.99, 0.1, 0], near, { k: 4 }).category).toBe('Food & Dining');
    });

    it('adds a centroid vote that can overturn a single stray neighbour', () => {
        // "indrive" lands nearest "pendrive", but the Transport category as a whole is much closer.
        const stray = [
            ex('pendrive', 'Shopping', [1, 0, 0]),
            ex('uber', 'Transport', [0.6, 0.8, 0]),
            ex('cng', 'Transport', [0.6, 0.8, 0]),
        ];
        const centroids = new Map([['Shopping', [0.3, 0, 0.95]], ['Transport', [0.8, 0.6, 0]]]);
        const query = [0.95, 0.31, 0];
        expect(classifyVector(query, stray, { k: 3, temperature: 0.05 }).category).toBe('Shopping');
        expect(classifyVector(query, stray, { k: 3, temperature: 0.05, centroids, centroidWeight: 2 }).category).toBe('Transport');
    });

    it('uses a near-identical example directly, preferring corrections, even against the centroid vote', () => {
        const examples2 = [
            ex('pathao food', 'Transport', [1, 0, 0]),
            ex('pathao food', 'Food & Dining', [1, 0, 0], 'correction'),
        ];
        const centroids = new Map([['Transport', [1, 0, 0]], ['Food & Dining', [0, 1, 0]]]);
        const r = classifyVector([1, 0, 0], examples2, { centroids, centroidWeight: 5 });
        expect(r.category).toBe('Food & Dining');
        expect(r.score).toBeCloseTo(1);
    });

    it('only considers allowed categories (e.g. expense categories for an expense)', () => {
        const centroids = new Map([['Transport', [1, 0, 0]], ['Groceries', [0, 1, 0]]]);
        const r = classifyVector([0.95, 0.05, 0], examples, { centroids, centroidWeight: 0.5, allowedCategories: new Set(['Groceries', 'Healthcare']) });
        expect(r.category).toBe('Groceries');
        expect(r.neighbors.every(n => n.category !== 'Transport')).toBe(true);
    });

    it('returns no category when nothing is similar enough', () => {
        const r = classifyVector([0, 0.1, -1], examples, { k: 3, minScore: 0.5 });
        expect(r.category).toBeNull();
    });

    it('handles an empty example set', () => {
        expect(classifyVector([1, 0, 0], [], {}).category).toBeNull();
    });
});
