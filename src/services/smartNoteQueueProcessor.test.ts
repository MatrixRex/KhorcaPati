import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { db } from '@/db/schema';
import { useSettingsStore } from '@/stores/settingsStore';
import { useSmartNoteQueueStore } from '@/stores/smartNoteQueueStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { processNextQueuedNote, retryQueuedNote, importParsedTransactions } from './smartNoteQueueProcessor';
import { NetworkConnectionError, type ParsedGeminiTransaction } from '@/lib/geminiParser';

const parseSmartNoteOffline = vi.fn();
vi.mock('@/lib/offlineAI/offlineEngine', () => ({ parseSmartNoteOffline: (...a: unknown[]) => parseSmartNoteOffline(...a) }));

describe('Smart Note Queue Processor & Offline Import Engine', () => {
    beforeEach(async () => {
        await db.expenses.clear();
        await db.items.clear();
        await db.categories.clear();
        await db.dailySummaries.clear();
        useSmartNoteQueueStore.getState().clearAll();
        useSettingsStore.getState().setGeminiApiKey('test-valid-key');
        useSettingsStore.setState({ aiMode: 'online', offlineModelDownloaded: false, categoryPreferences: {} });
        parseSmartNoteOffline.mockReset();
        await useCategoryStore.getState().ensureDefaultCategory();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('importParsedTransactions imports records, items, creates categories, and recalculates daily summaries', async () => {
        const mockTransactions: ParsedGeminiTransaction[] = [
            {
                id: 'tx-1',
                title: 'Grocery Bazar',
                amount: 1500,
                type: 'expense',
                category: 'Groceries',
                date: '2026-09-04',
                note: 'Grocery Bazar',
                itemAutoTrack: true,
                items: [
                    { name: 'rice', qty: 2, unit: 'kg' },
                    { name: 'oil', qty: 1, unit: 'L' },
                ],
                selected: true,
            },
            {
                id: 'tx-2',
                title: 'Client Payment',
                amount: 10000,
                type: 'income',
                category: 'Freelance',
                date: '2026-09-04',
                note: 'Client Payment',
                itemAutoTrack: false,
                items: [],
                selected: true,
            },
        ];

        const importedCount = await importParsedTransactions(mockTransactions);
        expect(importedCount).toBe(2);

        // Verify expenses in Dexie
        const expenses = await db.expenses.toArray();
        expect(expenses.length).toBe(2);
        expect(expenses[0].amount).toBe(1500);
        expect(expenses[0].type).toBe('expense');
        expect(expenses[1].amount).toBe(10000);
        expect(expenses[1].type).toBe('income');

        // Verify items in Dexie
        const items = await db.items.toArray();
        expect(items.length).toBe(2);
        expect(items[0].name).toBe('rice');
        expect(items[1].name).toBe('oil');

        // Verify daily summary was updated
        const summary = await db.dailySummaries.get('2026-09-04');
        expect(summary).toBeDefined();
        expect(summary?.expenseTotal).toBe(1500);
        expect(summary?.incomeTotal).toBe(10000);

        // Verify category was auto-created
        const cats = await db.categories.toArray();
        expect(cats.some((c) => c.name.toLowerCase() === 'freelance')).toBe(true);

        // Unchecked imports are not learned as preferences; only explicit category edits are.
        const preferences = useSettingsStore.getState().categoryPreferences;
        expect(preferences['grocery bazar']).toBeUndefined();
    });

    it('processNextQueuedNote in offline mode parses on-device without needing the network', async () => {
        useSettingsStore.setState({ aiMode: 'offline', offlineModelDownloaded: true });
        parseSmartNoteOffline.mockResolvedValue([{ id: 'o1', title: 'Uber', amount: 250, type: 'expense', category: 'Transport', date: '2026-10-04', note: 'Uber', itemAutoTrack: false, items: [], selected: true }]);
        useSmartNoteQueueStore.getState().enqueueNote('uber 250', '2026-10-04');

        const originalNavigator = globalThis.navigator;
        Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true });
        try {
            expect(await processNextQueuedNote()).toBe(true);
        } finally {
            Object.defineProperty(globalThis, 'navigator', { value: originalNavigator, configurable: true });
        }

        expect(parseSmartNoteOffline).toHaveBeenCalledWith({ noteText: 'uber 250', referenceDate: '2026-10-04' });
        expect(useSmartNoteQueueStore.getState().queue[0].status).toBe('ready');
    });

    it('processNextQueuedNote in offline mode waits until the model is downloaded', async () => {
        useSettingsStore.setState({ aiMode: 'offline', offlineModelDownloaded: false });
        useSmartNoteQueueStore.getState().enqueueNote('uber 250', '2026-10-04');

        expect(await processNextQueuedNote()).toBe(false);
        expect(parseSmartNoteOffline).not.toHaveBeenCalled();
        expect(useSmartNoteQueueStore.getState().queue[0].status).toBe('pending');
    });

    it('processNextQueuedNote skips processing when offline or when no API key exists', async () => {
        useSmartNoteQueueStore.getState().enqueueNote('chicken 100');

        // Case 1: Offline
        const originalNavigator = globalThis.navigator;
        try {
            Object.defineProperty(globalThis, 'navigator', {
                value: { onLine: false },
                configurable: true,
                writable: true,
            });
            const resOffline = await processNextQueuedNote();
            expect(resOffline).toBe(false);
            expect(useSmartNoteQueueStore.getState().queue[0].status).toBe('pending');
        } finally {
            Object.defineProperty(globalThis, 'navigator', {
                value: originalNavigator,
                configurable: true,
                writable: true,
            });
        }

        // Case 2: No API key
        useSettingsStore.getState().setGeminiApiKey('');
        const resNoKey = await processNextQueuedNote();
        expect(resNoKey).toBe(false);
        expect(useSmartNoteQueueStore.getState().queue[0].status).toBe('pending');
    });

    it('processNextQueuedNote successfully parses note and marks status as ready', async () => {
        useSettingsStore.getState().setGeminiApiKey('test-key');
        useSmartNoteQueueStore.getState().enqueueNote('uber 250');

        const mockApiResponse = {
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: JSON.stringify({
                                    transactions: [
                                        {
                                            title: 'Uber',
                                            amount: 250,
                                            type: 'expense',
                                            category: 'Transportation',
                                            date: '2026-09-04',
                                            note: 'uber',
                                            itemAutoTrack: false,
                                            items: [],
                                        },
                                    ],
                                }),
                            },
                        ],
                    },
                },
            ],
        };

        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => mockApiResponse,
        } as Response);

        const processed = await processNextQueuedNote();
        expect(processed).toBe(true);

        const note = useSmartNoteQueueStore.getState().queue[0];
        expect(note.status).toBe('ready');
        expect(note.parsedTransactions?.length).toBe(1);
        expect(note.parsedTransactions?.[0].title).toBe('Uber');
        expect(note.parsedTransactions?.[0].amount).toBe(250);
    });

    it('processNextQueuedNote reverts to pending on network connection error so it can retry later', async () => {
        useSettingsStore.getState().setGeminiApiKey('test-key');
        useSmartNoteQueueStore.getState().enqueueNote('uber 250');

        // Mock fetch throwing a network connection failure
        vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new NetworkConnectionError('Connection refused'));

        const processed = await processNextQueuedNote();
        expect(processed).toBe(false);

        const note = useSmartNoteQueueStore.getState().queue[0];
        // Reverted to pending!
        expect(note.status).toBe('pending');
        expect(note.retryCount).toBe(1);
        expect(note.errorMessage).toContain('Network connection unavailable');
    });

    it('processNextQueuedNote marks note as failed on quota limit or non-network errors', async () => {
        useSettingsStore.getState().setGeminiApiKey('test-key');
        useSmartNoteQueueStore.getState().enqueueNote('uber 250');

        // Mock HTTP 429 Quota Exceeded error response
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            json: async () => ({ error: { message: 'Quota exceeded' } }),
        } as Response);

        const processed = await processNextQueuedNote();
        expect(processed).toBe(true);

        const note = useSmartNoteQueueStore.getState().queue[0];
        // Strictly marks failed, not pending
        expect(note.status).toBe('failed');
        expect(note.errorMessage).toContain('rate limit');
    });

    it('importParsedTransactions never resurrects deleted categories and maps them to Unlisted', async () => {
        // Mark Fast Food as deleted
        useSettingsStore.getState().markDeletedCategory('Fast Food');

        const mockTransactions: ParsedGeminiTransaction[] = [
            {
                id: 'tx-deleted-cat',
                title: 'Burger King',
                amount: 350,
                type: 'expense',
                category: 'Fast Food',
                date: '2026-09-04',
                note: 'Burger King',
                itemAutoTrack: false,
                items: [],
                selected: true,
            },
        ];

        const importedCount = await importParsedTransactions(mockTransactions);
        expect(importedCount).toBe(1);

        // Verify category was NOT created in DB
        const cats = await db.categories.toArray();
        expect(cats.some((c) => c.name.toLowerCase() === 'fast food')).toBe(false);

        // Verify expense was saved under Unlisted
        const expenses = await db.expenses.toArray();
        const burgerExpense = expenses.find((e) => e.title === 'Burger King');
        expect(burgerExpense).toBeDefined();
        expect(burgerExpense?.category).toBe('Unlisted');

        // Verify preference was NOT learned for Fast Food
        const preferences = useSettingsStore.getState().categoryPreferences;
        expect(preferences['burger king']).toBeUndefined();
    });

    it('retryQueuedNote retries a failed note and marks it ready on success', async () => {
        useSettingsStore.getState().setGeminiApiKey('test-key');
        const enqueued = useSmartNoteQueueStore.getState().enqueueNote('dinner 450');
        // Manually mark as failed with previous error
        useSmartNoteQueueStore.getState().setNoteStatus(enqueued.id, 'failed', {
            errorMessage: 'Previous rate limit error',
            retryCount: 1,
        });

        const mockApiResponse = {
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: JSON.stringify({
                                    transactions: [
                                        {
                                            title: 'Dinner',
                                            amount: 450,
                                            type: 'expense',
                                            category: 'Food',
                                            date: '2026-09-04',
                                            note: 'dinner',
                                            itemAutoTrack: false,
                                            items: [],
                                        },
                                    ],
                                }),
                            },
                        ],
                    },
                },
            ],
        };

        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => mockApiResponse,
        } as Response);

        const retried = await retryQueuedNote(enqueued.id);
        expect(retried).toBe(true);

        const note = useSmartNoteQueueStore.getState().queue.find((n) => n.id === enqueued.id);
        expect(note?.status).toBe('ready');
        expect(note?.errorMessage).toBeUndefined();
        expect(note?.parsedTransactions?.length).toBe(1);
        expect(note?.parsedTransactions?.[0].amount).toBe(450);
    });

    it('retryQueuedNote updates error message and increments retryCount on subsequent failure', async () => {
        useSettingsStore.getState().setGeminiApiKey('test-key');
        const enqueued = useSmartNoteQueueStore.getState().enqueueNote('dinner 450');
        useSmartNoteQueueStore.getState().setNoteStatus(enqueued.id, 'failed', {
            errorMessage: 'First error',
            retryCount: 1,
        });

        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: async () => ({ error: { message: 'Gemini server error' } }),
        } as Response);

        const retried = await retryQueuedNote(enqueued.id);
        expect(retried).toBe(true);

        const note = useSmartNoteQueueStore.getState().queue.find((n) => n.id === enqueued.id);
        expect(note?.status).toBe('failed');
        expect(note?.retryCount).toBe(2);
        expect(note?.errorMessage).toContain('Gemini server error');
    });

    it('processNextQueuedNote with targetNoteId retries targeted note even if failed', async () => {
        useSettingsStore.getState().setGeminiApiKey('test-key');
        const failedNote = useSmartNoteQueueStore.getState().enqueueNote('failed note 100');
        useSmartNoteQueueStore.getState().setNoteStatus(failedNote.id, 'failed', {
            errorMessage: 'Timeout error',
            retryCount: 1,
        });

        // Also add another pending note
        const pendingNote = useSmartNoteQueueStore.getState().enqueueNote('pending note 200');

        const mockApiResponse = {
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: JSON.stringify({
                                    transactions: [
                                        {
                                            title: 'Failed Note Resolved',
                                            amount: 100,
                                            type: 'expense',
                                            category: 'General',
                                            date: '2026-09-04',
                                            note: 'failed note 100',
                                            itemAutoTrack: false,
                                            items: [],
                                        },
                                    ],
                                }),
                            },
                        ],
                    },
                },
            ],
        };

        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => mockApiResponse,
        } as Response);

        // Call processNextQueuedNote targeting the failed note specifically
        const processed = await processNextQueuedNote(failedNote.id);
        expect(processed).toBe(true);

        const target = useSmartNoteQueueStore.getState().queue.find((n) => n.id === failedNote.id);
        expect(target?.status).toBe('ready');

        // Verify the other pending note was left alone as pending
        const other = useSmartNoteQueueStore.getState().queue.find((n) => n.id === pendingNote.id);
        expect(other?.status).toBe('pending');
    });

    it('retryQueuedNote returns false for non-existent note', async () => {
        const retried = await retryQueuedNote('non-existent-id');
        expect(retried).toBe(false);
    });
});

