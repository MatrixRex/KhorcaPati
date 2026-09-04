import {
    type Expense,
    type Goal,
    type Loan,
    type Budget,
    type Category,
    type RecurringPayment,
    type Item,
} from '@/db/schema';

export function createMockExpense(overrides: Partial<Expense> = {}): Omit<Expense, 'id'> {
    return {
        parentId: null,
        isNested: false,
        amount: 100,
        type: 'expense',
        category: 'Food',
        date: '2026-06-15',
        note: 'Grocery store',
        isRecurring: false,
        recurringInterval: null,
        recurringNextDue: null,
        itemAutoTrack: false,
        tags: [],
        createdAt: '2026-06-15T10:00:00.000Z',
        updatedAt: '2026-06-15T10:00:00.000Z',
        ...overrides,
    };
}

export function createMockGoal(overrides: Partial<Goal> = {}): Omit<Goal, 'id'> {
    return {
        title: 'New Laptop',
        targetAmount: 50000,
        currentAmount: 0,
        deadline: '2026-12-31',
        note: 'Save for laptop',
        createdAt: '2026-06-01T10:00:00.000Z',
        updatedAt: '2026-06-01T10:00:00.000Z',
        isArchived: false,
        ...overrides,
    };
}

export function createMockLoan(overrides: Partial<Loan> = {}): Omit<Loan, 'id'> {
    return {
        person: 'John Doe',
        title: 'Office Loan',
        totalAmount: 0,
        currentAmount: 0,
        type: 'taken',
        dueDate: '2026-08-01',
        note: 'Emergency cash',
        createdAt: '2026-06-01T10:00:00.000Z',
        updatedAt: '2026-06-01T10:00:00.000Z',
        isArchived: false,
        ...overrides,
    };
}

export function createMockBudget(overrides: Partial<Budget> = {}): Omit<Budget, 'id'> {
    return {
        category: 'Food',
        limitAmount: 10000,
        alertThreshold: 0.8,
        createdAt: '2026-06-01T00:00:00.000Z',
        timelineType: 'recurring',
        recurringInterval: 'monthly',
        startDate: null,
        endDate: null,
        ...overrides,
    };
}

export function createMockCategory(overrides: Partial<Category> = {}): Omit<Category, 'id'> {
    return {
        name: 'Groceries',
        color: '#10b981',
        icon: 'ShoppingCart',
        isDefault: false,
        isSystem: false,
        ...overrides,
    };
}

export function createMockRecurringPayment(overrides: Partial<RecurringPayment> = {}): Omit<RecurringPayment, 'id'> {
    return {
        title: 'Wifi Internet',
        amount: 1200,
        type: 'expense',
        category: 'Bills',
        startDate: '2026-06-01',
        interval: 'monthly',
        nextDueDate: '2026-07-01',
        note: 'Fiber line',
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: '2026-06-01T00:00:00.000Z',
        ...overrides,
    };
}

export function createMockItem(overrides: Partial<Item> = {}): Omit<Item, 'id'> {
    return {
        expenseId: null,
        name: 'apple',
        rawInput: 'apple 1kg',
        qty: 1,
        unit: 'kg',
        date: '2026-06-15',
        note: '',
        createdAt: '2026-06-15T10:00:00.000Z',
        ...overrides,
    };
}
