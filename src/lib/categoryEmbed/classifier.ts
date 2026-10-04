/** Where a labelled example came from; user corrections count most. */
export type ExampleSource = 'correction' | 'history' | 'seed';

export interface LabelledVector {
    text: string;
    category: string;
    source: ExampleSource;
    vector: ArrayLike<number>;
}

export interface ClassifyOptions {
    /** Neighbours that vote. */
    k?: number;
    /**
     * Vote sharpness: each neighbour counts exp((sim - best) / temperature). Small values let the closest
     * neighbour dominate, which suits short items where a near-exact match is the strongest signal.
     */
    temperature?: number;
    /** Below this similarity to the best neighbour, return no category. */
    minScore?: number;
    /** At or above this similarity an example counts as the same item and decides directly. */
    exactMatchScore?: number;
    sourceWeights?: Partial<Record<ExampleSource, number>>;
    /** Per-category mean vectors; each adds `centroidWeight × similarity` to its category's vote. */
    centroids?: Map<string, ArrayLike<number>>;
    centroidWeight?: number;
    /** Only these categories may be returned (e.g. income categories for an income item). */
    allowedCategories?: Set<string>;
}

/** Which example wins when several are the same item: the user's own corrections first. */
export const SOURCE_PRIORITY: ExampleSource[] = ['correction', 'history', 'seed'];

export interface ClassifyResult {
    category: string | null;
    /** Similarity of the closest example in the winning category. */
    score: number;
    neighbors: Array<{ text: string; category: string; source: ExampleSource; similarity: number }>;
}

const DEFAULT_WEIGHTS: Record<ExampleSource, number> = { correction: 3, history: 1.5, seed: 1 };

export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}

/**
 * k-nearest-neighbour vote weighted by closeness and by where each example came from,
 * optionally blended with per-category centroid similarity.
 */
export function classifyVector(query: ArrayLike<number>, examples: LabelledVector[], options: ClassifyOptions = {}): ClassifyResult {
    const { k = 5, temperature = 0.01, minScore = -Infinity, exactMatchScore = 0.985, centroids, centroidWeight = 0, allowedCategories } = options;
    const allowed = (category: string) => !allowedCategories || allowedCategories.has(category);
    const weights = { ...DEFAULT_WEIGHTS, ...options.sourceWeights };

    const neighbors = examples
        .filter(e => allowed(e.category))
        .map(e => ({ text: e.text, category: e.category, source: e.source, similarity: cosine(query, e.vector) }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, k);

    if (neighbors.length === 0 || neighbors[0].similarity < minScore) {
        return { category: null, score: neighbors[0]?.similarity ?? 0, neighbors };
    }

    // Same item seen before: trust it outright, the user's own corrections first.
    const exact = neighbors.filter(n => n.similarity >= exactMatchScore);
    if (exact.length > 0) {
        const best = SOURCE_PRIORITY.map(source => exact.find(n => n.source === source)).find(Boolean)!;
        return { category: best.category, score: best.similarity, neighbors };
    }

    const votes = new Map<string, number>();
    for (const n of neighbors) {
        const closeness = Math.exp((n.similarity - neighbors[0].similarity) / temperature);
        votes.set(n.category, (votes.get(n.category) ?? 0) + (closeness * weights[n.source]) / neighbors.length);
    }
    if (centroids && centroidWeight > 0) {
        for (const [category, centroid] of centroids) {
            if (!allowed(category)) continue;
            votes.set(category, (votes.get(category) ?? 0) + centroidWeight * cosine(query, centroid));
        }
    }
    const [category] = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
    const score = neighbors.find(n => n.category === category)?.similarity ?? cosine(query, centroids!.get(category)!);

    return { category, score, neighbors };
}
