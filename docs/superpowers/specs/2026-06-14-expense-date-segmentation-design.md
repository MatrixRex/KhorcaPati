# Expense Date Segmentation Design

We want to group and segment the expenses list by date on the Expenses page (`p:expenses`), rendering a styled divider showing the date and the pre-calculated daily totals for income and expenses. This data must be pre-calculated and stored in the database, updating reactively on any mutations.

## Database Schema updates (`src/db/schema.ts`)

We will add a new table `dailySummaries` in Dexie DB.

```typescript
export interface DailySummary {
    date: string; // YYYY-MM-DD
    expenseTotal: number;
    incomeTotal: number;
}
```

We will increment Dexie's schema version to `14`:
```typescript
db.version(14).stores({
    expenses: '++id, parentId, isNested, goalId, loanId, date, category, isRecurring, type, itemAutoTrack',
    items: '++id, expenseId, name, date',
    budgets: '++id, category, timelineType, recurringInterval',
    goals: '++id, createdAt, isArchived',
    loans: '++id, createdAt, type, person, isArchived',
    categories: '++id, &name, isDefault',
    recurringPayments: '++id, title, nextDueDate, category, type',
    dailySummaries: '&date'
}).upgrade(async (tx) => {
    const expenses = await tx.table('expenses').toArray();
    const summaries: Record<string, { expenseTotal: number; incomeTotal: number }> = {};
    for (const exp of expenses) {
        if (exp.parentId) continue;
        const d = exp.date;
        if (!summaries[d]) {
            summaries[d] = { expenseTotal: 0, incomeTotal: 0 };
        }
        if (exp.type === 'expense') {
            summaries[d].expenseTotal += exp.amount;
        } else {
            summaries[d].incomeTotal += exp.amount;
        }
    }
    for (const [date, totals] of Object.entries(summaries)) {
        await tx.table('dailySummaries').put({
            date,
            expenseTotal: totals.expenseTotal,
            incomeTotal: totals.incomeTotal
        });
    }
});
```

## Daily Summary Recalculation logic

We define a helper function `recalculateDailySummary(dateStr: string)`:
```typescript
export async function recalculateDailySummary(dateStr: string): Promise<void> {
    const topLevelExpenses = await db.expenses
        .where('date')
        .equals(dateStr)
        .filter(e => !e.parentId)
        .toArray();

    const expenseTotal = topLevelExpenses
        .filter(e => e.type === 'expense')
        .reduce((sum, e) => sum + e.amount, 0);

    const incomeTotal = topLevelExpenses
        .filter(e => e.type === 'income')
        .reduce((sum, e) => sum + e.amount, 0);

    if (expenseTotal === 0 && incomeTotal === 0) {
        await db.dailySummaries.delete(dateStr);
    } else {
        await db.dailySummaries.put({
            date: dateStr,
            expenseTotal,
            incomeTotal
        });
    }
}
```

### Hook points for mutation:
- **`addExpense`** in `expenseStore.ts`: Run `recalculateDailySummary(expense.date)` after write.
- **`updateExpense`** in `expenseStore.ts`: Retrieve the old record's date. Perform the update, then retrieve the new date. Recalculate for both old date and new date.
- **`deleteExpense`** in `expenseStore.ts`: Capture the record's date before deletion. Perform the deletion (and sub-expense deletions), then recalculate for the date.
- **`handleUngroup`** in `ExpenseForm.tsx`: Capture sub-expense dates and the parent date, then run recalculations after the transaction commits.
- **`importData`** in `data-management.ts`: Clear `dailySummaries` table, insert imported expenses, and trigger recalculations for all unique dates.

## UI Presentation (`src/components/expenses/ExpenseList.tsx`)

Retrieve `dailySummaries` using `useLiveQuery`. In `ExpenseList`, only when `expenseSortBy === 'latest'`:
- Group rendered cards by date.
- Between each date group, render a small styled divider:
  - Format date using `formatRelativeDate(date, true)`.
  - Look up totals in the pre-calculated `dailySummaries` mapping.
  - Display `+৳{incomeTotal}` in success green, and `-৳{expenseTotal}` in destructive red.
