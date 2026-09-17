import { describe, it, expect } from 'vitest';
import { db } from '@/db/schema';
import { useCategoryStore } from './categoryStore';
import { createMockExpense } from '@/test/factories';

describe('Category Store Business Logic', () => {
    it('ensureDefaultCategory ensures "Unlisted", "Lent", and "Borrowed" system categories exist', async () => {
        const store = useCategoryStore.getState();
        await store.ensureDefaultCategory();

        const cats = await db.categories.toArray();
        const unlisted = cats.find(c => c.name === 'Unlisted');
        const lent = cats.find(c => c.name === 'Lent');
        const borrowed = cats.find(c => c.name === 'Borrowed');

        expect(unlisted).toBeDefined();
        expect(unlisted?.isDefault).toBe(true);
        expect(unlisted?.isSystem).toBe(true);

        expect(lent).toBeDefined();
        expect(lent?.isSystem).toBe(true);

        expect(borrowed).toBeDefined();
        expect(borrowed?.isSystem).toBe(true);
    });

    it('addCategory creates category and prevents case-insensitive duplicates by returning existing id', async () => {
        const store = useCategoryStore.getState();

        const id1 = await store.addCategory('Groceries', '#10b981', 'ShoppingBag');
        expect(id1).toBeDefined();

        // Adding 'groceries ' (same name different case and space) should return existing id1 without creating duplicate
        const id2 = await store.addCategory('groceries ', '#3b82f6', 'Tag');
        expect(id2).toBe(id1);

        const all = await db.categories.where('name').equalsIgnoreCase('Groceries').toArray();
        expect(all.length).toBe(1);
    });

    it('deleteCategory migrates existing expenses to target category when migrateToId is provided', async () => {
        const store = useCategoryStore.getState();

        const cat1Id = await store.addCategory('Old Category', '#ef4444', 'Tag');
        const cat2Id = await store.addCategory('New Target Category', '#10b981', 'Tag');

        // Add expense in Old Category
        const expId = (await db.expenses.add(createMockExpense({
            category: 'Old Category',
            amount: 200
        }))) as number;

        // Delete Old Category and migrate expenses to New Target Category
        await store.deleteCategory(cat1Id, cat2Id);

        // Verify Old Category is deleted
        expect(await db.categories.get(cat1Id)).toBeUndefined();

        // Verify expense was migrated to New Target Category
        const exp = await db.expenses.get(expId);
        expect(exp?.category).toBe('New Target Category');
    });

    it('deleteCategory migrates expenses, budgets, and recurring payments case-insensitively and updates settingsStore', async () => {
        const store = useCategoryStore.getState();

        const catId = await store.addCategory('Fast Food', '#ef4444', 'Tag');
        const targetId = await store.addCategory('Food & Dining', '#10b981', 'Tag');

        // Add expense with slight case difference
        const expId = (await db.expenses.add(createMockExpense({
            category: 'fast food',
            amount: 150
        }))) as number;

        // Add budget
        const budgetId = (await db.budgets.add({
            category: 'Fast Food',
            limitAmount: 5000,
            alertThreshold: 0.8,
            createdAt: new Date().toISOString(),
            timelineType: 'recurring',
            recurringInterval: 'monthly',
            startDate: null,
            endDate: null
        })) as number;

        // Add recurring payment
        const recId = (await db.recurringPayments.add({
            title: 'Weekly Burger Meal',
            amount: 500,
            type: 'expense',
            category: 'fast food',
            startDate: '2026-08-01',
            interval: 'weekly',
            nextDueDate: '2026-08-25',
            note: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        })) as number;

        // Learn preference
        const { learnCategoryPreference } = (await import('@/stores/settingsStore')).useSettingsStore.getState();
        learnCategoryPreference('whopper', 'Fast Food');

        await store.deleteCategory(catId, targetId);

        // Verify expense was migrated despite lowercase
        const exp = await db.expenses.get(expId);
        expect(exp?.category).toBe('Food & Dining');

        // Verify budget was migrated
        const budget = await db.budgets.get(budgetId);
        expect(budget?.category).toBe('Food & Dining');

        // Verify recurring payment was migrated
        const rec = await db.recurringPayments.get(recId);
        expect(rec?.category).toBe('Food & Dining');

        // Verify settingsStore marked it as deleted and migrated preferences
        const settings = (await import('@/stores/settingsStore')).useSettingsStore.getState();
        expect(settings.deletedCategories).toContain('Fast Food');
        expect(settings.categoryPreferences['whopper']).toBe('Food & Dining');
    });

    it('updateCategory renames recurring payments and preferences in settingsStore', async () => {
        const store = useCategoryStore.getState();

        const catId = await store.addCategory('Snacks', '#f59e0b', 'Tag');

        const recId = (await db.recurringPayments.add({
            title: 'Coffee Beans Sub',
            amount: 800,
            type: 'expense',
            category: 'Snacks',
            startDate: '2026-08-01',
            interval: 'monthly',
            nextDueDate: '2026-09-01',
            note: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        })) as number;

        const { learnCategoryPreference } = (await import('@/stores/settingsStore')).useSettingsStore.getState();
        learnCategoryPreference('latte', 'Snacks');

        await store.updateCategory(catId, { name: 'Refreshments' });

        const rec = await db.recurringPayments.get(recId);
        expect(rec?.category).toBe('Refreshments');

        const settings = (await import('@/stores/settingsStore')).useSettingsStore.getState();
        expect(settings.categoryPreferences['latte']).toBe('Refreshments');
    });
});

