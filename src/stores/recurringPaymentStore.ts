import { create } from 'zustand';
import { db, type RecurringPayment } from '@/db/schema';

interface RecurringPaymentState {
    recurringPayments: RecurringPayment[];
    isLoading: boolean;
    error: string | null;
    loadRecurringPayments: () => Promise<void>;
    addRecurringPayment: (payment: Omit<RecurringPayment, 'id'>) => Promise<number | undefined>;
    updateRecurringPayment: (id: number, payment: Partial<RecurringPayment>) => Promise<void>;
    deleteRecurringPayment: (id: number) => Promise<void>;
}

export const useRecurringPaymentStore = create<RecurringPaymentState>((set, get) => ({
    recurringPayments: [],
    isLoading: false,
    error: null,

    loadRecurringPayments: async () => {
        set({ isLoading: true });
        try {
            const payments = await db.recurringPayments.toArray();
            set({ recurringPayments: payments, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    addRecurringPayment: async (payment) => {
        const id = await db.recurringPayments.add(payment as RecurringPayment);
        await get().loadRecurringPayments();
        return id;
    },

    updateRecurringPayment: async (id, payment) => {
        await db.recurringPayments.update(id, payment);
        await get().loadRecurringPayments();
    },

    deleteRecurringPayment: async (id) => {
        await db.recurringPayments.delete(id);
        await get().loadRecurringPayments();
    },
}));
