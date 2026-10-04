// Explicit .ts extension: this module is also imported by Node scripts (scripts/eval-categories.ts).
import { classifyVector, type ClassifyOptions, type ClassifyResult, type LabelledVector } from './classifier.ts';

/**
 * Examples prepared for fast categorization. e5 vectors share a large common direction (every pair scores
 * ~0.8-0.9); subtracting the mean spreads them apart, and per-category centroids add a "general sense of the
 * category" vote. Picked by scripts/compare-category-methods.ts on the 385 held-out items.
 */
export interface CategoryIndex {
    mean: Float32Array;
    examples: LabelledVector[];
    centroids: Map<string, Float32Array>;
}

export const DEFAULT_CATEGORIZE_OPTIONS: ClassifyOptions = { k: 5, temperature: 0.05, centroidWeight: 0.5 };

function centerVector(v: ArrayLike<number>, mean: Float32Array): Float32Array {
    const out = new Float32Array(v.length);
    let norm = 0;
    for (let i = 0; i < v.length; i++) {
        out[i] = v[i] - mean[i];
        norm += out[i] * out[i];
    }
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < out.length; i++) out[i] /= norm;
    return out;
}

export function buildCategoryIndex(examples: LabelledVector[], { center = true }: { center?: boolean } = {}): CategoryIndex {
    const dims = examples[0]?.vector.length ?? 0;
    const mean = new Float32Array(dims);
    if (center && examples.length > 0) {
        for (const e of examples) for (let i = 0; i < dims; i++) mean[i] += e.vector[i] / examples.length;
    }

    const centered = examples.map(e => ({ ...e, vector: centerVector(e.vector, mean) }));

    const sums = new Map<string, { sum: Float32Array; count: number }>();
    for (const e of centered) {
        const entry = sums.get(e.category) ?? { sum: new Float32Array(dims), count: 0 };
        for (let i = 0; i < dims; i++) entry.sum[i] += e.vector[i];
        entry.count++;
        sums.set(e.category, entry);
    }
    const centroids = new Map([...sums].map(([category, { sum, count }]) => [category, sum.map(x => x / count)]));

    return { mean, examples: centered, centroids };
}

export function categorize(index: CategoryIndex, query: ArrayLike<number>, options: ClassifyOptions = {}): ClassifyResult {
    return classifyVector(centerVector(query, index.mean), index.examples, {
        ...DEFAULT_CATEGORIZE_OPTIONS,
        centroids: index.centroids,
        ...options,
    });
}
