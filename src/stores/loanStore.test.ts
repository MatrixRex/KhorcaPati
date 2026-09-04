import { describe, it, expect } from 'vitest';
import { db } from '@/db/schema';
import { useLoanStore } from './loanStore';
import { useCategoryStore } from './categoryStore';
import { createMockLoan, createMockExpense } from '@/test/factories';

describe('Loan Store Business Logic', () => {
    it('addLoan forces totalAmount to 0 for the Holder model', async () => {
        const store = useLoanStore.getState();
        const id = await store.addLoan(createMockLoan({ totalAmount: 10000 }));

        const loan = await db.loans.get(id);
        expect(loan?.totalAmount).toBe(0);
    });

    it('recalculateLoanAmount for "taken" loan correctly tracks repayments (expenses) vs borrowed (incomes)', async () => {
        const store = useLoanStore.getState();
        const loanId = await store.addLoan(createMockLoan({ type: 'taken' }));

        // Borrowed money (income into user wallet linked to loan)
        await db.expenses.add(createMockExpense({ amount: 5000, type: 'income', loanId }));

        // Repaid money (expense from user wallet linked to loan)
        await db.expenses.add(createMockExpense({ amount: 2000, type: 'expense', loanId }));

        const repayments = await store.recalculateLoanAmount(loanId);
        expect(repayments).toBe(2000);

        const loan = await db.loans.get(loanId);
        expect(loan?.currentAmount).toBe(2000);
        expect(loan?.isArchived).toBe(false);

        // Repay the remaining 3000
        await db.expenses.add(createMockExpense({ amount: 3000, type: 'expense', loanId }));
        await store.recalculateLoanAmount(loanId);

        const completedLoan = await db.loans.get(loanId);
        expect(completedLoan?.currentAmount).toBe(5000);
        expect(completedLoan?.isArchived).toBe(true); // Auto-archived on full repayment!
    });

    it('recalculateLoanAmount for "given" loan correctly tracks repayments (incomes) vs lent (expenses)', async () => {
        const store = useLoanStore.getState();
        const loanId = await store.addLoan(createMockLoan({ type: 'given' }));

        // Lent money (expense from user wallet to other person)
        await db.expenses.add(createMockExpense({ amount: 4000, type: 'expense', loanId }));

        // Other person pays back (income into user wallet)
        await db.expenses.add(createMockExpense({ amount: 1500, type: 'income', loanId }));

        const repayments = await store.recalculateLoanAmount(loanId);
        expect(repayments).toBe(1500);

        const loan = await db.loans.get(loanId);
        expect(loan?.currentAmount).toBe(1500);
        expect(loan?.isArchived).toBe(false);

        // Other person pays remaining 2500
        await db.expenses.add(createMockExpense({ amount: 2500, type: 'income', loanId }));
        await store.recalculateLoanAmount(loanId);

        const completedLoan = await db.loans.get(loanId);
        expect(completedLoan?.currentAmount).toBe(4000);
        expect(completedLoan?.isArchived).toBe(true);
    });

    it('deleteLoan unlinks expenses and safely resets debt categories to default category', async () => {
        await useCategoryStore.getState().ensureDefaultCategory();
        const store = useLoanStore.getState();
        const loanId = await store.addLoan(createMockLoan({ type: 'taken' }));

        // Linked expense with 'Borrowed' category
        const expId1 = (await db.expenses.add(createMockExpense({
            amount: 1000,
            type: 'income',
            category: 'Borrowed',
            loanId
        }))) as number;

        // Linked expense with general 'Groceries' category
        const expId2 = (await db.expenses.add(createMockExpense({
            amount: 500,
            type: 'expense',
            category: 'Groceries',
            loanId
        }))) as number;

        await store.deleteLoan(loanId);

        // Loan deleted
        expect(await db.loans.get(loanId)).toBeUndefined();

        // Exp 1 should have loanId null and category mapped to 'Unlisted' (default category)
        const exp1 = await db.expenses.get(expId1);
        expect(exp1?.loanId).toBeNull();
        expect(exp1?.category).toBe('Unlisted');

        // Exp 2 should keep 'Groceries' category but have loanId null
        const exp2 = await db.expenses.get(expId2);
        expect(exp2?.loanId).toBeNull();
        expect(exp2?.category).toBe('Groceries');
    });
});
