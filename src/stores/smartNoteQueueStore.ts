import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import { type ParsedGeminiTransaction } from '@/lib/geminiParser';

export type QueuedNoteStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface QueuedSmartNote {
    id: string;
    noteText: string;
    referenceDate: string;
    createdAt: string;
    status: QueuedNoteStatus;
    parsedTransactions?: ParsedGeminiTransaction[];
    errorMessage?: string;
    retryCount: number;
    lastAttemptAt?: string;
}

interface SmartNoteQueueState {
    queue: QueuedSmartNote[];
    enqueueNote: (noteText: string, referenceDate?: string) => QueuedSmartNote;
    removeNote: (id: string) => void;
    setNoteStatus: (id: string, status: QueuedNoteStatus, extra?: Partial<QueuedSmartNote>) => void;
    clearCompleted: () => void;
    clearAll: () => void;
}

export const useSmartNoteQueueStore = create<SmartNoteQueueState>()(
    persist(
        (set) => ({
            queue: [],
            enqueueNote: (noteText: string, referenceDate?: string) => {
                const now = new Date();
                const cleanText = noteText.trim();
                const newNote: QueuedSmartNote = {
                    id: `offline-note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    noteText: cleanText,
                    referenceDate: referenceDate || format(now, 'yyyy-MM-dd'),
                    createdAt: now.toISOString(),
                    status: 'pending',
                    retryCount: 0,
                };

                set((state) => {
                    // Filter out any older pending duplicate note with exact same content to avoid redundant calls
                    const filtered = state.queue.filter(
                        (n) => !(n.status === 'pending' && n.noteText.toLowerCase() === cleanText.toLowerCase())
                    );
                    return { queue: [newNote, ...filtered] };
                });

                return newNote;
            },
            removeNote: (id: string) => {
                set((state) => ({ queue: state.queue.filter((n) => n.id !== id) }));
            },
            setNoteStatus: (id: string, status: QueuedNoteStatus, extra?: Partial<QueuedSmartNote>) => {
                set((state) => ({
                    queue: state.queue.map((n) =>
                        n.id === id
                            ? {
                                  ...n,
                                  status,
                                  ...extra,
                                  lastAttemptAt: new Date().toISOString(),
                              }
                            : n
                    ),
                }));
            },
            clearCompleted: () => {
                set((state) => ({ queue: state.queue.filter((n) => n.status !== 'ready') }));
            },
            clearAll: () => {
                set({ queue: [] });
            },
        }),
        {
            name: 'khorchapati-smart-note-queue',
        }
    )
);
