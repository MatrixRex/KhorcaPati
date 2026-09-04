import { describe, it, expect } from 'vitest';
import { db } from '@/db/schema';
import { useRecurringPaymentStore } from './recurringPaymentStore';
import { createMockRecurringPayment } from '@/test/factories';

describe('Recurring Payment Store Business Logic', () => {
    it('supports full recurring payment CRUD lifecycle', async () => {
        const store = useRecurringPaymentStore.getState();

        // 1. Create
        const id = await store.addRecurringPayment(createMockRecurringPayment({
            title: 'Netflix Subscription',
            amount: 1500,
            interval: 'monthly',
            nextDueDate: '2026-07-01'
        }));
        expect(id).toBeDefined();

        let inDb = await db.recurringPayments.get(id!);
        expect(inDb?.title).toBe('Netflix Subscription');
        expect(inDb?.amount).toBe(1500);

        // 2. Update
        await store.updateRecurringPayment(id!, { amount: 1800, nextDueDate: '2026-08-01' });
        inDb = await db.recurringPayments.get(id!);
        expect(inDb?.amount).toBe(1800);
        expect(inDb?.nextDueDate).toBe('2026-08-01');

        // 3. Delete
        await store.deleteRecurringPayment(id!);
        expect(await db.recurringPayments.get(id!)).toBeUndefined();
    });
});
