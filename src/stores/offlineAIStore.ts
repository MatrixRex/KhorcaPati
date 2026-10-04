import { create } from 'zustand';

export type OfflineAIStatus = 'idle' | 'loading' | 'ready' | 'error';

interface OfflineAIState {
    /** idle: not loaded this session · loading: downloading or starting · ready: can parse · error: last load failed */
    status: OfflineAIStatus;
    /** 0..1 while loading */
    progress: number;
    error: string | null;
}

/** Session-only status of the on-device model (whether it is downloaded is persisted in settings). */
export const useOfflineAIStore = create<OfflineAIState>()(() => ({
    status: 'idle',
    progress: 0,
    error: null,
}));
