import {
    format,
    startOfDay, endOfDay,
    startOfWeek, endOfWeek,
    startOfMonth, endOfMonth,
    startOfYear, endOfYear,
    isWithinInterval, parseISO,
    subDays, addDays
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

    if (budget.startDate && budget.timelineType === 'recurring') {
        const anchor = startOfDay(parseISO(budget.startDate));
        switch (budget.recurringInterval) {
            case 'daily':
                return {
                    start: format(startOfDay(now), 'yyyy-MM-dd'),
                    end: format(endOfDay(now), 'yyyy-MM-dd'),
                };
            case 'weekly': {
                const anchorDayOfWeek = anchor.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
                const nowDayOfWeek = now.getDay();
                let diff = nowDayOfWeek - anchorDayOfWeek;
                if (diff < 0) {
                    diff += 7;
                }
                const start = startOfDay(subDays(now, diff));
                const end = endOfDay(addDays(start, 6));
                return {
                    start: format(start, 'yyyy-MM-dd'),
                    end: format(end, 'yyyy-MM-dd'),
                };
            }
            case 'monthly': {
                const anchorDay = anchor.getDate();
                const nowYear = now.getFullYear();
                const nowMonth = now.getMonth();
                
                const getPeriodStart = (year: number, month: number, day: number) => {
                    const lastDayOfM = new Date(year, month + 1, 0).getDate();
                    return startOfDay(new Date(year, month, Math.min(day, lastDayOfM)));
                };

                const candidateStart = getPeriodStart(nowYear, nowMonth, anchorDay);
                let start: Date;
                let nextStart: Date;

                if (startOfDay(now) >= startOfDay(candidateStart)) {
                    start = candidateStart;
                    nextStart = getPeriodStart(nowYear, nowMonth + 1, anchorDay);
                } else {
                    start = getPeriodStart(nowYear, nowMonth - 1, anchorDay);
                    nextStart = candidateStart;
                }

                const end = endOfDay(subDays(nextStart, 1));
                return {
                    start: format(start, 'yyyy-MM-dd'),
                    end: format(end, 'yyyy-MM-dd'),
                };
            }
            case 'yearly': {
                const anchorMonth = anchor.getMonth();
                const anchorDay = anchor.getDate();
                const nowYear = now.getFullYear();

                const getYearlyPeriodStart = (year: number, month: number, day: number) => {
                    const lastDayOfM = new Date(year, month + 1, 0).getDate();
                    return startOfDay(new Date(year, month, Math.min(day, lastDayOfM)));
                };

                const candidateStart = getYearlyPeriodStart(nowYear, anchorMonth, anchorDay);
                let start: Date;
                let nextStart: Date;

                if (startOfDay(now) >= startOfDay(candidateStart)) {
                    start = candidateStart;
                    nextStart = getYearlyPeriodStart(nowYear + 1, anchorMonth, anchorDay);
                } else {
                    start = getYearlyPeriodStart(nowYear - 1, anchorMonth, anchorDay);
                    nextStart = candidateStart;
                }

                const end = endOfDay(subDays(nextStart, 1));
                return {
                    start: format(start, 'yyyy-MM-dd'),
                    end: format(end, 'yyyy-MM-dd'),
                };
            }
        }
    }

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

export interface OverspentInfo {
    daysAgo: number;
    total: number;
}

export function findOverspentInfo(budget: Budget, expenses: Expense[], currentDate: Date = new Date()): OverspentInfo | null {
    const window = getBudgetWindow(budget);
    if (!window) return null;

    const filtered = expenses
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
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningTotal = 0;
    for (const exp of filtered) {
        runningTotal += exp.amount;
        if (runningTotal > budget.limitAmount) {
            const overspentDate = startOfDay(parseISO(exp.date));
            const diffInMs = startOfDay(currentDate).getTime() - overspentDate.getTime();
            const daysAgo = Math.max(0, Math.floor(diffInMs / (1000 * 60 * 60 * 24)));
            return { daysAgo, total: runningTotal };
        }
    }
    return null;
}
