import { db } from '@/db/schema';
import { useSettingsStore } from '@/stores/settingsStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { parseTransactionsWithGemini, type ParsedGeminiTransaction } from '@/lib/geminiParser';
import { parseSmartNoteOffline } from '@/lib/offlineAI/offlineEngine';

/** What the current AI mode still needs before a Smart Note can be parsed. */
export type SmartNoteAvailability = 'ready' | 'needs-model' | 'needs-key';

export function getSmartNoteAvailability(): SmartNoteAvailability {
    const { aiMode, offlineModelDownloaded, aiProviders, geminiApiKey } = useSettingsStore.getState();
    if (aiMode === 'offline') return offlineModelDownloaded ? 'ready' : 'needs-model';
    const hasKey = (aiProviders ?? []).some(p => p.enabled && p.apiKey?.trim()) || Boolean(geminiApiKey?.trim());
    return hasKey ? 'ready' : 'needs-key';
}

export interface SmartNoteRequest {
    noteText: string;
    referenceDate: string; // YYYY-MM-DD
}

/** Parses a Smart Note with the engine chosen in Settings (on-device or cloud providers). */
export async function parseSmartNote(request: SmartNoteRequest): Promise<ParsedGeminiTransaction[]> {
    if (useSettingsStore.getState().aiMode === 'offline') return parseSmartNoteOffline(request);
    return parseOnline(request);
}

async function parseOnline({ noteText, referenceDate }: SmartNoteRequest): Promise<ParsedGeminiTransaction[]> {
    const { geminiApiKey, geminiModel, aiProviders, categoryPreferences, deletedCategories } = useSettingsStore.getState();

    const dbCategories = await db.categories.toArray();
    const categories = dbCategories.length > 0 ? dbCategories : useCategoryStore.getState().categories;
    const deletedNames = new Set((deletedCategories || []).map(c => c.toLowerCase().trim()));
    const validNames = new Set(categories.map(c => c.name.toLowerCase().trim()));

    const recentExpenses = await db.expenses.orderBy('id').reverse().limit(100).toArray();
    const historyExamples = recentExpenses
        .filter(e => {
            if (!e.note || !e.category || e.category === 'Unlisted') return false;
            const name = e.category.toLowerCase().trim();
            return validNames.has(name) && !deletedNames.has(name);
        })
        .map(e => ({ item: e.note, category: e.category }));

    return parseTransactionsWithGemini({
        noteText,
        categories,
        categoryPreferences,
        deletedCategories,
        historyExamples,
        referenceDate,
        apiKey: geminiApiKey,
        model: geminiModel || 'gemini-flash-lite-latest',
        providers: aiProviders,
    });
}
