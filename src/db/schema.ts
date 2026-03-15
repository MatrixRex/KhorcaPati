import Dexie, { type EntityTable } from 'dexie';

export interface Expense {
    id?: number;
    parentId: number | null;      // null = top-level; set = sub-expense
    isNested: boolean;            // true = parent record with sub-records
    goalId?: number | null;       // link to a savings goal
    loanId?: number | null;       // link to a loan
    title?: string;
    amount: number;
    type: 'expense' | 'income';
    category: string;
    date: string;                 // ISO 8601
    note: string;
    isRecurring: boolean;
    recurringInterval: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
    recurringNextDue: string | null;
    itemAutoTrack: boolean;       // new: toggle to auto-track items from note
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

export interface Item {
    id?: number;
    expenseId: number | null;     // optional link to parent expense
    name: string;                 // normalized name e.g. "oil"
    rawInput: string;             // original string e.g. "Oil 1L"
    qty: number;
    unit: string;                 // "L", "kg", "pcs", "dozen", etc.
    date: string;
    note: string;
    createdAt: string;
}

export type BudgetTimelineType = 'recurring' | 'range';
export type BudgetRecurringInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Budget {
    id?: number;
    category: string;
    limitAmount: number;
    alertThreshold: number;       // e.g. 0.8 = alert at 80%
    createdAt: string;
    // Timeline mode
    timelineType: BudgetTimelineType;
    // Recurring mode
    recurringInterval: BudgetRecurringInterval | null; // daily | weekly | monthly | yearly
    // Range mode
    startDate: string | null;    // "YYYY-MM-DD"
    endDate: string | null;      // "YYYY-MM-DD"
}

export interface Goal {
    id?: number;
    title: string;
    targetAmount: number;
    currentAmount: number;
    deadline: string | null;
    note: string;
    createdAt: string;
    updatedAt: string;
}

export interface Loan {
    id?: number;
    person: string;
    title: string;
    totalAmount: number;
    currentAmount: number;   // Amount paid back (for taken) or received back (for given)
    type: 'taken' | 'given'; // 'taken' = borrowed from someone, 'given' = lent to someone
    dueDate: string | null;
    note: string;
    createdAt: string;
    updatedAt: string;
}

export interface Category {
    id?: number;
    name: string;
    color: string;                // hex color
    icon: string;                 // lucide icon name
    isDefault: boolean;
}

export interface RecurringPayment {
    id?: number;
    title: string;
    amount: number;
    type: 'expense' | 'income';
    category: string;
    startDate: string;                 // ISO 8601
    interval: 'one-time' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    nextDueDate: string;               // ISO 8601
    note: string;
    createdAt: string;
    updatedAt: string;
}

const db = new Dexie('KhorocaPatiDB') as Dexie & {
    expenses: EntityTable<Expense, 'id'>;
    items: EntityTable<Item, 'id'>;
    budgets: EntityTable<Budget, 'id'>;
    goals: EntityTable<Goal, 'id'>;
    loans: EntityTable<Loan, 'id'>;
    categories: EntityTable<Category, 'id'>;
    recurringPayments: EntityTable<RecurringPayment, 'id'>;
};

// Schema declaration
db.version(3).stores({
    expenses: '++id, parentId, date, category, isRecurring',
    items: '++id, expenseId, name, date',
    budgets: '++id, category, month',
    goals: '++id, createdAt',
    categories: '++id, name, isDefault'
});

db.version(4).stores({
    expenses: '++id, parentId, date, category, isRecurring',
    items: '++id, expenseId, name, date',
    budgets: '++id, category, timelineType, recurringInterval',
    goals: '++id, createdAt',
    categories: '++id, name, isDefault'
}).upgrade((tx) => {
    return tx.table('budgets').toCollection().modify((budget: Budget & { month?: string }) => {
        if (!budget.timelineType) {
            budget.timelineType = 'recurring';
            budget.recurringInterval = 'monthly';
            budget.startDate = null;
            budget.endDate = null;
        }
    });
});

db.version(5).stores({
    expenses: '++id, parentId, date, category, isRecurring',
    items: '++id, expenseId, name, date',
    budgets: '++id, category, timelineType, recurringInterval',
    goals: '++id, createdAt',
    categories: '++id, name, isDefault',
    recurringPayments: '++id, title, nextDueDate, category'
});

db.version(6).stores({
    expenses: '++id, parentId, date, category, isRecurring, type',
    items: '++id, expenseId, name, date',
    budgets: '++id, category, timelineType, recurringInterval',
    goals: '++id, createdAt',
    categories: '++id, name, isDefault',
    recurringPayments: '++id, title, nextDueDate, category, type'
}).upgrade((tx) => {
    tx.table('expenses').toCollection().modify((expense: Expense) => {
        if (!expense.type) expense.type = 'expense';
    });
    tx.table('recurringPayments').toCollection().modify((payment: RecurringPayment) => {
        if (!payment.type) payment.type = 'expense';
    });
});

db.version(7).stores({
    expenses: '++id, parentId, isNested, date, category, isRecurring, type',
    items: '++id, expenseId, name, date',
    budgets: '++id, category, timelineType, recurringInterval',
    goals: '++id, createdAt',
    categories: '++id, name, isDefault',
    recurringPayments: '++id, title, nextDueDate, category, type'
}).upgrade((tx) => {
    tx.table('expenses').toCollection().modify((expense: Expense) => {
        if (expense.isNested === undefined) expense.isNested = false;
    });
});

db.version(8).stores({
    expenses: '++id, parentId, isNested, date, category, isRecurring, type',
    items: '++id, expenseId, name, date',
    budgets: '++id, category, timelineType, recurringInterval',
    goals: '++id, createdAt',
    categories: '++id, &name, isDefault',
    recurringPayments: '++id, title, nextDueDate, category, type'
}).upgrade(async (tx) => {
    // Clean up duplicate categories before applying unique index
    const cats = await tx.table('categories').toArray();
    const seen = new Set();
    const toDelete: number[] = [];
    for (const cat of cats) {
        const normalized = cat.name.toLowerCase().trim();
        if (seen.has(normalized)) {
            if (cat.id) toDelete.push(cat.id);
        } else {
            seen.add(normalized);
        }
    }
    if (toDelete.length > 0) {
        await tx.table('categories').bulkDelete(toDelete);
    }
});

db.version(10).stores({
    expenses: '++id, parentId, isNested, goalId, date, category, isRecurring, type',
    items: '++id, expenseId, name, date',
    budgets: '++id, category, timelineType, recurringInterval',
    goals: '++id, createdAt',
    categories: '++id, &name, isDefault',
    recurringPayments: '++id, title, nextDueDate, category, type'
}).upgrade(async () => {
    // Drop goalLogs table if possible, though Dexie handles versioning mostly by schema.
    // We just won't include it in version 10 schema.
});

db.version(11).stores({
    expenses: '++id, parentId, isNested, goalId, date, category, isRecurring, type, itemAutoTrack',
    items: '++id, expenseId, name, date',
    budgets: '++id, category, timelineType, recurringInterval',
    goals: '++id, createdAt',
    categories: '++id, &name, isDefault',
    recurringPayments: '++id, title, nextDueDate, category, type'
}).upgrade((tx) => {
    return tx.table('expenses').toCollection().modify((expense: Expense) => {
        if (expense.itemAutoTrack === undefined) expense.itemAutoTrack = true;
    });
});

db.version(12).stores({
    expenses: '++id, parentId, isNested, goalId, loanId, date, category, isRecurring, type, itemAutoTrack',
    items: '++id, expenseId, name, date',
    budgets: '++id, category, timelineType, recurringInterval',
    goals: '++id, createdAt',
    loans: '++id, createdAt, type, person',
    categories: '++id, &name, isDefault',
    recurringPayments: '++id, title, nextDueDate, category, type'
});

export { db };
