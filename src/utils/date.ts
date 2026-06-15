import {
    isToday,
    isTomorrow,
    isYesterday,
    differenceInCalendarDays,
    parseISO,
    isValid
} from 'date-fns';
import i18next from 'i18next';

/**
 * Returns a human-readable string for a date (Today, Tomorrow, Yesterday, or formatted date).
 * @param dateStr ISO date string (yyyy-MM-dd) or Date object
 * @param includeYear Whether to include the year in the fallback format
 */
export function formatRelativeDate(dateStr: string | Date, includeYear = false): string {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;

    if (!isValid(date)) return i18next.t('invalidDate');

    if (isToday(date)) return i18next.t('today');
    if (isTomorrow(date)) return i18next.t('tomorrow');
    if (isYesterday(date)) return i18next.t('yesterday');

    return new Intl.DateTimeFormat(i18next.language, {
        month: 'short',
        day: 'numeric',
        year: includeYear ? '2-digit' : undefined
    }).format(date);
}


/**
 * Returns a label like "in 3 days" or "5 days ago"
 */
export function getRelativeTimeLabel(dateStr: string | Date): string {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    const now = new Date();

    const diff = differenceInCalendarDays(date, now);

    if (diff === 0) return i18next.t('dueToday');
    if (diff === 1) return i18next.t('tomorrow');
    if (diff === -1) return i18next.t('yesterday');

    if (diff > 0) return i18next.t('inDays', { count: diff });
    return i18next.t('daysAgo', { count: Math.abs(diff) });
}

export interface NearbyDateItem {
    date: Date;
    label: string;
    formattedValue: string; // yyyy-MM-dd
}

export function getNearbyDates(today: Date = new Date(), limit = 30): NearbyDateItem[] {
    const items: NearbyDateItem[] = [];
    for (let i = 0; i < limit; i++) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        let label = '';
        if (i === 0) {
            label = i18next.t('today');
        } else if (i === 1) {
            label = i18next.t('yesterday');
        } else {
            label = new Intl.DateTimeFormat(i18next.language, {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            }).format(d);
        }
        items.push({
            date: d,
            label,
            formattedValue: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        });
    }
    return items;
}
