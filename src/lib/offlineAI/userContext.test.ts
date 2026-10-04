import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/schema';
import { useSettingsStore } from '@/stores/settingsStore';
import { createMockCategory, createMockExpense } from '@/test/factories';
import { loadUserCategoryContext } from './userContext';

describe('loadUserCategoryContext', () => {
    beforeEach(() => {
        useSettingsStore.setState({ categoryPreferences: { fan: 'House' }, deletedCategories: ['Shopping'] });
    });

    it('collects categories, newest-first history with types, preferences and deleted categories', async () => {
        await db.categories.bulkAdd([createMockCategory({ name: 'Food' }), createMockCategory({ name: 'House' })]);
        await db.expenses.bulkAdd([
            createMockExpense({ note: 'old bazar', category: 'Food' }),
            createMockExpense({ title: 'Client', note: 'client payment', category: 'Freelance', type: 'income' }),
        ]);

        const ctx = await loadUserCategoryContext();

        expect(ctx.userCategories).toEqual(['Food', 'House']);
        expect(ctx.history).toEqual([
            { text: 'Client', category: 'Freelance', type: 'income' },
            { text: 'old bazar', category: 'Food', type: 'expense' },
        ]);
        expect(ctx.preferences).toEqual({ fan: 'House' });
        expect(ctx.deletedCategories).toEqual(['Shopping']);
    });

    it('limits history to the most recent expenses and skips ones without text', async () => {
        await db.expenses.bulkAdd([
            createMockExpense({ note: '', title: undefined }),
            ...Array.from({ length: 5 }, (_, i) => createMockExpense({ note: `item ${i}` })),
        ]);
        const ctx = await loadUserCategoryContext({ historyLimit: 3 });
        expect(ctx.history.map(h => h.text)).toEqual(['item 4', 'item 3', 'item 2']);
    });
});
