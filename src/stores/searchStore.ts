import { create } from 'zustand';
import { getInitialDates, useFilterStore, type Timeframe } from './filterStore';
import { useSettingsStore } from './settingsStore';

export interface SearchRangeOverride {
    timeframe: Timeframe;
    startDate: Date;
    endDate: Date;
}

interface SearchState {
    query: string;
    expanded: boolean;
    /** Ignore every date constraint. */
    allTime: boolean;
    /** null = follow the page's view-settings range (the default). */
    override: SearchRangeOverride | null;
    setQuery: (q: string) => void;
    setExpanded: (v: boolean) => void;
    setAllTime: (v: boolean) => void;
    setTimeframe: (tf: Timeframe) => void;
    setCustomRange: (start: Date, end: Date) => void;
    followView: () => void;
    reset: () => void;
}

export interface DateWindow {
    start: Date;
    end: Date;
}

/** The effective window for search, or null when unbounded (all time). */
export function resolveSearchRange(
    allTime: boolean,
    override: SearchRangeOverride | null,
    view: DateWindow,
): DateWindow | null {
    if (allTime) return null;
    if (override) return { start: override.startDate, end: override.endDate };
    return view;
}

export const useSearchStore = create<SearchState>((set) => ({
    query: '',
    expanded: false,
    allTime: false,
    override: null,

    setQuery: (query) => set({ query }),
    setExpanded: (expanded) => set({ expanded }),
    setAllTime: (allTime) => set({ allTime }),

    setTimeframe: (timeframe) => {
        if (timeframe === 'custom') {
            const view = useFilterStore.getState();
            set((s) => ({
                allTime: false,
                override: { timeframe, startDate: s.override?.startDate ?? view.startDate, endDate: s.override?.endDate ?? view.endDate },
            }));
            return;
        }
        const resetDate = useSettingsStore.getState()?.resetDate ?? 1;
        set({ allTime: false, override: { timeframe, ...getInitialDates(timeframe, resetDate) } });
    },

    setCustomRange: (startDate, endDate) =>
        set({ allTime: false, override: { timeframe: 'custom', startDate, endDate } }),

    followView: () => set({ allTime: false, override: null }),

    // Closing the search keeps nothing: back to "constrained by the view range".
    reset: () => set({ query: '', expanded: false, allTime: false, override: null }),
}));

/** Search window for the current page; null when searching all time. */
export function useSearchWindow(): DateWindow | null {
    const allTime = useSearchStore((s) => s.allTime);
    const override = useSearchStore((s) => s.override);
    const startDate = useFilterStore((s) => s.startDate);
    const endDate = useFilterStore((s) => s.endDate);
    return resolveSearchRange(allTime, override, { start: startDate, end: endDate });
}
