import {
    format,
    isToday,
    isTomorrow,
    isYesterday,
    differenceInCalendarDays,
    parseISO,
    isValid
} from 'date-fns';

/**
 * Returns a human-readable string for a date (Today, Tomorrow, Yesterday, or formatted date).
 * @param dateStr ISO date string (yyyy-MM-dd) or Date object
 * @param includeYear Whether to include the year in the fallback format
 */
export function formatRelativeDate(dateStr: string | Date, includeYear = false): string {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;

    if (!isValid(date)) return 'Invalid Date';

    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';

    const fallbackFormat = includeYear ? 'MMM d, yyyy' : 'MMM d';
    return format(date, fallbackFormat);
}

/**
 * Returns a label like "in 3 days" or "5 days ago"
 */
export function getRelativeTimeLabel(dateStr: string | Date): string {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    const now = new Date();

    const diff = differenceInCalendarDays(date, now);

    if (diff === 0) return 'Due today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';

    if (diff > 0) return `in ${diff} days`;
    return `${Math.abs(diff)} days ago`;
}
