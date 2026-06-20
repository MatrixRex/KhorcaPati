import { create } from 'zustand';
import { 
    startOfWeek, 
    endOfWeek, 
    startOfDay, 
    endOfDay, 
} from 'date-fns';
import { getBillingCycleRange, getPreviousBillingCycleRange } from '@/utils/cycle';
import { useSettingsStore } from './settingsStore';

export type Timeframe = 'today' | 'this-week' | 'this-month' | 'past-month' | 'custom';

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

const getInitialDates = (timeframe: Timeframe, resetDate: number): { startDate: Date; endDate: Date } => {
    const now = new Date();
    switch (timeframe) {
        case 'today':
            return { startDate: startOfDay(now), endDate: endOfDay(now) };
        case 'this-week':
            return { startDate: startOfWeek(now, { weekStartsOn: 6 }), endDate: endOfWeek(now, { weekStartsOn: 6 }) }; // Saturday to Friday
        case 'this-month': {
            const range = getBillingCycleRange(now, resetDate);
            return { startDate: range.start, endDate: range.end };
        }
        case 'past-month': {
            const range = getPreviousBillingCycleRange(now, resetDate);
            return { startDate: range.start, endDate: range.end };
        }
        case 'custom':
        default: {
            const range = getBillingCycleRange(now, resetDate);
            return { startDate: range.start, endDate: range.end };
        }
    }
};

export const useFilterStore = create<FilterState>((set) => {
    const resetDate = useSettingsStore.getState()?.resetDate ?? 1;

    return {
        timeframe: 'this-month',
        ...getInitialDates('this-month', resetDate),
        selectedCategory: null,
        inventorySortBy: 'alphabet',
        expenseSortBy: 'latest',

        setTimeframe: (timeframe) => {
            if (timeframe === 'custom') {
                set({ timeframe });
                return;
            }
            const currentResetDate = useSettingsStore.getState()?.resetDate ?? 1;
            set({ timeframe, ...getInitialDates(timeframe, currentResetDate) });
        },

        setDateRange: (start, end) => set({
            startDate: start,
            endDate: end,
            timeframe: 'custom'
        }),

        setCategory: (category) => set({ selectedCategory: category }),
        setInventorySortBy: (sort) => set({ inventorySortBy: sort }),
        setExpenseSortBy: (sort) => set({ expenseSortBy: sort }),
    };
});

// Reactively update dates when resetDate changes in settings
useSettingsStore.subscribe((state) => {
    const filterState = useFilterStore.getState();
    if (filterState.timeframe !== 'custom') {
        const newDates = getInitialDates(filterState.timeframe, state.resetDate);
        useFilterStore.setState({
            startDate: newDates.startDate,
            endDate: newDates.endDate
        });
    }
});
