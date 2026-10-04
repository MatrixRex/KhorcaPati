import type { EvalCase, ExpectedItem, ExpectedTransaction, GenerationStats, PredictedTransaction } from './types';

export interface CaseScore {
    expectedCount: number;
    predictedCount: number;
    matchedCount: number;
    categoryCorrect: number;
    typeCorrect: number;
    dateCorrect: number;
    /** Matched transactions whose expectation lists items. */
    itemsChecked: number;
    itemsCorrect: number;
    perfect: boolean;
    mismatches: string[];
}

export interface CaseResult {
    caseId: string;
    tags: string[];
    durationMs: number;
    predicted: PredictedTransaction[];
    score: CaseScore;
    error?: string;
    raw?: string;
    stats?: GenerationStats;
}

export interface EvalSummary {
    cases: number;
    perfect: number;
    errors: number;
    amountPrecision: number;
    amountRecall: number;
    amountF1: number;
    /** null when nothing was matched, so there is nothing to grade. */
    categoryAccuracy: number | null;
    typeAccuracy: number | null;
    dateAccuracy: number | null;
    itemAccuracy: number | null;
    latency: { meanMs: number; p50Ms: number; p95Ms: number };
    throughput: { prefillTokPerSec: number | null; decodeTokPerSec: number | null };
    byTag: Record<string, { cases: number; perfect: number }>;
}

const sameAmount = (a: number, b: number) => Math.abs(a - b) < 0.011;
const norm = (s: string) => s.trim().toLowerCase();

const acceptedCategories = (exp: ExpectedTransaction) =>
    (Array.isArray(exp.category) ? exp.category : [exp.category]).map(norm);

function itemNameMatches(expected: ExpectedItem['name'], actual: string): boolean {
    const a = norm(actual);
    const names = (Array.isArray(expected) ? expected : [expected]).map(norm);
    return names.some(n => a === n || a.includes(n) || n.includes(a));
}

function itemsMatch(expected: ExpectedItem[], actual: PredictedTransaction['items']): boolean {
    if (expected.length !== actual.length) return false;
    const used = new Set<number>();
    return expected.every(exp => {
        const idx = actual.findIndex((act, i) =>
            !used.has(i) &&
            itemNameMatches(exp.name, act.name) &&
            sameAmount(exp.qty, act.qty) &&
            norm(exp.unit) === norm(act.unit)
        );
        if (idx === -1) return false;
        used.add(idx);
        return true;
    });
}

const describeTx = (t: { amount: number; category: string | string[] }) =>
    `${t.amount} (${Array.isArray(t.category) ? t.category.join('|') : t.category})`;

/** Pairs expected and predicted transactions by amount, then grades each matched pair field by field. */
export function scoreCase(evalCase: EvalCase, predicted: PredictedTransaction[]): CaseScore {
    const { expected, referenceDate } = evalCase;
    const pairs: Array<[ExpectedTransaction, PredictedTransaction]> = [];
    const usedPred = new Set<number>();
    const unmatchedExp: ExpectedTransaction[] = [];

    // Two passes: amount + category first, so same-amount transactions pair up sensibly; then amount only.
    const pending = [...expected];
    for (const strictCategory of [true, false]) {
        for (let e = pending.length - 1; e >= 0; e--) {
            const exp = pending[e];
            const idx = predicted.findIndex((p, i) =>
                !usedPred.has(i) &&
                sameAmount(p.amount, exp.amount) &&
                (!strictCategory || acceptedCategories(exp).includes(norm(p.category)))
            );
            if (idx !== -1) {
                usedPred.add(idx);
                pairs.push([exp, predicted[idx]]);
                pending.splice(e, 1);
            }
        }
    }
    unmatchedExp.push(...pending);

    const mismatches: string[] = [];
    let categoryCorrect = 0, typeCorrect = 0, dateCorrect = 0, itemsChecked = 0, itemsCorrect = 0;

    for (const [exp, act] of pairs) {
        if (acceptedCategories(exp).includes(norm(act.category))) categoryCorrect++;
        else mismatches.push(`category for ${exp.amount}: expected ${describeTx(exp)}, got "${act.category}"`);

        if (exp.type === act.type) typeCorrect++;
        else mismatches.push(`type for ${exp.amount}: expected ${exp.type}, got ${act.type}`);

        const expDate = exp.date ?? referenceDate;
        if (expDate === act.date) dateCorrect++;
        else mismatches.push(`date for ${exp.amount}: expected ${expDate}, got ${act.date}`);

        if (exp.items) {
            itemsChecked++;
            if (itemsMatch(exp.items, act.items)) itemsCorrect++;
            else mismatches.push(`items for ${exp.amount}: got ${JSON.stringify(act.items)}`);
        }
    }

    for (const exp of unmatchedExp) mismatches.push(`missing ${describeTx(exp)}`);
    predicted.forEach((p, i) => {
        if (!usedPred.has(i)) mismatches.push(`extra ${describeTx(p)}`);
    });

    return {
        expectedCount: expected.length,
        predictedCount: predicted.length,
        matchedCount: pairs.length,
        categoryCorrect,
        typeCorrect,
        dateCorrect,
        itemsChecked,
        itemsCorrect,
        perfect: mismatches.length === 0,
        mismatches,
    };
}

/** Nearest-rank percentile. */
export function percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
    return sorted[rank - 1];
}

const ratio = (num: number, den: number) => (den === 0 ? null : num / den);

function mean(values: Array<number | undefined>): number | null {
    const present = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    return present.length === 0 ? null : present.reduce((a, b) => a + b, 0) / present.length;
}

export function summarize(results: CaseResult[]): EvalSummary {
    let expected = 0, predicted = 0, matched = 0;
    let category = 0, type = 0, date = 0, itemsChecked = 0, itemsCorrect = 0;
    const byTag: EvalSummary['byTag'] = {};

    for (const r of results) {
        const s = r.score;
        expected += s.expectedCount;
        predicted += s.predictedCount;
        matched += s.matchedCount;
        category += s.categoryCorrect;
        type += s.typeCorrect;
        date += s.dateCorrect;
        itemsChecked += s.itemsChecked;
        itemsCorrect += s.itemsCorrect;
        for (const tag of r.tags) {
            byTag[tag] ??= { cases: 0, perfect: 0 };
            byTag[tag].cases++;
            if (s.perfect) byTag[tag].perfect++;
        }
    }

    const precision = predicted === 0 ? 0 : matched / predicted;
    const recall = expected === 0 ? 0 : matched / expected;
    const durations = results.map(r => r.durationMs);

    return {
        cases: results.length,
        perfect: results.filter(r => r.score.perfect).length,
        errors: results.filter(r => r.error).length,
        amountPrecision: precision,
        amountRecall: recall,
        amountF1: precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall),
        categoryAccuracy: ratio(category, matched),
        typeAccuracy: ratio(type, matched),
        dateAccuracy: ratio(date, matched),
        itemAccuracy: ratio(itemsCorrect, itemsChecked),
        latency: {
            meanMs: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
            p50Ms: percentile(durations, 50),
            p95Ms: percentile(durations, 95),
        },
        throughput: {
            prefillTokPerSec: mean(results.map(r => r.stats?.prefillTokPerSec)),
            decodeTokPerSec: mean(results.map(r => r.stats?.decodeTokPerSec)),
        },
        byTag,
    };
}
