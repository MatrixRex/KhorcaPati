import { db, recalculateDailySummary, type Expense } from '@/db/schema';
import { useSettingsStore } from '@/stores/settingsStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { useSmartNoteQueueStore } from '@/stores/smartNoteQueueStore';
import { parseTransactionsWithGemini, isNetworkConnectionError, type ParsedGeminiTransaction } from '@/lib/geminiParser';
import { fireNotification } from '@/utils/notifications';
import { format } from 'date-fns';

let isProcessing = false;

/**
 * Imports an array of parsed transactions into Dexie DB, calculates daily summaries,
 * updates category preferences, and refreshes the expense store.
 */
export async function importParsedTransactions(transactions: ParsedGeminiTransaction[]): Promise<number> {
    if (!transactions || transactions.length === 0) return 0;

    const nowIso = new Date().toISOString();
    const datesToRecalculate = new Set<string>();
    const { addCategory } = useCategoryStore.getState();
    const { learnCategoryPreference } = useSettingsStore.getState();

    const currentDbCats = await db.categories.toArray();
    const existingCatNames = new Set(currentDbCats.map((c) => c.name.toLowerCase().trim()));

    for (const tx of transactions) {
        const catName = (tx.category || '').trim();
        if (catName && catName !== 'Unlisted') {
            learnCategoryPreference(tx.title || tx.note, catName);
            if (!existingCatNames.has(catName.toLowerCase())) {
                await addCategory(catName);
                existingCatNames.add(catName.toLowerCase());
            }
        }
    }

    let importedCount = 0;

    await db.transaction('rw', [db.expenses, db.items, db.dailySummaries], async () => {
        for (const tx of transactions) {
            const txDate = tx.date || format(new Date(), 'yyyy-MM-dd');
            datesToRecalculate.add(txDate);

            const txTitle = (tx.title || tx.note || '').trim();
            const txNote = (tx.note || tx.title || '').trim();

            const expensePayload: Omit<Expense, 'id'> = {
                parentId: null,
                isNested: false,
                goalId: null,
                loanId: null,
                title: txTitle || undefined,
                amount: Number(tx.amount) || 0,
                type: tx.type,
                category: tx.category || 'Unlisted',
                date: txDate,
                note: txNote,
                isRecurring: false,
                recurringInterval: null,
                recurringNextDue: null,
                itemAutoTrack: Boolean(tx.itemAutoTrack),
                tags: [],
                createdAt: nowIso,
                updatedAt: nowIso,
            };

            const newExpenseId = await db.expenses.add(expensePayload);
            importedCount++;

            if (tx.itemAutoTrack && tx.items && tx.items.length > 0) {
                for (const it of tx.items) {
                    await db.items.add({
                        expenseId: newExpenseId as number,
                        name: it.name.trim().toLowerCase(),
                        rawInput: `${it.name} ${it.qty}${it.unit}`,
                        qty: Number(it.qty) || 1,
                        unit: it.unit || 'pcs',
                        date: txDate,
                        note: tx.title,
                        createdAt: nowIso,
                    });
                }
            }
        }
    });

    for (const d of datesToRecalculate) {
        await recalculateDailySummary(d);
    }

    await useExpenseStore.getState().loadExpenses();

    return importedCount;
}

/**
 * Attempts to parse the next pending note in the offline queue.
 * Returns true if a note was processed, false if no notes or network stopped it.
 */
export async function processNextQueuedNote(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return false;
    }

    const { geminiApiKey, geminiModel } = useSettingsStore.getState();
    if (!geminiApiKey || !geminiApiKey.trim()) {
        return false;
    }

    const { queue, setNoteStatus } = useSmartNoteQueueStore.getState();
    const pendingNote = queue.find((n) => n.status === 'pending');
    if (!pendingNote) {
        return false;
    }

    setNoteStatus(pendingNote.id, 'processing');

    try {
        const dbCategories = await db.categories.toArray();
        const effectiveCategories =
            dbCategories.length > 0 ? dbCategories : useCategoryStore.getState().categories;
        const { categoryPreferences } = useSettingsStore.getState();

        const recentExpenses = await db.expenses
            .orderBy('id')
            .reverse()
            .limit(100)
            .toArray();

        const historyExamples = recentExpenses
            .filter((e) => e.note && e.category && e.category !== 'Unlisted')
            .map((e) => ({ item: e.note, category: e.category }));

        const results = await parseTransactionsWithGemini({
            noteText: pendingNote.noteText,
            categories: effectiveCategories,
            categoryPreferences,
            historyExamples,
            referenceDate: pendingNote.referenceDate,
            apiKey: geminiApiKey,
            model: geminiModel || 'gemini-flash-lite-latest',
        });

        if (results && results.length > 0) {
            setNoteStatus(pendingNote.id, 'ready', {
                parsedTransactions: results,
                errorMessage: undefined,
            });

            fireNotification(
                '✨ AI Smart Note Processed',
                `Extracted ${results.length} transaction${results.length > 1 ? 's' : ''} from your offline note. Tap to review.`
            );
        } else {
            setNoteStatus(pendingNote.id, 'failed', {
                errorMessage: 'No transactions could be detected in this note.',
            });
        }

        return true;
    } catch (err: unknown) {
        if (isNetworkConnectionError(err)) {
            // Revert to pending so it can be retried when network recovers
            setNoteStatus(pendingNote.id, 'pending', {
                retryCount: pendingNote.retryCount + 1,
                errorMessage: 'Network connection unavailable. Retrying later.',
            });
            return false;
        }

        const msg = err instanceof Error ? err.message : String(err);
        setNoteStatus(pendingNote.id, 'failed', {
            errorMessage: msg,
            retryCount: pendingNote.retryCount + 1,
        });
        return true;
    }
}

/**
 * Iterates through pending notes and processes them sequentially in the background.
 */
export async function processAllQueuedNotes(): Promise<void> {
    if (isProcessing) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    isProcessing = true;
    try {
        let maxIterations = 20; // Safety guard
        let continueProcessing = true;
        while (continueProcessing && maxIterations > 0) {
            maxIterations--;
            continueProcessing = await processNextQueuedNote();
        }
    } finally {
        isProcessing = false;
    }
}
