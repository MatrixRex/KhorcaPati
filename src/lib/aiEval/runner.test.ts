import { describe, it, expect, vi } from 'vitest';
import { runEval } from './runner';
import type { AIEngine, EvalCase } from './types';

const cases: EvalCase[] = [
    { id: 'a', tags: ['en'], note: 'uber 250', referenceDate: '2026-10-04', expected: [{ amount: 250, type: 'expense', category: 'Transport' }] },
    { id: 'b', tags: ['bangla'], note: 'বাজার ৫০০', referenceDate: '2026-10-04', expected: [{ amount: 500, type: 'expense', category: 'Groceries' }] },
];
const categories = ['Transport', 'Groceries', 'Unlisted'];

const reply = (amount: number, category: string) =>
    JSON.stringify({ transactions: [{ title: 'x', amount, type: 'expense', category, date: '2026-10-04', items: [] }] });

function fakeClock(step: number) {
    let t = 0;
    return () => (t += step);
}

describe('runEval', () => {
    it('runs every case through the engine and scores the post-processed output', async () => {
        const engine: AIEngine = {
            id: 'fake',
            label: 'Fake',
            generate: vi.fn(async ({ userMessage }) => ({
                text: userMessage.includes('uber') ? reply(250, 'transport') : reply(500, 'Transport'),
                stats: { decodeTokPerSec: 10 },
            })),
        };
        const onCaseDone = vi.fn();

        const report = await runEval({ engine, cases, categories, promptVariant: 'compact', constrainCategories: true, onCaseDone, now: fakeClock(50) });

        expect(engine.generate).toHaveBeenCalledTimes(2);
        // Non-LLM engines (offline rules) need the raw note rather than the prompt.
        expect(engine.generate).toHaveBeenCalledWith(expect.objectContaining({ note: 'uber 250', referenceDate: '2026-10-04' }));
        expect(onCaseDone).toHaveBeenCalledTimes(2);
        expect(report.results[0].score.perfect).toBe(true); // category normalized to "Transport"
        expect(report.results[1].score.categoryCorrect).toBe(0);
        expect(report.results[0].durationMs).toBe(50);
        expect(report.results[0].stats?.decodeTokPerSec).toBe(10);
        expect(report.summary.perfect).toBe(1);
        expect(report.summary.throughput.decodeTokPerSec).toBe(10);
        expect(report.engineId).toBe('fake');
        expect(report.aborted).toBe(false);
    });

    it('records engine and parse failures per case without stopping the run', async () => {
        const engine: AIEngine = {
            id: 'flaky',
            label: 'Flaky',
            generate: vi.fn()
                .mockRejectedValueOnce(new Error('GPU lost'))
                .mockResolvedValueOnce({ text: 'not json' }),
        };

        const report = await runEval({ engine, cases, categories, promptVariant: 'full', constrainCategories: false, now: fakeClock(10) });

        expect(report.results).toHaveLength(2);
        expect(report.results[0].error).toContain('GPU lost');
        expect(report.results[1].error).toMatch(/parse/i);
        expect(report.results[1].raw).toBe('not json');
        expect(report.summary.errors).toBe(2);
        expect(report.summary.amountRecall).toBe(0);
    });

    it('lets a categorizer replace the LLM category, keeping the LLM answer when it returns none', async () => {
        const engine: AIEngine = {
            id: 'fake',
            label: 'Fake',
            generate: vi.fn(async ({ userMessage }) => ({
                text: userMessage.includes('uber') ? reply(250, 'Groceries') : reply(500, 'Groceries'),
            })),
        };
        const categorizer = {
            label: 'Embedding',
            categorize: vi.fn(async (texts: string[]) => texts.map(() => ({ category: null as string | null }))),
        };
        categorizer.categorize.mockResolvedValueOnce([{ category: 'Transport' }]);

        const report = await runEval({ engine, cases, categories, promptVariant: 'compact', constrainCategories: true, categorizer, now: fakeClock(1) });

        expect(categorizer.categorize).toHaveBeenCalledWith(['X'], ['expense']);
        expect(report.results[0].predicted[0].category).toBe('Transport');
        expect(report.results[1].predicted[0].category).toBe('Groceries');
        expect(report.summary.perfect).toBe(2);
        expect(report.categorizerLabel).toBe('Embedding');
    });

    it('stops early when aborted', async () => {
        const controller = new AbortController();
        const engine: AIEngine = {
            id: 'fake',
            label: 'Fake',
            generate: vi.fn(async () => {
                controller.abort();
                return { text: reply(250, 'Transport') };
            }),
        };

        const report = await runEval({ engine, cases, categories, promptVariant: 'compact', constrainCategories: true, signal: controller.signal, now: fakeClock(1) });

        expect(engine.generate).toHaveBeenCalledTimes(1);
        expect(report.results).toHaveLength(1);
        expect(report.aborted).toBe(true);
    });
});
