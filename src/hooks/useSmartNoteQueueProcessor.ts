import { useEffect } from 'react';
import { processAllQueuedNotes } from '@/services/smartNoteQueueProcessor';
import { useSmartNoteQueueStore } from '@/stores/smartNoteQueueStore';

/**
 * Global background hook that monitors network connectivity and retries
 * parsing offline-queued smart notes when the device is online.
 */
export function useSmartNoteQueueProcessor() {
    useEffect(() => {
        // Initial check on mount
        if (typeof navigator === 'undefined' || navigator.onLine !== false) {
            processAllQueuedNotes();
        }

        const handleOnline = () => {
            processAllQueuedNotes();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
                processAllQueuedNotes();
            }
        };

        window.addEventListener('online', handleOnline);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Periodic heartbeat retry every 30 seconds if pending notes exist
        const intervalId = setInterval(() => {
            const hasPending = useSmartNoteQueueStore.getState().queue.some((n) => n.status === 'pending');
            if (hasPending && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
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
