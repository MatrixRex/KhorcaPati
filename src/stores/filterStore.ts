import { create } from 'zustand';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

export type Timeframe = 'this-month' | 'this-week' | 'custom';

interface FilterState {
    timeframe: Timeframe;
    startDate: Date;
    endDate: Date;
    setTimeframe: (timeframe: Timeframe) => void;
    setDateRange: (start: Date, end: Date) => void;
}

const getInitialDates = (timeframe: Timeframe) => {
    const now = new Date();
    switch (timeframe) {
        case 'this-month':
            return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
        case 'this-week':
            return { startDate: startOfWeek(now, { weekStartsOn: 6 }), endDate: endOfWeek(now, { weekStartsOn: 6 }) }; // Saturday to Friday
        case 'custom':
        default:
            return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    }
};

export const useFilterStore = create<FilterState>((set) => ({
    timeframe: 'this-month',
    ...getInitialDates('this-month'),

    setTimeframe: (timeframe) => {
        if (timeframe === 'custom') {
            set({ timeframe });
            return;
        }
        set({ timeframe, ...getInitialDates(timeframe) });
    },

    setDateRange: (start, end) => set({
        startDate: start,
        endDate: end,
        timeframe: 'custom'
    }),
}));
