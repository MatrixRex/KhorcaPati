/**
 * Exploration: compares category methods and embedding models on the held-out items.
 * Run: `node scripts/compare-category-methods.ts [modelId ...]` (models download on first use).
 * Winning methods get moved into src/lib/categoryEmbed with tests; this script stays a benchmark.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pipeline, env } from '@huggingface/transformers';
import { HELDOUT_ITEMS } from '../src/lib/categoryEmbed/heldout.ts';
import { classifyVector, cosine, type LabelledVector } from '../src/lib/categoryEmbed/classifier.ts';
import { flattenSeeds, isNovelItem, prepareItemText, seedTokenSet, type SeedFile } from '../src/lib/categoryEmbed/seedData.ts';

env.cacheDir = fileURLToPath(new URL('../.cache/transformers/', import.meta.url));

const seeds = flattenSeeds(JSON.parse(readFileSync(new URL('../src/lib/categoryEmbed/seeds.json', import.meta.url), 'utf8')) as SeedFile);
const categories = [...new Set(seeds.map(s => s.category))];
const seedTokens = seedTokenSet(seeds);
const novel = HELDOUT_ITEMS.map(item => isNovelItem(item.text, seedTokens));
const models = process.argv.slice(2).length ? process.argv.slice(2) : ['Xenova/multilingual-e5-small', 'Xenova/multilingual-e5-base'];

type Predictor = (i: number) => string | null;
const results: Array<{ name: string; acc: number; en: number; banglish: number; bangla: number; novel: number; variant: number; ms?: number }> = [];

function score(name: string, predict: Predictor, ms?: number) {
    const ok = (filter: (lang: string, i: number) => boolean) => {
        const idx = HELDOUT_ITEMS.map((it, i) => ({ it, i })).filter(x => filter(x.it.lang, x.i));
        return idx.filter(x => predict(x.i) === x.it.category).length / idx.length;
    };
    results.push({ name, acc: ok(() => true), en: ok(l => l === 'en'), banglish: ok(l => l === 'banglish'), bangla: ok(l => l === 'bangla'), novel: ok((_, i) => novel[i]), variant: ok((_, i) => !novel[i]), ms });
}

// ── Character n-gram TF-IDF (no model) ────────────────────────────────────
function ngrams(text: string): Map<string, number> {
    const t = ` ${text.toLowerCase().trim().replace(/\s+/g, ' ')} `;
    const grams = new Map<string, number>();
    for (const n of [2, 3, 4]) for (let i = 0; i + n <= t.length; i++) {
        const g = t.slice(i, i + n);
        grams.set(g, (grams.get(g) ?? 0) + 1);
    }
    return grams;
}
const seedGrams = seeds.map(s => ngrams(s.text));
const df = new Map<string, number>();
for (const g of seedGrams) for (const k of g.keys()) df.set(k, (df.get(k) ?? 0) + 1);
const idf = (k: string) => Math.log((seeds.length + 1) / ((df.get(k) ?? 0) + 1)) + 1;
function tfidf(g: Map<string, number>) {
    const v = new Map<string, number>();
    let norm = 0;
    for (const [k, c] of g) { const w = c * idf(k); v.set(k, w); norm += w * w; }
    norm = Math.sqrt(norm) || 1;
    for (const [k, w] of v) v.set(k, w / norm);
    return v;
}
const seedTfidf = seedGrams.map(tfidf);
const sparseCos = (a: Map<string, number>, b: Map<string, number>) => {
    let dot = 0;
    for (const [k, w] of a) dot += w * (b.get(k) ?? 0);
    return dot;
};
const charTop = HELDOUT_ITEMS.map(item => {
    const q = tfidf(ngrams(item.text));
    let best = { sim: -1, category: '' };
    seedTfidf.forEach((v, i) => { const s = sparseCos(q, v); if (s > best.sim) best = { sim: s, category: seeds[i].category }; });
    return best;
});
score('char n-gram (no model)', i => charTop[i].category);

// ── Logistic regression on seed vectors ───────────────────────────────────
function trainSoftmax(xs: number[][], ys: number[], classes: number, epochs = 400, lr = 2, l2 = 1e-3) {
    const d = xs[0].length;
    const W = Array.from({ length: classes }, () => new Float64Array(d));
    const b = new Float64Array(classes);
    for (let e = 0; e < epochs; e++) {
        const gW = Array.from({ length: classes }, () => new Float64Array(d));
        const gb = new Float64Array(classes);
        xs.forEach((x, n) => {
            const logits = W.map((w, c) => b[c] + x.reduce((s, xi, j) => s + xi * w[j], 0));
            const max = Math.max(...logits);
            const exps = logits.map(l => Math.exp(l - max));
            const sum = exps.reduce((a, c) => a + c, 0);
            exps.forEach((p, c) => {
                const g = p / sum - (c === ys[n] ? 1 : 0);
                gb[c] += g;
                for (let j = 0; j < d; j++) gW[c][j] += g * x[j];
            });
        });
        for (let c = 0; c < classes; c++) {
            b[c] -= (lr * gb[c]) / xs.length;
            for (let j = 0; j < d; j++) W[c][j] -= lr * (gW[c][j] / xs.length + l2 * W[c][j]);
        }
    }
    return (x: number[]) => {
        const logits = W.map((w, c) => b[c] + x.reduce((s, xi, j) => s + xi * w[j], 0));
        return logits.indexOf(Math.max(...logits));
    };
}

for (const model of models) {
    const short = model.split('/').pop()!;
    console.log(`Loading ${model}…`);
    const extractor = await pipeline('feature-extraction', model, { dtype: 'q8' });
    const embed = async (texts: string[], prefix: string) =>
        (await extractor(texts.map(t => prefix + prepareItemText(t)), { pooling: 'mean', normalize: true })).tolist() as number[][];

    const t0 = performance.now();
    const queries = await embed(HELDOUT_ITEMS.map(i => i.text), 'query: ');
    const msPerItem = (performance.now() - t0) / HELDOUT_ITEMS.length;
    const seedQ = await embed(seeds.map(s => s.text), 'query: ');
    const seedP = await embed(seeds.map(s => s.text), 'passage: ');

    const asExamples = (vecs: number[][]): LabelledVector[] => seeds.map((s, i) => ({ ...s, source: 'seed', vector: vecs[i] }));
    const exQ = asExamples(seedQ);
    const knn = HELDOUT_ITEMS.map((_, i) => classifyVector(queries[i], exQ));

    score(`${short} · kNN`, i => knn[i].category, msPerItem);
    score(`${short} · kNN, seeds as passages`, i => classifyVector(queries[i], asExamples(seedP)).category);

    const centroids = categories.map(c => {
        const vs = seedQ.filter((_, i) => seeds[i].category === c);
        return vs[0].map((_, j) => vs.reduce((s, v) => s + v[j], 0) / vs.length);
    });
    score(`${short} · centroid`, i => {
        const sims = centroids.map(c => cosine(queries[i], c));
        return categories[sims.indexOf(Math.max(...sims))];
    });

    const predict = trainSoftmax(seedQ, seeds.map(s => categories.indexOf(s.category)), categories.length);
    const lr = HELDOUT_ITEMS.map((_, i) => categories[predict(queries[i])]);
    score(`${short} · logistic regression`, i => lr[i]);

    // Centering: e5 vectors share a large common component (all sims ~0.8-0.9); removing it spreads them out.
    const mean = seedQ[0].map((_, j) => seedQ.reduce((acc, v) => acc + v[j], 0) / seedQ.length);
    const center = (v: number[]) => { const c = v.map((x, j) => x - mean[j]); const n = Math.hypot(...c) || 1; return c.map(x => x / n); };
    const seedC = seedQ.map(center);
    const queryC = queries.map(center);
    const exC = asExamples(seedC);
    const knnC = HELDOUT_ITEMS.map((_, i) => classifyVector(queryC[i], exC, { temperature: 0.05 }));
    score(`${short} · kNN, centered`, i => knnC[i].category);
    const centroidsC = categories.map(c => {
        const vs = seedC.filter((_, i) => seeds[i].category === c);
        return vs[0].map((_, j) => vs.reduce((acc, v) => acc + v[j], 0) / vs.length);
    });
    const centroidSimsC = queryC.map(q => centroidsC.map(c => cosine(q, c)));
    score(`${short} · centroid, centered`, i => categories[centroidSimsC[i].indexOf(Math.max(...centroidSimsC[i]))]);
    const predictC = trainSoftmax(seedC, seeds.map(s => categories.indexOf(s.category)), categories.length);
    score(`${short} · logistic regression, centered`, i => categories[predictC(queryC[i])]);
    for (const w of [0.5, 1, 2]) {
        score(`${short} · centered kNN + ${w}×centroid`, i => {
            const best = knnC[i].neighbors[0].similarity;
            const total = categories.map((c, ci) => w * centroidSimsC[i][ci]
                + knnC[i].neighbors.filter(n => n.category === c).reduce((acc, n) => acc + Math.exp((n.similarity - best) / 0.05), 0) / 5);
            return categories[total.indexOf(Math.max(...total))];
        });
    }

    for (const threshold of [0.5, 0.6, 0.7]) {
        score(`${short} · hybrid char≥${threshold} else kNN`, i => (charTop[i].sim >= threshold ? charTop[i].category : knn[i].category));
        score(`${short} · hybrid char≥${threshold} else logreg`, i => (charTop[i].sim >= threshold ? charTop[i].category : lr[i]));
    }
}

const p = (x: number) => `${Math.round(x * 100)}%`.padStart(5);
console.log(`\n${HELDOUT_ITEMS.length} items: ${novel.filter(Boolean).length} novel, ${novel.filter(n => !n).length} variants`);
console.log(`${'method'.padEnd(44)}  all    en  bngl  bang  novel  var   ms/item`);
for (const r of results) {
    console.log(`${r.name.padEnd(44)} ${p(r.acc)} ${p(r.en)} ${p(r.banglish)} ${p(r.bangla)} ${p(r.novel)} ${p(r.variant)}   ${r.ms ? r.ms.toFixed(1) : ''}`);
}
