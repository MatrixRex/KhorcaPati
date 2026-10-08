import { parseISO } from 'date-fns';
import { db } from '@/db/schema';
import { useSettingsStore } from '@/stores/settingsStore';

/** Whether a monthly budget's start date falls on `day` (or the month's last day when `day` is past it). */
function startsOnDay(startDate: string, day: number): boolean {
    const date = parseISO(startDate);
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return date.getDate() === Math.min(day, daysInMonth);
}

/**
 * After the reset date changes, monthly budgets that started on the old reset day stop keeping their own
 * start date and follow the reset date from then on (see getBudgetWindow). Budgets set to another day keep
 * it. Returns how many budgets changed.
 */
export async function syncBudgetsToResetDate(): Promise<number> {
    const { resetDate, budgetResetDay, setBudgetResetDay } = useSettingsStore.getState();
    // Before this sync existed the reset date always started at its default, the 1st.
    const previous = budgetResetDay ?? 1;
    if (previous === resetDate) {
        if (budgetResetDay === undefined) setBudgetResetDay(resetDate);
        return 0;
    }

    const following = (await db.budgets.toArray()).filter(b =>
        b.id !== undefined &&
        b.timelineType === 'recurring' &&
        b.recurringInterval === 'monthly' &&
        b.startDate &&
        startsOnDay(b.startDate, previous));
    await Promise.all(following.map(b => db.budgets.update(b.id!, { startDate: null })));

    setBudgetResetDay(resetDate);
    return following.length;
}

/**
 * Syncs once now and again after each reset date change. Waits until the slider stops moving, so a drag
 * from 1 to 15 does not sweep up budgets set to days in between.
 */
export function watchResetDateForBudgets(delayMs = 1500): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () => { syncBudgetsToResetDate().catch(err => console.error('Budget reset sync failed', err)); };
    run();
    const unsubscribe = useSettingsStore.subscribe((state, prev) => {
        if (state.resetDate === prev.resetDate) return;
        clearTimeout(timer);
        timer = setTimeout(run, delayMs);
    });
    return () => {
        clearTimeout(timer);
        unsubscribe();
    };
}
