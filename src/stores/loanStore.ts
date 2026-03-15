import { create } from 'zustand';
import { db, type Loan } from '@/db/schema';

interface LoanState {
    addLoan: (loan: Omit<Loan, 'id'>) => Promise<number>;
    updateLoan: (id: number, loan: Partial<Loan>) => Promise<number>;
    deleteLoan: (id: number) => Promise<void>;
    linkExpenseToLoan: (expenseId: number, loanId: number | null) => Promise<void>;
    recalculateLoanAmount: (loanId: number) => Promise<number>;
}

export const useLoanStore = create<LoanState>(() => ({
    addLoan: async (loan) => {
        try {
            return (await db.loans.add(loan)) as number;
        } catch (error) {
            console.error("Failed to add loan", error);
            throw error;
        }
    },

    updateLoan: async (id, loan) => {
        try {
            const updated = await db.loans.update(id, loan);
            return updated;
        } catch (error) {
            console.error("Failed to update loan", error);
            throw error;
        }
    },

    deleteLoan: async (id) => {
        try {
            await db.transaction('rw', db.loans, db.expenses, async () => {
                // Unlink all expenses linked to this loan
                await db.expenses.where('loanId').equals(id).modify({ loanId: null });
                await db.loans.delete(id);
            });
        } catch (error) {
            console.error("Failed to delete loan", error);
            throw error;
        }
    },

    linkExpenseToLoan: async (expenseId, loanId) => {
        try {
            await db.transaction('rw', db.loans, db.expenses, async () => {
                const expense = await db.expenses.get(expenseId);
                const oldLoanId = expense?.loanId;
                
                await db.expenses.update(expenseId, { loanId: loanId });
                
                if (loanId) {
                    const store = useLoanStore.getState();
                    await store.recalculateLoanAmount(loanId);
                }
                if (oldLoanId && oldLoanId !== loanId) {
                    const store = useLoanStore.getState();
                    await store.recalculateLoanAmount(oldLoanId);
                }
            });
        } catch (err) {
            console.error("Failed to link expense to loan", err);
            throw err;
        }
    },

    recalculateLoanAmount: async (loanId) => {
        try {
            return await db.transaction('rw', db.loans, db.expenses, async () => {
                const loan = await db.loans.get(loanId);
                if (!loan) return 0;

                const linkedExpenses = await db.expenses.where('loanId').equals(loanId).toArray();
                
                let total = 0;
                if (loan.type === 'taken') {
                    // For borrowed loans, payments I make (expenses) INCREASE progress
                    // Receiving more (income) DECREASES progress (increases debt effectively)
                    total = linkedExpenses.reduce((sum, exp) => {
                        return exp.type === 'expense' ? sum + exp.amount : sum - exp.amount;
                    }, 0);
                } else {
                    // For lent loans, payments I receive (income) INCREASE progress
                    // Giving more (expense) DECREASES progress
                    total = linkedExpenses.reduce((sum, exp) => {
                        return exp.type === 'income' ? sum + exp.amount : sum - exp.amount;
                    }, 0);
                }

                await db.loans.update(loanId, { 
                    currentAmount: total,
                    updatedAt: new Date().toISOString()
                });
                return total;
            });
        } catch (err) {
            console.error("Failed to recalculate loan amount", err);
            throw err;
        }
    }
}));
