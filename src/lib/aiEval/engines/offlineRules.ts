import { EVAL_CATEGORIES } from '../dataset';
import type { AIEngine } from '../types';
import type { LoadProgress, LoadedEngine } from './index';
import { loadOfflineRuntime } from '@/lib/offlineAI/offlineEngine';
import { useOfflineAIStore } from '@/stores/offlineAIStore';
import { createUserCategorizer } from '@/lib/offlineAI/userCategorizer';
import { extractTransactionsWithRules } from '@/lib/offlineAI/ruleParser';

/**
 * The app's Offline mode as a lab engine: rules extract, the on-device model picks categories, and the
 * runner applies the same post-processing as production. Categories are the standard eval list (no user history).
 */
export async function loadOfflineRulesEngine(onProgress: (p: LoadProgress) => void): Promise<LoadedEngine> {
    const stop = useOfflineAIStore.subscribe(s => onProgress({ progress: s.progress, text: 'Loading on-device model' }));
    try {
        const { embedder, seedFile } = await loadOfflineRuntime();
        const categorizer = await createUserCategorizer(embedder, seedFile, {
            userCategories: [...EVAL_CATEGORIES], deletedCategories: [], history: [], preferences: {},
        }, new Map());

        const engine: AIEngine = {
            id: 'offline-rules',
            label: 'Offline mode (rules + embedding)',
            async generate({ note, referenceDate }) {
                const found = extractTransactionsWithRules(note, referenceDate);
                const picked = await categorizer.categorize(found.map(t => t.title), found.map(t => t.type));
                const transactions = found.map((t, i) => ({ ...t, category: picked[i]?.category ?? 'Unlisted', items: t.items ?? [] }));
                return { text: JSON.stringify({ transactions }) };
            },
        };
        // The runtime is shared with the app, so unloading here would break Smart Notes in this session.
        return { engine, unload: async () => {} };
    } finally {
        stop();
    }
}
