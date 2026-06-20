export function getBillingCycleRange(today: Date, resetDate: number): { start: Date; end: Date } {
    const year = today.getFullYear();
    const month = today.getMonth();

    // Calculate candidate reset day for this month
    const daysInThisMonth = new Date(year, month + 1, 0).getDate();
    const actualResetDayThisMonth = Math.min(resetDate, daysInThisMonth);
    const startThisMonth = new Date(year, month, actualResetDayThisMonth, 0, 0, 0, 0);

    let start: Date;
    let end: Date;

    if (today >= startThisMonth) {
        start = startThisMonth;
        
        // Next cycle starts in next month
        const nextMonth = month + 1;
        const daysInNextMonth = new Date(year, nextMonth + 1, 0).getDate();
        const actualResetDayNextMonth = Math.min(resetDate, daysInNextMonth);
        end = new Date(year, nextMonth, actualResetDayNextMonth - 1, 23, 59, 59, 999);
    } else {
        // Cycle started in the previous month
        const prevMonth = month - 1;
        const daysInPrevMonth = new Date(year, prevMonth + 1, 0).getDate();
        const actualResetDayPrevMonth = Math.min(resetDate, daysInPrevMonth);
        start = new Date(year, prevMonth, actualResetDayPrevMonth, 0, 0, 0, 0);
        
        end = new Date(year, month, actualResetDayThisMonth - 1, 23, 59, 59, 999);
    }

    return { start, end };
}

export function getPreviousBillingCycleRange(today: Date, resetDate: number): { start: Date; end: Date } {
    const currentRange = getBillingCycleRange(today, resetDate);
    const oneDayBeforeStart = new Date(currentRange.start.getTime() - 86400000);
    return getBillingCycleRange(oneDayBeforeStart, resetDate);
}
