import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';
import { db } from '@/db/schema';

// Mock localStorage if in node environment without native window.localStorage
if (typeof window === 'undefined' || !window.localStorage) {
    const storage: Record<string, string> = {};
    const localStorageMock = {
        getItem: (key: string) => storage[key] ?? null,
        setItem: (key: string, value: string) => {
            storage[key] = value.toString();
        },
        removeItem: (key: string) => {
            delete storage[key];
        },
        clear: () => {
            for (const key of Object.keys(storage)) {
                delete storage[key];
            }
        },
        key: (index: number) => Object.keys(storage)[index] ?? null,
        get length() {
            return Object.keys(storage).length;
        }
    };
    (globalThis as any).localStorage = localStorageMock;
    if (typeof window !== 'undefined') {
        (window as any).localStorage = localStorageMock;
    }
}

beforeEach(async () => {
    // Clear all Dexie tables to ensure complete test isolation
    if (db.isOpen()) {
        await Promise.all([
            db.expenses.clear(),
            db.items.clear(),
            db.budgets.clear(),
            db.goals.clear(),
            db.loans.clear(),
            db.categories.clear(),
            db.recurringPayments.clear(),
            db.dailySummaries.clear(),
        ]);
    }
    // Clear localStorage
    globalThis.localStorage.clear();
});
