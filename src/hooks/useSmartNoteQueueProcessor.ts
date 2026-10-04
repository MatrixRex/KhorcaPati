import { useEffect } from 'react';
import { processAllQueuedNotes } from '@/services/smartNoteQueueProcessor';
import { useSmartNoteQueueStore } from '@/stores/smartNoteQueueStore';
import { warmUpOfflineRuntime } from '@/lib/offlineAI/offlineEngine';

/**
 * Global background hook that processes queued smart notes: on start, when the app becomes visible,
 * when the network returns, and every 30 seconds while notes are pending. Each attempt checks whether
 * the current engine can run (online mode needs network; offline mode needs the downloaded model).
 * Also warms up the on-device model shortly after start so the first Smart Note is instant.
 */
export function useSmartNoteQueueProcessor() {
    useEffect(() => {
        processAllQueuedNotes();
        warmUpOfflineRuntime();

        const handleOnline = () => {
            processAllQueuedNotes();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                processAllQueuedNotes();
            }
        };

        window.addEventListener('online', handleOnline);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        const intervalId = setInterval(() => {
            const hasPending = useSmartNoteQueueStore.getState().queue.some((n) => n.status === 'pending');
            if (hasPending) {
                processAllQueuedNotes();
            }
        }, 30000);

        return () => {
            window.removeEventListener('online', handleOnline);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(intervalId);
        };
    }, []);
}
