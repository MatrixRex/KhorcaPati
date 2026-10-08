import { db } from '@/db/schema';
import { useSettingsStore } from '@/stores/settingsStore';
import { useOfflineAIStore } from '@/stores/offlineAIStore';
import { loadBrowserEmbedder } from '@/lib/categoryEmbed/browserEmbedder';
import type { Embedder, ItemCategorizer, SeedVectorFile } from '@/lib/categoryEmbed/categorizer';
import type { ParsedGeminiTransaction } from '@/lib/geminiParser';
import { createUserCategorizer } from './userCategorizer';
import { loadUserCategoryContext } from './userContext';
import { parseNoteOffline } from './offlineParser';
import { loadUnitHints } from '@/services/itemUnitHints';

interface OfflineRuntime {
    embedder: Embedder;
    seedFile: SeedVectorFile;
    unload(): void;
}

/** Browser cache where Transformers.js keeps the model weights, tokenizer and ONNX runtime. */
export const OFFLINE_CACHE_NAMES = ['transformers-cache'];

let runtime: Promise<OfflineRuntime> | null = null;
/** prepared text → vector for the user's own history and corrections; lives for the session. */
const userVectorCache = new Map<string, ArrayLike<number>>();
let cachedCategorizer: { key: string; categorizer: ItemCategorizer } | null = null;

/**
 * Starts the on-device model once per session: downloads it on first use (then it is served from
 * the browser cache) and loads the built-in seed vectors.
 */
export function loadOfflineRuntime(): Promise<OfflineRuntime> {
    if (runtime) return runtime;
    useOfflineAIStore.setState({ status: 'loading', progress: 0, error: null });

    runtime = (async () => {
        const [{ default: seedFile }, loaded] = await Promise.all([
            import('@/lib/categoryEmbed/seedVectors.json'),
            loadBrowserEmbedder('wasm', progress => useOfflineAIStore.setState({ progress })),
        ]);
        useSettingsStore.getState().setOfflineModelDownloaded(true);
        useOfflineAIStore.setState({ status: 'ready', progress: 1 });
        return { embedder: loaded.embedder, seedFile: seedFile as SeedVectorFile, unload: loaded.unload };
    })();

    runtime.catch(err => {
        runtime = null;
        useOfflineAIStore.setState({ status: 'error', error: err instanceof Error ? err.message : String(err) });
    });
    return runtime;
}

/** One-time download from Settings or the Smart Note drawer. Asks the browser to keep the files. */
export async function downloadOfflineModel(): Promise<void> {
    await navigator.storage?.persist?.().catch(() => false);
    await loadOfflineRuntime();
}

export async function deleteOfflineModel(): Promise<void> {
    const current = runtime;
    runtime = null;
    userVectorCache.clear();
    cachedCategorizer = null;
    if (current) (await current.catch(() => null))?.unload();
    if (typeof caches !== 'undefined') await Promise.all(OFFLINE_CACHE_NAMES.map(name => caches.delete(name)));
    useSettingsStore.getState().setOfflineModelDownloaded(false);
    useOfflineAIStore.setState({ status: 'idle', progress: 0, error: null });
}

/** Offline counterpart of the online Smart Note parser, using the user's own categories and history. */
export async function parseSmartNoteOffline({ noteText, referenceDate }: { noteText: string; referenceDate: string }): Promise<ParsedGeminiTransaction[]> {
    const { embedder, seedFile } = await loadOfflineRuntime();
    const [context, categories, unitHints] = await Promise.all([loadUserCategoryContext(), db.categories.toArray(), loadUnitHints()]);

    // Building the categorizer (index over ~3,000 seed vectors) is the slow part of a parse. It is a pure
    // function of this context, so reuse it until categories, history or corrections change.
    const key = JSON.stringify(context);
    if (!cachedCategorizer || cachedCategorizer.key !== key) {
        cachedCategorizer = { key, categorizer: await createUserCategorizer(embedder, seedFile, context, userVectorCache) };
    }
    const { categorizer } = cachedCategorizer;
    const { categoryPreferences, deletedCategories } = useSettingsStore.getState();
    return parseNoteOffline({ noteText, referenceDate, categories, categoryPreferences, deletedCategories, unitHints }, categorizer);
}

/** Loads the model in the background after start-up so the first Smart Note is instant. */
export function warmUpOfflineRuntime(delayMs = 4000): void {
    const { aiMode, offlineModelDownloaded } = useSettingsStore.getState();
    if (aiMode !== 'offline' || !offlineModelDownloaded) return;
    setTimeout(() => { loadOfflineRuntime().catch(() => { /* status store shows the error */ }); }, delayMs);
}

export function resetOfflineRuntimeForTests(): void {
    runtime = null;
    userVectorCache.clear();
    cachedCategorizer = null;
}
