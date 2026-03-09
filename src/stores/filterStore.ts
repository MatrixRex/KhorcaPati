import { create } from 'zustand';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

export type Timeframe = 'this-month' | 'this-week' | 'custom';

export type InventorySortBy = 'alphabet' | 'count';
export type ExpenseSortBy = 'latest' | 'oldest' | 'amount-high' | 'amount-low';

interface FilterState {
    timeframe: Timeframe;
    startDate: Date;
    endDate: Date;
    selectedCategory: string | null;
    inventorySortBy: InventorySortBy;
    expenseSortBy: ExpenseSortBy;
    setTimeframe: (timeframe: Timeframe) => void;
    setDateRange: (start: Date, end: Date) => void;
    setCategory: (category: string | null) => void;
    setInventorySortBy: (sort: InventorySortBy) => void;
    setExpenseSortBy: (sort: ExpenseSortBy) => void;
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
    selectedCategory: null,
    inventorySortBy: 'alphabet',
    expenseSortBy: 'latest',

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

    setCategory: (category) => set({ selectedCategory: category }),
    setInventorySortBy: (sort) => set({ inventorySortBy: sort }),
    setExpenseSortBy: (sort) => set({ expenseSortBy: sort }),
}));
