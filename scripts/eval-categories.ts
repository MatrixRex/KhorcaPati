/**
 * Measures embedding category accuracy on held-out items (not in the seed list) through the same
 * createCategorizer() path the app uses. Run: `pnpm seeds:eval`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pipeline, env } from '@huggingface/transformers';
import { HELDOUT_ITEMS } from '../src/lib/categoryEmbed/heldout.ts';
import {
    createCategorizer, evaluateCategorizer, examplesFromSeedFile, DEFAULT_INCOME_CATEGORIES,
    type CategoryEvalReport, type SeedVectorFile,
} from '../src/lib/categoryEmbed/categorizer.ts';
import { EMBED_DTYPE, EMBED_MODEL_ID } from '../src/lib/categoryEmbed/model.ts';

env.cacheDir = fileURLToPath(new URL('../.cache/transformers/', import.meta.url));

const file: SeedVectorFile = JSON.parse(readFileSync(new URL('../src/lib/categoryEmbed/seedVectors.json', import.meta.url), 'utf8'));
const extractor = await pipeline('feature-extraction', EMBED_MODEL_ID, { dtype: EMBED_DTYPE });
const embedder = {
    embed: async (texts: string[]) => (await extractor(texts, { pooling: 'mean', normalize: true })).tolist() as number[][],
};
const categorizer = createCategorizer(embedder, examplesFromSeedFile(file));
const income = new Set(DEFAULT_INCOME_CATEGORIES);

const pct = (t: { total: number; correct: number }) => `${Math.round((t.correct / Math.max(1, t.total)) * 100)}%`.padStart(4);
const line = (name: string, r: CategoryEvalReport) =>
    console.log(`${name.padEnd(30)} all ${pct(r)} | en ${pct(r.byLang.en)} banglish ${pct(r.byLang.banglish)} bangla ${pct(r.byLang.bangla)} | novel ${pct(r.novel)} variant ${pct(r.variant)} | ${r.msPerItem.toFixed(1)} ms/item`);

// Batch size 1 matches the app (one note at a time); batching pads inputs and shifts results slightly.
const withoutType = await evaluateCategorizer(categorizer, HELDOUT_ITEMS, file.entries, { batchSize: 1 });
const withType = await evaluateCategorizer(categorizer, HELDOUT_ITEMS, file.entries, {
    batchSize: 1,
    typeOf: item => (income.has(item.category) ? 'income' : 'expense'),
});

console.log(`\nHeld-out items: ${HELDOUT_ITEMS.length} (${withType.novel.total} novel, ${withType.variant.total} variants), seeds: ${file.entries.length}\n`);
line('type unknown', withoutType);
line('type known (as in the app)', withType);

console.log('\nMistakes with type known:');
for (const m of withType.mistakes) {
    console.log(`  ${m.text.padEnd(28)} expected ${m.expected.padEnd(18)} got ${String(m.got).padEnd(18)} near: ${m.nearest.join(', ')}`);
}
