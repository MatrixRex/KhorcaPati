// Explicit .ts extensions: also imported by Node scripts (scripts/eval-categories.ts).
import { buildCategoryIndex, categorize, type CategoryIndex } from './categoryIndex.ts';
import { SOURCE_PRIORITY, type ClassifyOptions, type ClassifyResult, type LabelledVector } from './classifier.ts';
import { unpackVectors, type PackedVectors } from './vectorPack.ts';
import { isNovelItem, prepareItemText, seedTokenSet, type SeedEntry } from './seedData.ts';
import { EMBED_PREFIX } from './model.ts';

/** Turns texts into normalized embedding vectors (browser worker, Node pipeline, or a test fake). */
export interface Embedder {
    embed(texts: string[]): Promise<ArrayLike<number>[]>;
}

/** Shape of seedVectors.json produced by scripts/build-seed-vectors.ts. */
export interface SeedVectorFile {
    model: string;
    entries: SeedEntry[];
    vectors: PackedVectors;
}

export type TransactionType = 'expense' | 'income';

export interface ItemCategorizer {
    index: CategoryIndex;
    /** `types[i]` limits item i to income or expense categories; omit when unknown. */
    categorize(texts: string[], types?: Array<TransactionType | undefined>): Promise<ClassifyResult[]>;
}

export interface CategorizerOptions extends ClassifyOptions {
    /** Categories that mean money received; everything else is an expense category. */
    incomeCategories?: string[];
}

export const DEFAULT_INCOME_CATEGORIES = ['Salary'];

export function examplesFromSeedFile(file: SeedVectorFile): LabelledVector[] {
    const vectors = unpackVectors(file.vectors);
    return file.entries.map((e, i) => ({ ...e, source: 'seed', vector: vectors[i] }));
}

export function createCategorizer(embedder: Embedder, examples: LabelledVector[], options: CategorizerOptions = {}): ItemCategorizer {
    const { incomeCategories = DEFAULT_INCOME_CATEGORIES, ...classifyOptions } = options;
    const index = buildCategoryIndex(examples);

    const income = new Set(incomeCategories);
    const expense = new Set([...index.centroids.keys()].filter(c => !income.has(c)));
    const allowedFor = (type?: TransactionType) => (type === 'income' ? income : type === 'expense' ? expense : undefined);

    // Same prepared text = same item. Looked up by text because vector similarity of identical
    // texts drops slightly below 1 after int8 storage and centering.
    const byText = new Map<string, LabelledVector[]>();
    for (const e of [...examples].sort((a, b) => SOURCE_PRIORITY.indexOf(a.source) - SOURCE_PRIORITY.indexOf(b.source))) {
        const key = prepareItemText(e.text);
        byText.set(key, [...(byText.get(key) ?? []), e]);
    }

    return {
        index,
        async categorize(texts, types = []) {
            if (texts.length === 0) return [];
            const prepared = texts.map(prepareItemText);
            const vectors = await embedder.embed(prepared.map(t => EMBED_PREFIX + t));
            return vectors.map((v, i) => {
                const allowedCategories = allowedFor(types[i]);
                const twin = byText.get(prepared[i])?.find(e => !allowedCategories || allowedCategories.has(e.category));
                if (twin) {
                    return { category: twin.category, score: 1, neighbors: [{ text: twin.text, category: twin.category, source: twin.source, similarity: 1 }] };
                }
                return categorize(index, v, { ...classifyOptions, allowedCategories });
            });
        },
    };
}

export interface CategoryEvalItem {
    text: string;
    category: string;
    lang: string;
}

interface Tally { total: number; correct: number }

export interface CategoryEvalReport {
    total: number;
    correct: number;
    byLang: Record<string, Tally>;
    /** Items with no word in common with any seed: measures real generalization. */
    novel: Tally;
    variant: Tally;
    msPerItem: number;
    mistakes: Array<{ text: string; expected: string; got: string | null; nearest: string[] }>;
}

/** Runs labelled items through a categorizer in batches and tallies accuracy and speed. */
export async function evaluateCategorizer(
    categorizer: Pick<ItemCategorizer, 'categorize'>,
    items: CategoryEvalItem[],
    seedEntries: SeedEntry[],
    { batchSize = 16, now = () => performance.now(), typeOf }: {
        batchSize?: number;
        now?: () => number;
        /** The transaction type the app would know for this item (from the AI or the form). */
        typeOf?: (item: CategoryEvalItem) => TransactionType;
    } = {},
): Promise<CategoryEvalReport> {
    const seedTokens = seedTokenSet(seedEntries);
    const report: CategoryEvalReport = {
        total: 0, correct: 0, byLang: {}, novel: { total: 0, correct: 0 }, variant: { total: 0, correct: 0 }, msPerItem: 0, mistakes: [],
    };
    let elapsed = 0;

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const start = now();
        const results = await categorizer.categorize(batch.map(item => item.text), typeOf ? batch.map(typeOf) : undefined);
        elapsed += now() - start;

        batch.forEach((item, j) => {
            const ok = results[j].category === item.category;
            const group = isNovelItem(item.text, seedTokens) ? report.novel : report.variant;
            const lang = (report.byLang[item.lang] ??= { total: 0, correct: 0 });
            for (const tally of [report, group, lang]) {
                tally.total++;
                if (ok) tally.correct++;
            }
            if (!ok) {
                report.mistakes.push({
                    text: item.text,
                    expected: item.category,
                    got: results[j].category,
                    nearest: results[j].neighbors.slice(0, 3).map(n => n.text),
                });
            }
        });
    }

    report.msPerItem = items.length ? elapsed / items.length : 0;
    return report;
}
