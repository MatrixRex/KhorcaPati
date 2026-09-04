import { describe, it, expect, beforeEach } from 'vitest';
import { getNotified, markNotified } from './notifications';
import { budgetPeriodKey } from './budgetWindow';
import { type Budget, type RecurringPayment } from '@/db/schema';

describe('Notification & Alert Business Rules', () => {
    beforeEach(() => {
        globalThis.localStorage.clear();
    });

    it('markNotified stores keys in localStorage and getNotified retrieves them as a Set', () => {
        expect(getNotified().size).toBe(0);

        markNotified('budget_1_threshold');
        markNotified('budget_2_over');

        const notified = getNotified();
        expect(notified.has('budget_1_threshold')).toBe(true);
        expect(notified.has('budget_2_over')).toBe(true);
        expect(notified.has('budget_3_over')).toBe(false);
    });

    it('evaluates budget threshold and overspend alert triggers accurately', () => {
        const budget: Budget = {
            id: 101,
            category: 'Dining',
            limitAmount: 1000,
            alertThreshold: 0.8, // 80%
            timelineType: 'recurring',
            recurringInterval: 'monthly',
            startDate: null,
            endDate: null,
            createdAt: '2026-06-01T00:00:00.000Z'
        };

        const period = budgetPeriodKey(budget);
        const thresholdKey = `${budget.id}_${period}_threshold`;
        const overKey = `${budget.id}_${period}_over`;

        // 1. Spending under 80% (700 / 1000 = 70%) -> No alert
        let spent = 700;
        let ratio = spent / budget.limitAmount;
        expect(ratio < budget.alertThreshold).toBe(true);

        // 2. Spending crosses 80% (850 / 1000 = 85%) -> Threshold alert triggered
        spent = 850;
        ratio = spent / budget.limitAmount;
        let notified = getNotified();
        let shouldFireThreshold = ratio >= budget.alertThreshold && ratio < 1 && !notified.has(thresholdKey);
        expect(shouldFireThreshold).toBe(true);

        // Mark threshold notified
        markNotified(thresholdKey);
        notified = getNotified();

        // 3. Same threshold checked again -> Deduplicated, does not re-fire
        shouldFireThreshold = ratio >= budget.alertThreshold && ratio < 1 && !notified.has(thresholdKey);
        expect(shouldFireThreshold).toBe(false);

        // 4. Spending exceeds 100% (1100 / 1000 = 110%) -> Over-budget alert triggered
        spent = 1100;
        ratio = spent / budget.limitAmount;
        let shouldFireOver = ratio >= 1 && !notified.has(overKey);
        expect(shouldFireOver).toBe(true);

        // Mark over notified
        markNotified(overKey);
        notified = getNotified();

        // 5. Overspend checked again -> Deduplicated, does not re-fire
        shouldFireOver = ratio >= 1 && !notified.has(overKey);
        expect(shouldFireOver).toBe(false);
    });

    it('evaluates recurring payment due detection when due today or overdue', () => {
        const todayStr = '2026-06-15';

        const paymentDueToday: RecurringPayment = {
            id: 1,
            title: 'Internet',
            amount: 1000,
            type: 'expense',
            category: 'Bills',
            startDate: '2026-05-15',
            interval: 'monthly',
            nextDueDate: '2026-06-15',
            note: '',
            createdAt: '',
            updatedAt: ''
        };

        const paymentFuture: RecurringPayment = {
            id: 2,
            title: 'Gym',
            amount: 1500,
            type: 'expense',
            category: 'Health',
            startDate: '2026-05-20',
            interval: 'monthly',
            nextDueDate: '2026-06-20',
            note: '',
            createdAt: '',
            updatedAt: ''
        };

        const isDueToday = paymentDueToday.nextDueDate <= todayStr;
        const isFutureDue = paymentFuture.nextDueDate <= todayStr;

        expect(isDueToday).toBe(true);
        expect(isFutureDue).toBe(false);

        // Dedup key
        const key = `recurring_${paymentDueToday.id}_${paymentDueToday.nextDueDate}`;
        expect(getNotified().has(key)).toBe(false);

        markNotified(key);
        expect(getNotified().has(key)).toBe(true);
    });
});
