import { describe, it, expect } from 'vitest';
import { db } from '@/db/schema';
import { useBudgetStore } from './budgetStore';
import { createMockBudget } from '@/test/factories';

describe('Budget Store Business Logic', () => {
    it('supports full budget CRUD lifecycle', async () => {
        const store = useBudgetStore.getState();

        // 1. Create
        const id = await store.addBudget(createMockBudget({
            category: 'Dining',
            limitAmount: 4000,
            alertThreshold: 0.75
        }));
        expect(id).toBeDefined();

        let inDb = await db.budgets.get(id);
        expect(inDb?.category).toBe('Dining');
        expect(inDb?.limitAmount).toBe(4000);

        // 2. Update
        await store.updateBudget(id, { limitAmount: 5500, alertThreshold: 0.9 });
        inDb = await db.budgets.get(id);
        expect(inDb?.limitAmount).toBe(5500);
        expect(inDb?.alertThreshold).toBe(0.9);

        // 3. Delete
        await store.deleteBudget(id);
        expect(await db.budgets.get(id)).toBeUndefined();
    });
});
