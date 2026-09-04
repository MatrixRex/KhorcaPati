import { describe, it, expect } from 'vitest';
import { db } from '@/db/schema';
import { importData, type BackupData } from './data-management';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';
import { createMockExpense, createMockGoal, createMockCategory } from '@/test/factories';

describe('Data Management & Backup Engine', () => {
    it('importData correctly restores Dexie tables, recalculates daily summaries, and updates stores', async () => {
        const testDate = '2026-06-25';
        const backup: BackupData = {
            version: 1,
            timestamp: '2026-06-25T12:00:00.000Z',
            dexie: {
                expenses: [
                    { ...createMockExpense({ id: 1, date: testDate, amount: 450, type: 'expense' }) }
                ],
                items: [],
                budgets: [],
                goals: [
                    { ...createMockGoal({ id: 1, title: 'Vacation', targetAmount: 20000 }) }
                ],
                loans: [],
                categories: [
                    { ...createMockCategory({ id: 1, name: 'General' }) }
                ],
                recurringPayments: []
            },
            settings: {
                initialBalance: 3500,
                language: 'en'
            },
            ui: {
                theme: 'dark',
                fontScale: 1.2
            }
        };

        const result = await importData(JSON.stringify(backup));
        expect(result).toBe(true);

        // Verify Dexie restored
        const expenses = await db.expenses.toArray();
        expect(expenses.length).toBe(1);
        expect(expenses[0].amount).toBe(450);

        const goals = await db.goals.toArray();
        expect(goals.length).toBe(1);
        expect(goals[0].title).toBe('Vacation');

        // Verify daily summary was automatically created for imported date
        const summary = await db.dailySummaries.get(testDate);
        expect(summary).toBeDefined();
        expect(summary?.expenseTotal).toBe(450);

        // Verify stores restored
        expect(useSettingsStore.getState().initialBalance).toBe(3500);
        expect(useSettingsStore.getState().language).toBe('en');
        expect(useUIStore.getState().theme).toBe('dark');
        expect(useUIStore.getState().fontScale).toBe(1.2);
    });

    it('importData throws error on corrupt or invalid backup JSON', async () => {
        // Invalid JSON string
        await expect(importData('{ not valid json }')).rejects.toThrow();

        // Missing dexie or settings keys
        await expect(importData(JSON.stringify({ version: 1 }))).rejects.toThrow('Invalid backup file');
    });
});
