import { useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { calcSpent, budgetPeriodKey } from '@/utils/budgetWindow';
import { getNotified, markNotified, fireNotification } from '@/utils/notifications';

/**
 * Runs in the background and fires a local Web Notification when:
 * - Spending crosses the alert threshold for a budget (e.g. 80%)
 * - Spending exceeds the budget limit (overspend)
 *
 * Each alert fires at most once per budget per period (tracked in localStorage).
 */
export function useBudgetNotifications() {
    const budgets = useLiveQuery(() => db.budgets.toArray());
    const expenses = useLiveQuery(() => db.expenses.toArray());

    // Keep a ref so the effect can always read the latest values without re-running unnecessarily
    const dataRef = useRef({ budgets, expenses });
    dataRef.current = { budgets, expenses };

    useEffect(() => {
        if (!budgets || !expenses) return;
        if (Notification.permission !== 'granted') return;

        for (const budget of budgets) {
            const spent = calcSpent(budget, expenses);
            const period = budgetPeriodKey(budget);
            const ratio = spent / budget.limitAmount;
            const thresholdKey = `${budget.id}_${period}_threshold`;
            const overKey = `${budget.id}_${period}_over`;
            const notified = getNotified();

            // --- Over-budget alert (highest priority) ---
            if (ratio >= 1 && !notified.has(overKey)) {
                fireNotification(
                    `🚨 Over Budget: ${budget.category}`,
                    `You've spent ৳${spent.toFixed(0)} — that's ৳${(spent - budget.limitAmount).toFixed(0)} over your ৳${budget.limitAmount.toFixed(0)} limit.`
                );
                markNotified(overKey);
                // Also mark threshold as done so we don't double-fire
                markNotified(thresholdKey);
            }

            // --- Alert-threshold notification ---
            else if (ratio >= budget.alertThreshold && ratio < 1 && !notified.has(thresholdKey)) {
                const pct = Math.round(ratio * 100);
                fireNotification(
                    `⚠️ Budget Alert: ${budget.category}`,
                    `You've used ${pct}% of your ৳${budget.limitAmount.toFixed(0)} budget. ৳${(budget.limitAmount - spent).toFixed(0)} remaining.`
                );
                markNotified(thresholdKey);
            }
        }
    }, [budgets, expenses]);
}
