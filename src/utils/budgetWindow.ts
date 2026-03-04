import {
    format,
    startOfDay, endOfDay,
    startOfWeek, endOfWeek,
    startOfMonth, endOfMonth,
    startOfYear, endOfYear,
    isWithinInterval, parseISO,
} from 'date-fns';
import { type Budget, type Expense } from '@/db/schema';

export interface SpendingWindow {
    start: string; // yyyy-MM-dd
    end: string;   // yyyy-MM-dd
}

export function getBudgetWindow(budget: Budget): SpendingWindow | null {
    if (budget.timelineType === 'range') {
        if (!budget.startDate || !budget.endDate) return null;
        return { start: budget.startDate, end: budget.endDate };
    }

    const now = new Date();
    switch (budget.recurringInterval) {
        case 'daily':
            return {
                start: format(startOfDay(now), 'yyyy-MM-dd'),
                end: format(endOfDay(now), 'yyyy-MM-dd'),
            };
        case 'weekly':
            return {
                start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
            };
        case 'yearly':
            return {
                start: format(startOfYear(now), 'yyyy-MM-dd'),
                end: format(endOfYear(now), 'yyyy-MM-dd'),
            };
        case 'monthly':
        default:
            return {
                start: format(startOfMonth(now), 'yyyy-MM-dd'),
                end: format(endOfMonth(now), 'yyyy-MM-dd'),
            };
    }
}

/** Sum expenses that fall within a budget's active window. */
export function calcSpent(budget: Budget, expenses: Expense[]): number {
    const window = getBudgetWindow(budget);
    if (!window) return 0;

    return expenses
        .filter(exp => {
            if (exp.type !== 'expense') return false;
            if (exp.category.toLowerCase() !== budget.category.toLowerCase()) return false;
            try {
                return isWithinInterval(parseISO(exp.date), {
                    start: parseISO(window.start),
                    end: parseISO(window.end),
                });
            } catch {
                return false;
            }
        })
        .reduce((sum, exp) => sum + exp.amount, 0);
}

/** A stable string key representing the current period for a budget (for localStorage dedup). */
export function budgetPeriodKey(budget: Budget): string {
    const w = getBudgetWindow(budget);
    if (!w) return 'no-window';
    return `${w.start}__${w.end}`;
}
