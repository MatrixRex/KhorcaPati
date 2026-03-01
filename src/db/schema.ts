import Dexie, { type EntityTable } from 'dexie';

export interface Expense {
    id?: number;
    parentId: number | null;      // null = top-level; set = sub-expense
    title?: string;
    amount: number;
    category: string;
    date: string;                 // ISO 8601
    note: string;
    isRecurring: boolean;
    recurringInterval: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
    recurringNextDue: string | null;
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

export interface Budget {
    id?: number;
    category: string;
    month: string;                // "YYYY-MM"
    limitAmount: number;
    alertThreshold: number;       // e.g. 0.8 = alert at 80%
    createdAt: string;
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

export interface Category {
    id?: number;
    name: string;
    color: string;                // hex color
    icon: string;                 // lucide icon name
    isDefault: boolean;
}

const db = new Dexie('KhorocaPatiDB') as Dexie & {
    expenses: EntityTable<Expense, 'id'>;
    items: EntityTable<Item, 'id'>;
    budgets: EntityTable<Budget, 'id'>;
    goals: EntityTable<Goal, 'id'>;
    categories: EntityTable<Category, 'id'>;
};

// Schema declaration
db.version(3).stores({
    expenses: '++id, parentId, date, category, isRecurring',
    items: '++id, expenseId, name, date',
    budgets: '++id, category, month',
    goals: '++id, createdAt',
    categories: '++id, name, isDefault'
});

export { db };
