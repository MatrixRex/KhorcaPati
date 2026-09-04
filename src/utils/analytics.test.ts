import { describe, it, expect } from 'vitest';
import { calculateReportAnalytics } from './analytics';
import { type Expense, type Category } from '@/db/schema';

describe('Analytics Calculations Engine', () => {
    const mockCategories: Category[] = [
        { id: 1, name: 'Food', color: '#10b981', icon: 'Utensils', isDefault: false, isSystem: false },
        { id: 2, name: 'Transport', color: '#3b82f6', icon: 'Car', isDefault: false, isSystem: false },
        { id: 3, name: 'Salary', color: '#22c55e', icon: 'Briefcase', isDefault: false, isSystem: false },
    ];

    it('calculates totals, category distribution, and running timeline balance correctly', () => {
        const expenses: Expense[] = [
            // Transaction before interval (contributes to prior balance)
            {
                id: 1,
                parentId: null,
                isNested: false,
                amount: 5000,
                type: 'income',
                category: 'Salary',
                date: '2026-05-30',
                note: '',
                isRecurring: false,
                recurringInterval: null,
                recurringNextDue: null,
                itemAutoTrack: false,
                tags: [],
                createdAt: '2026-05-30T00:00:00.000Z',
                updatedAt: '2026-05-30T00:00:00.000Z'
            },
            // Inside interval:
            {
                id: 2,
                parentId: null,
                isNested: false,
                amount: 300,
                type: 'expense',
                category: 'Food',
                date: '2026-06-02',
                note: '',
                isRecurring: false,
                recurringInterval: null,
                recurringNextDue: null,
                itemAutoTrack: false,
                tags: [],
                createdAt: '2026-06-02T00:00:00.000Z',
                updatedAt: '2026-06-02T00:00:00.000Z'
            },
            {
                id: 3,
                parentId: null,
                isNested: false,
                amount: 200,
                type: 'expense',
                category: 'Food',
                date: '2026-06-02',
                note: '',
                isRecurring: false,
                recurringInterval: null,
                recurringNextDue: null,
                itemAutoTrack: false,
                tags: [],
                createdAt: '2026-06-02T00:00:00.000Z',
                updatedAt: '2026-06-02T00:00:00.000Z'
            },
            {
                id: 4,
                parentId: null,
                isNested: false,
                amount: 150,
                type: 'expense',
                category: 'Transport',
                date: '2026-06-05',
                note: '',
                isRecurring: false,
                recurringInterval: null,
                recurringNextDue: null,
                itemAutoTrack: false,
                tags: [],
                createdAt: '2026-06-05T00:00:00.000Z',
                updatedAt: '2026-06-05T00:00:00.000Z'
            },
            {
                id: 5,
                parentId: null,
                isNested: false,
                amount: 2000,
                type: 'income',
                category: 'Salary',
                date: '2026-06-10',
                note: '',
                isRecurring: false,
                recurringInterval: null,
                recurringNextDue: null,
                itemAutoTrack: false,
                tags: [],
                createdAt: '2026-06-10T00:00:00.000Z',
                updatedAt: '2026-06-10T00:00:00.000Z'
            },
            // After interval (should be ignored):
            {
                id: 6,
                parentId: null,
                isNested: false,
                amount: 999,
                type: 'expense',
                category: 'Food',
                date: '2026-07-01',
                note: '',
                isRecurring: false,
                recurringInterval: null,
                recurringNextDue: null,
                itemAutoTrack: false,
                tags: [],
                createdAt: '2026-07-01T00:00:00.000Z',
                updatedAt: '2026-07-01T00:00:00.000Z'
            }
        ];

        const result = calculateReportAnalytics({
            expenses,
            startDate: new Date('2026-06-01T00:00:00.000Z'),
            endDate: new Date('2026-06-30T23:59:59.999Z'),
            initialBalance: 1000,
            categoryList: mockCategories,
            language: 'en',
            incomeLabel: 'Income'
        });

        expect(result.totalExpense).toBe(650); // 300 + 200 + 150
        expect(result.totalIncome).toBe(2000);

        // Category breakdown
        expect(result.categoryData).toEqual([
            { name: 'Food', value: 500, fill: '#10b981' },
            { name: 'Transport', value: 150, fill: '#3b82f6' }
        ]);

        expect(result.incomeCategoryData).toEqual([
            { name: 'Salary', value: 2000, fill: '#22c55e' }
        ]);

        // Prior balance = initialBalance (1000) + beforeRange income (5000) = 6000
        expect(result.timelineData.length).toBe(3); // 3 distinct dates in June
        expect(result.timelineData[0].runningBalance).toBe(6000 - 500); // 5500 after June 2
        expect(result.timelineData[1].runningBalance).toBe(5500 - 150); // 5350 after June 5
        expect(result.timelineData[2].runningBalance).toBe(5350 + 2000); // 7350 after June 10

        // Sankey structure
        expect(result.sankeyData.nodes[0].name).toBe('Income');
        expect(result.sankeyData.links.length).toBe(2);
    });

    it('handles empty data sets safely without errors', () => {
        const result = calculateReportAnalytics({
            expenses: [],
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-30'),
            initialBalance: 500,
        });

        expect(result.totalIncome).toBe(0);
        expect(result.totalExpense).toBe(0);
        expect(result.categoryData).toEqual([]);
        expect(result.incomeCategoryData).toEqual([]);
        expect(result.timelineData).toEqual([]);
        expect(result.sankeyData.links).toEqual([]);
    });
});
