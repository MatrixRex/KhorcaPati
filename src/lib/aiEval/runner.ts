import { buildParseContext, postProcessAIResponse } from '@/lib/geminiParser';
import { buildPrompt, type PromptVariant } from './prompts';
import { scoreCase, summarize, type CaseResult, type EvalSummary } from './scoring';
import type { AIEngine, EvalCase, GenerationStats, PredictedTransaction } from './types';

/** Optional second stage that re-picks each transaction's category (e.g. the on-device embedding model). */
export interface CategoryOverride {
    label: string;
    /** One result per text; a null category keeps the LLM's choice. `types` limits income/expense categories. */
    categorize(texts: string[], types?: Array<'expense' | 'income'>): Promise<Array<{ category: string | null }>>;
}

export interface RunOptions {
    engine: AIEngine;
    cases: EvalCase[];
    categories: readonly string[];
    promptVariant: PromptVariant;
    constrainCategories: boolean;
    categorizer?: CategoryOverride;
    onCaseDone?: (result: CaseResult, index: number) => void;
    signal?: AbortSignal;
    now?: () => number;
}

export interface EvalReport {
    engineId: string;
    engineLabel: string;
    promptVariant: PromptVariant;
    constrainCategories: boolean;
    categorizerLabel?: string;
    startedAt: string;
    aborted: boolean;
    results: CaseResult[];
    summary: EvalSummary;
}

/** Runs each case through the engine sequentially (on-device engines can't run in parallel) and scores it. */
export async function runEval(options: RunOptions): Promise<EvalReport> {
    const { engine, cases, promptVariant, constrainCategories, categorizer, onCaseDone, signal, now = () => performance.now() } = options;
    const categories = options.categories.map(name => ({ name }));
    const startedAt = new Date().toISOString();
    const results: CaseResult[] = [];

    for (const [index, evalCase] of cases.entries()) {
        if (signal?.aborted) break;

        const ctx = buildParseContext({ categories, referenceDate: evalCase.referenceDate });
        const prompt = buildPrompt(ctx, evalCase.note, { variant: promptVariant, constrainCategories });

        let raw: string | undefined;
        let stats: GenerationStats | undefined;
        let predicted: PredictedTransaction[] = [];
        let error: string | undefined;
        const start = now();

        try {
            const reply = await engine.generate({ ...prompt, note: evalCase.note, referenceDate: evalCase.referenceDate, signal });
            raw = reply.text;
            stats = reply.stats;
            const parsed = postProcessAIResponse(reply.text, ctx);
            const override = categorizer ? await categorizer.categorize(parsed.map(tx => tx.title || tx.note), parsed.map(tx => tx.type)) : [];
            predicted = parsed.map((tx, i) => ({
                amount: tx.amount,
                type: tx.type,
                category: override[i]?.category ?? tx.category,
                date: tx.date,
                items: tx.items,
            }));
        } catch (err) {
            error = err instanceof Error ? err.message : String(err);
        }

        const result: CaseResult = {
            caseId: evalCase.id,
            tags: evalCase.tags,
            durationMs: now() - start,
            predicted,
            score: scoreCase(evalCase, predicted),
            ...(error !== undefined && { error }),
            ...(raw !== undefined && { raw }),
            ...(stats !== undefined && { stats }),
        };
        results.push(result);
        onCaseDone?.(result, index);
    }

    return {
        engineId: engine.id,
        engineLabel: engine.label,
        promptVariant,
        constrainCategories,
        ...(categorizer && { categorizerLabel: categorizer.label }),
        startedAt,
        aborted: results.length < cases.length,
        results,
        summary: summarize(results),
    };
}
