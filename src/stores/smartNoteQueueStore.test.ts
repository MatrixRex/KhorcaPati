import { describe, it, expect, beforeEach } from 'vitest';
import { useSmartNoteQueueStore } from './smartNoteQueueStore';
import { isNetworkConnectionError, NetworkConnectionError } from '@/lib/geminiParser';

describe('Smart Note Queue Store & Offline Network Discrimination', () => {
    beforeEach(() => {
        useSmartNoteQueueStore.getState().clearAll();
    });

    it('enqueues a note with pending status and prevents redundant pending duplicates', () => {
        const store = useSmartNoteQueueStore.getState();

        const note1 = store.enqueueNote('chicken 100\negg 50', '2026-09-04');
        expect(note1.status).toBe('pending');
        expect(note1.retryCount).toBe(0);
        expect(note1.noteText).toBe('chicken 100\negg 50');
        expect(useSmartNoteQueueStore.getState().queue.length).toBe(1);

        // Enqueueing exact same note text while pending should de-duplicate
        const note2 = store.enqueueNote('chicken 100\negg 50', '2026-09-04');
        const currentQueue = useSmartNoteQueueStore.getState().queue;
        expect(currentQueue.length).toBe(1);
        expect(currentQueue[0].id).toBe(note2.id);

        // Different note creates second entry
        store.enqueueNote('transport 40', '2026-09-04');
        expect(useSmartNoteQueueStore.getState().queue.length).toBe(2);
    });

    it('updates note status, error messages, and parsed transactions', () => {
        const store = useSmartNoteQueueStore.getState();
        const note = store.enqueueNote('groceries 500');

        // Transition to processing
        store.setNoteStatus(note.id, 'processing');
        expect(useSmartNoteQueueStore.getState().queue[0].status).toBe('processing');
        expect(useSmartNoteQueueStore.getState().queue[0].lastAttemptAt).toBeDefined();

        // Transition to ready
        const mockTx = [
            {
                id: 'tx-1',
                title: 'Groceries',
                amount: 500,
                type: 'expense' as const,
                category: 'Groceries',
                date: '2026-09-04',
                note: 'groceries',
                itemAutoTrack: false,
                items: [],
                selected: true,
            },
        ];
        store.setNoteStatus(note.id, 'ready', { parsedTransactions: mockTx });
        const readyNote = useSmartNoteQueueStore.getState().queue[0];
        expect(readyNote.status).toBe('ready');
        expect(readyNote.parsedTransactions).toEqual(mockTx);

        // Transition to failed
        store.setNoteStatus(note.id, 'failed', { errorMessage: 'Invalid API Key' });
        expect(useSmartNoteQueueStore.getState().queue[0].status).toBe('failed');
        expect(useSmartNoteQueueStore.getState().queue[0].errorMessage).toBe('Invalid API Key');
    });

    it('removes specific notes and clears completed items', () => {
        const store = useSmartNoteQueueStore.getState();
        const n1 = store.enqueueNote('note 1');
        const n2 = store.enqueueNote('note 2');

        store.setNoteStatus(n1.id, 'ready');
        expect(useSmartNoteQueueStore.getState().queue.length).toBe(2);

        store.clearCompleted();
        const afterClear = useSmartNoteQueueStore.getState().queue;
        expect(afterClear.length).toBe(1);
        expect(afterClear[0].id).toBe(n2.id);

        store.removeNote(n2.id);
        expect(useSmartNoteQueueStore.getState().queue.length).toBe(0);
    });

    describe('isNetworkConnectionError discrimination', () => {
        it('returns true when navigator.onLine is false', () => {
            const originalNavigator = globalThis.navigator;
            try {
                Object.defineProperty(globalThis, 'navigator', {
                    value: { onLine: false },
                    configurable: true,
                    writable: true,
                });
                expect(isNetworkConnectionError(new Error('Any error while offline'))).toBe(true);
            } finally {
                Object.defineProperty(globalThis, 'navigator', {
                    value: originalNavigator,
                    configurable: true,
                    writable: true,
                });
            }
        });

        it('returns true for NetworkConnectionError instances', () => {
            const err = new NetworkConnectionError('Failed to reach Gemini');
            expect(isNetworkConnectionError(err)).toBe(true);
        });

        it('returns true for standard browser fetch network errors', () => {
            expect(isNetworkConnectionError(new TypeError('Failed to fetch'))).toBe(true);
            expect(isNetworkConnectionError(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(true);
            expect(isNetworkConnectionError(new Error('net::ERR_NAME_NOT_RESOLVED'))).toBe(true);
            expect(isNetworkConnectionError(new Error('net::ERR_INTERNET_DISCONNECTED'))).toBe(true);
            expect(isNetworkConnectionError(new Error('Connection lost. Check your internet connection.'))).toBe(true);
            expect(isNetworkConnectionError(new Error('Network error contacting Gemini API'))).toBe(true);
        });

        it('strictly returns FALSE for Gemini quota and rate limit errors (429)', () => {
            expect(isNetworkConnectionError(new Error('Gemini API rate limit exceeded. Please wait a moment and try again.'))).toBe(false);
            expect(isNetworkConnectionError(new Error('RESOURCE_EXHAUSTED: Quota exceeded for quota metric'))).toBe(false);
            expect(isNetworkConnectionError(new Error('API error (429: Too Many Requests)'))).toBe(false);
            expect(isNetworkConnectionError(new Error('Monthly quota reached'))).toBe(false);
        });

        it('strictly returns FALSE for API key and auth errors (400/403)', () => {
            expect(isNetworkConnectionError(new Error('Invalid Gemini API Key. Please verify your key in Settings.'))).toBe(false);
            expect(isNetworkConnectionError(new Error('API error (400: API_KEY_INVALID)'))).toBe(false);
            expect(isNetworkConnectionError(new Error('Permission denied: 403 Unauthorized'))).toBe(false);
        });

        it('returns false for generic parsing errors or non-errors', () => {
            expect(isNetworkConnectionError(new Error('Failed to parse Gemini output into structured transactions.'))).toBe(false);
            expect(isNetworkConnectionError(null)).toBe(false);
            expect(isNetworkConnectionError(undefined)).toBe(false);
        });
    });
});
