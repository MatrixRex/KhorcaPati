/**
 * Scores the offline pipeline (rules + on-device categories) on the 36 labelled notes, the same
 * dataset and scoring the AI Lab uses for LLMs. Run: `pnpm offline:eval` (uses the cached e5 model).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { it } from 'vitest';
import { pipeline, env } from '@huggingface/transformers';
import { EVAL_CASES, EVAL_CATEGORIES } from '@/lib/aiEval/dataset';
import { HOLDOUT_EVAL_CASES } from '@/lib/aiEval/holdoutDataset';
import type { EvalCase } from '@/lib/aiEval/types';
import { scoreCase, summarize, type CaseResult } from '@/lib/aiEval/scoring';
import { createUserCategorizer } from '@/lib/offlineAI/userCategorizer';
import { parseNoteOffline } from '@/lib/offlineAI/offlineParser';
import { EMBED_DTYPE, EMBED_MODEL_ID } from '@/lib/categoryEmbed/model';
import type { SeedVectorFile } from '@/lib/categoryEmbed/categorizer';

it('offline pipeline on the labelled note datasets', async () => {
    env.cacheDir = fileURLToPath(new URL('../.cache/transformers/', import.meta.url));
    const seedFile: SeedVectorFile = JSON.parse(readFileSync(new URL('../src/lib/categoryEmbed/seedVectors.json', import.meta.url), 'utf8'));
    const extractor = await pipeline('feature-extraction', EMBED_MODEL_ID, { dtype: EMBED_DTYPE });
    const embedder = { embed: async (texts: string[]) => (await extractor(texts, { pooling: 'mean', normalize: true })).tolist() as number[][] };
    const categorizer = await createUserCategorizer(embedder, seedFile, {
        userCategories: [...EVAL_CATEGORIES], deletedCategories: [], history: [], preferences: {},
    }, new Map());

    async function evaluate(name: string, cases: EvalCase[]) {
    const results: CaseResult[] = [];
    for (const c of cases) {
        const start = performance.now();
        const txs = await parseNoteOffline({ noteText: c.note, referenceDate: c.referenceDate, categories: EVAL_CATEGORIES.map(name => ({ name })) }, categorizer);
        const predicted = txs.map(t => ({ amount: t.amount, type: t.type, category: t.category, date: t.date, items: t.items }));
        results.push({ caseId: c.id, tags: c.tags, durationMs: performance.now() - start, predicted, score: scoreCase(c, predicted) });
    }

    const s = summarize(results);
    const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);
    console.log(`\nOffline (rules + embedding) on ${s.cases} notes`);
    console.log(`perfect ${s.perfect}/${s.cases} | amount F1 ${pct(s.amountF1)} (P ${pct(s.amountPrecision)} R ${pct(s.amountRecall)}) | category ${pct(s.categoryAccuracy)} | type ${pct(s.typeAccuracy)} | date ${pct(s.dateAccuracy)} | items ${pct(s.itemAccuracy)} | ${s.latency.meanMs.toFixed(1)} ms/note`);
    console.log(`by language: ${['en', 'banglish', 'bangla', 'mixed'].filter(t => s.byTag[t]).map(t => `${t} ${s.byTag[t].perfect}/${s.byTag[t].cases}`).join(', ')}`);
    console.log('\nImperfect notes:');
    for (const r of results.filter(r => !r.score.perfect)) console.log(`  ${r.caseId}: ${r.score.mismatches.join('; ')}`);
    }

    await evaluate('Development set (rules written against these)', EVAL_CASES);
    await evaluate('Holdout set (fresh notes)', HOLDOUT_EVAL_CASES);
});
