import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/db/schema';
import { useSettingsStore } from '@/stores/settingsStore';
import { useOfflineAIStore } from '@/stores/offlineAIStore';
import { createMockCategory, createMockExpense } from '@/test/factories';

const unload = vi.fn();
const loadBrowserEmbedder = vi.fn();
vi.mock('@/lib/categoryEmbed/browserEmbedder', () => ({ loadBrowserEmbedder: (...args: unknown[]) => loadBrowserEmbedder(...args) }));
vi.mock('./userCategorizer', async importOriginal => {
    const actual = await importOriginal<typeof import('./userCategorizer')>();
    return { ...actual, createUserCategorizer: vi.fn(actual.createUserCategorizer) };
});
const { createUserCategorizer } = await import('./userCategorizer');

/** Deterministic 384-dim fake vectors so the real seed index can be built. */
const fakeVector = (text: string) => Array.from({ length: 384 }, (_, i) => Math.sin((text.length + 1) * (i + 1)));

const { deleteOfflineModel, downloadOfflineModel, parseSmartNoteOffline, resetOfflineRuntimeForTests } = await import('./offlineEngine');

describe('offlineEngine', () => {
    beforeEach(() => {
        resetOfflineRuntimeForTests();
        unload.mockReset();
        loadBrowserEmbedder.mockReset();
        loadBrowserEmbedder.mockImplementation(async (_device: string, onProgress: (p: number) => void) => {
            onProgress(0.5);
            return { device: 'wasm', unload, embedder: { embed: async (texts: string[]) => texts.map(fakeVector) } };
        });
        useSettingsStore.setState({ offlineModelDownloaded: false, categoryPreferences: {}, deletedCategories: [] });
        useOfflineAIStore.setState({ status: 'idle', progress: 0, error: null });
        vi.mocked(createUserCategorizer).mockClear();
    });

    it('reuses the categorizer while categories, history and corrections are unchanged', async () => {
        await db.categories.bulkAdd([createMockCategory({ name: 'Unlisted' })]);
        const note = { noteText: 'uber 250\nbazar 1200', referenceDate: '2026-10-04' };

        const first = await parseSmartNoteOffline(note);
        const second = await parseSmartNoteOffline(note);
        expect(createUserCategorizer).toHaveBeenCalledTimes(1);
        // ids are random per parse; everything else must be identical.
        const strip = (txs: typeof first) => txs.map(tx => ({ ...tx, id: '' }));
        expect(strip(second)).toEqual(strip(first));

        await db.expenses.add(createMockExpense({ note: 'uber office', category: 'Office' }));
        await parseSmartNoteOffline(note);
        expect(createUserCategorizer).toHaveBeenCalledTimes(2);

        useSettingsStore.setState({ categoryPreferences: { bazar: 'Office' } });
        await parseSmartNoteOffline(note);
        expect(createUserCategorizer).toHaveBeenCalledTimes(3);
    });

    it('downloads the model once, reporting progress, and remembers it', async () => {
        const seen: number[] = [];
        const stop = useOfflineAIStore.subscribe(s => seen.push(s.progress));
        await downloadOfflineModel();
        await downloadOfflineModel();
        stop();

        expect(loadBrowserEmbedder).toHaveBeenCalledTimes(1);
        expect(loadBrowserEmbedder).toHaveBeenCalledWith('wasm', expect.any(Function));
        expect(seen).toContain(0.5);
        expect(useOfflineAIStore.getState().status).toBe('ready');
        expect(useSettingsStore.getState().offlineModelDownloaded).toBe(true);
    });

    it('reports a failed download and lets the user retry', async () => {
        loadBrowserEmbedder.mockRejectedValueOnce(new Error('network down'));
        await expect(downloadOfflineModel()).rejects.toThrow('network down');
        expect(useOfflineAIStore.getState()).toMatchObject({ status: 'error', error: 'network down' });
        expect(useSettingsStore.getState().offlineModelDownloaded).toBe(false);

        await downloadOfflineModel();
        expect(useOfflineAIStore.getState().status).toBe('ready');
    });

    it('parses a note against the user’s categories', async () => {
        await db.categories.bulkAdd([createMockCategory({ name: 'Unlisted' })]);
        const txs = await parseSmartNoteOffline({ noteText: 'uber 250\nbeton pelam 30000', referenceDate: '2026-10-04' });
        expect(txs.map(t => [t.amount, t.type, t.date])).toEqual([[250, 'expense', '2026-10-04'], [30000, 'income', '2026-10-04']]);
        expect(txs.every(t => typeof t.category === 'string' && t.category.length > 0)).toBe(true);
    });

    it('deletes the model: unloads it, clears the caches and the downloaded flag', async () => {
        const deleted: string[] = [];
        vi.stubGlobal('caches', { delete: async (name: string) => { deleted.push(name); return true; } });
        await downloadOfflineModel();
        await deleteOfflineModel();

        expect(unload).toHaveBeenCalled();
        expect(deleted).toEqual(['transformers-cache']);
        expect(useSettingsStore.getState().offlineModelDownloaded).toBe(false);
        expect(useOfflineAIStore.getState().status).toBe('idle');
        vi.unstubAllGlobals();
    });
});
