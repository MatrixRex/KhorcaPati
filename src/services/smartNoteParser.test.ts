import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/db/schema';
import { useSettingsStore } from '@/stores/settingsStore';
import { createMockCategory, createMockExpense } from '@/test/factories';

const parseSmartNoteOffline = vi.fn();
const parseTransactionsWithGemini = vi.fn();
vi.mock('@/lib/offlineAI/offlineEngine', () => ({ parseSmartNoteOffline: (...a: unknown[]) => parseSmartNoteOffline(...a) }));
vi.mock('@/lib/geminiParser', async importOriginal => ({
    ...(await importOriginal<typeof import('@/lib/geminiParser')>()),
    parseTransactionsWithGemini: (...a: unknown[]) => parseTransactionsWithGemini(...a),
}));

const { getSmartNoteAvailability, parseSmartNote } = await import('./smartNoteParser');

const groq = { id: 'p1', name: 'Groq', type: 'groq' as const, apiKey: 'gsk', model: 'm', enabled: true };

describe('smartNoteParser', () => {
    beforeEach(() => {
        parseSmartNoteOffline.mockReset().mockResolvedValue([]);
        parseTransactionsWithGemini.mockReset().mockResolvedValue([]);
        useSettingsStore.setState({
            aiMode: 'offline', offlineModelDownloaded: false, aiProviders: [], geminiApiKey: '',
            categoryPreferences: { fan: 'House' }, deletedCategories: ['Shopping'],
        });
    });

    it('reports what each mode still needs', () => {
        expect(getSmartNoteAvailability()).toBe('needs-model');
        useSettingsStore.setState({ offlineModelDownloaded: true });
        expect(getSmartNoteAvailability()).toBe('ready');

        useSettingsStore.setState({ aiMode: 'online' });
        expect(getSmartNoteAvailability()).toBe('needs-key');
        useSettingsStore.setState({ aiProviders: [groq] });
        expect(getSmartNoteAvailability()).toBe('ready');
        useSettingsStore.setState({ aiProviders: [{ ...groq, enabled: false }], geminiApiKey: 'AIza' });
        expect(getSmartNoteAvailability()).toBe('ready');
    });

    it('routes offline mode to the on-device parser', async () => {
        await parseSmartNote({ noteText: 'uber 250', referenceDate: '2026-10-04' });
        expect(parseSmartNoteOffline).toHaveBeenCalledWith({ noteText: 'uber 250', referenceDate: '2026-10-04' });
        expect(parseTransactionsWithGemini).not.toHaveBeenCalled();
    });

    it('routes online mode to the providers with categories, preferences and recent history', async () => {
        useSettingsStore.setState({ aiMode: 'online', aiProviders: [groq] });
        await db.categories.bulkAdd([createMockCategory({ name: 'Food' }), createMockCategory({ name: 'House' })]);
        await db.expenses.bulkAdd([
            createMockExpense({ note: 'kacchi', category: 'Food' }),
            createMockExpense({ note: 'misc', category: 'Unlisted' }),
            createMockExpense({ note: 'jacket', category: 'Shopping' }),
        ]);

        await parseSmartNote({ noteText: 'uber 250', referenceDate: '2026-10-04' });

        expect(parseSmartNoteOffline).not.toHaveBeenCalled();
        const options = parseTransactionsWithGemini.mock.calls[0][0];
        expect(options).toMatchObject({
            noteText: 'uber 250',
            referenceDate: '2026-10-04',
            providers: [groq],
            categoryPreferences: { fan: 'House' },
            deletedCategories: ['Shopping'],
            historyExamples: [{ item: 'kacchi', category: 'Food' }],
        });
        expect(options.categories.map((c: { name: string }) => c.name)).toEqual(['Food', 'House']);
    });
});
