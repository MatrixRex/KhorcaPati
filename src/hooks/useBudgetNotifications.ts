import { useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { calcSpent, budgetPeriodKey } from '@/utils/budgetWindow';

const STORAGE_KEY = 'kp_budget_notified';

/** Retrieve the set of already-fired notification keys from localStorage. */
function getNotified(): Set<string> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch {
        return new Set();
    }
}

function markNotified(key: string) {
    const set = getNotified();
    set.add(key);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

function fire(title: string, body: string) {
    if (Notification.permission !== 'granted') return;
    try {
        new Notification(title, {
            body,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: title,          // collapse duplicate titles
            renotify: false,
        });
    } catch (err) {
        console.warn('Notification failed:', err);
    }
}

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
                fire(
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
                fire(
                    `⚠️ Budget Alert: ${budget.category}`,
                    `You've used ${pct}% of your ৳${budget.limitAmount.toFixed(0)} budget. ৳${(budget.limitAmount - spent).toFixed(0)} remaining.`
                );
                markNotified(thresholdKey);
            }
        }
    }, [budgets, expenses]);
}
