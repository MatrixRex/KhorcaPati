import { db, recalculateDailySummary, type Expense } from '@/db/schema';
import { useSettingsStore } from '@/stores/settingsStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { useSmartNoteQueueStore } from '@/stores/smartNoteQueueStore';
import { isNetworkConnectionError, type ParsedGeminiTransaction } from '@/lib/geminiParser';
import { getSmartNoteAvailability, parseSmartNote } from './smartNoteParser';
import { fireNotification } from '@/utils/notifications';
import { format } from 'date-fns';

let isProcessing = false;

/**
 * Imports an array of parsed transactions into Dexie DB, calculates daily summaries,
 * creates missing categories, and refreshes the expense store. Categories are not learned as
 * preferences here: unchecked AI guesses would reinforce mistakes; only explicit edits are learned.
 */
export async function importParsedTransactions(transactions: ParsedGeminiTransaction[]): Promise<number> {
    if (!transactions || transactions.length === 0) return 0;

    const nowIso = new Date().toISOString();
    const datesToRecalculate = new Set<string>();
    const { addCategory } = useCategoryStore.getState();

    const currentDbCats = await db.categories.toArray();
    const existingCatNames = new Set(currentDbCats.map((c) => c.name.toLowerCase().trim()));
    const { deletedCategories } = useSettingsStore.getState();
    const deletedNamesSet = new Set((deletedCategories || []).map((c) => c.toLowerCase().trim()));

    for (const tx of transactions) {
        let catName = (tx.category || '').trim();
        if (deletedNamesSet.has(catName.toLowerCase())) {
            catName = 'Unlisted';
            tx.category = 'Unlisted';
        }

        if (catName && catName !== 'Unlisted') {
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
 * Attempts to parse the next pending note in the queue.
 * Returns true if a note was processed, false if there is none or the engine can't run yet
 * (online mode without network or key; offline mode before the model is downloaded).
 */
export async function processNextQueuedNote(): Promise<boolean> {
    const isOnlineMode = useSettingsStore.getState().aiMode === 'online';
    if (isOnlineMode && typeof navigator !== 'undefined' && navigator.onLine === false) {
        return false;
    }
    if (getSmartNoteAvailability() !== 'ready') {
        return false;
    }

    const { queue, setNoteStatus } = useSmartNoteQueueStore.getState();
    const pendingNote = queue.find((n) => n.status === 'pending');
    if (!pendingNote) {
        return false;
    }

    setNoteStatus(pendingNote.id, 'processing');

    try {
        const results = await parseSmartNote({ noteText: pendingNote.noteText, referenceDate: pendingNote.referenceDate });

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
