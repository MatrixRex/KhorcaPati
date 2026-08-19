import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { parseISO, differenceInCalendarDays } from 'date-fns';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { RecurringPaymentCard } from '@/components/recurring/RecurringPaymentCard';
import { GoalCard } from '@/components/goals/GoalCard';
import { LoanCard } from '@/components/loans/LoanCard';
import { BudgetCard } from '@/components/budgets/BudgetCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Settings2, Sparkles, Plus } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { PageContainer } from '@/components/shared/PageContainer';
import { useSettingsStore } from '@/stores/settingsStore';
import { BalanceEditDrawer } from '@/components/shared/BalanceEditDrawer';
import { useTranslation } from 'react-i18next';
import { formatAmount } from '@/lib/utils';
import { useExpenseStore } from '@/stores/expenseStore';
import { getBillingCycleRange } from '@/utils/cycle';

export default function Dashboard() {
    const { t, i18n } = useTranslation();
    const { 
        openEditExpense, 
        openAddExpense,
        openSmartBatchParser,
        openRecurringPaymentDetail, 
        openRecurringPaymentsList,
        openBudgetsList,
        openGoalsList,
        openLoansList,
        openBalanceEdit,
        openBudgetRecords,
        openGoalRecords,
        openLoanRecords
    } = useUIStore();
    const { resetDate } = useSettingsStore();

    const currentCycle = useMemo(() => getBillingCycleRange(new Date(), resetDate), [resetDate]);

    const startFormatter = useMemo(() => {
        return new Intl.DateTimeFormat(i18n.language, { month: 'short', day: 'numeric' });
    }, [i18n.language]);

    const formattedStartDate = useMemo(() => {
        return startFormatter.format(currentCycle.start);
    }, [currentCycle.start, startFormatter]);

    const daysRemainingLabel = useMemo(() => {
        const daysLeft = differenceInCalendarDays(currentCycle.end, new Date());
        if (daysLeft <= 0) return t('endsToday');
        if (daysLeft === 1) return t('dayRemaining');
        return t('daysRemaining', { count: daysLeft });
    }, [currentCycle.end, t]);

    const storeExpenses = useExpenseStore(state => state.expenses);
    const expensesThisMonth = useLiveQuery(async () => {
        const all = await db.expenses.filter(e => !e.parentId).toArray();
        return all.filter(e => {
            const expDate = new Date(e.date);
            return expDate >= currentCycle.start && expDate <= currentCycle.end;
        });
    }, [currentCycle, storeExpenses]);

    const recentExpenses = useLiveQuery(async () => {
        const topLevel = await db.expenses.filter(e => !e.parentId).toArray();
        topLevel.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateB - dateA;
            return (b.id || 0) - (a.id || 0);
        });
        return topLevel.slice(0, 3);
    }, [storeExpenses]);




    const recurringPayments = useLiveQuery(async () => {
        const all = await db.recurringPayments.orderBy('nextDueDate').toArray();
        const now = new Date();
        return all.filter(payment => {
            const nextDate = parseISO(payment.nextDueDate);
            const diffInDays = differenceInCalendarDays(nextDate, now);
            // Show overdue (any) or coming soon (within 7 days)
            return diffInDays <= 7;
        });
    });

    const budgets = useLiveQuery(
        () => db.budgets.toArray()
    );

    const activeGoals = useLiveQuery(async () => {
        const all = await db.goals.orderBy('createdAt').reverse().toArray();
        return all.filter(g => !g.isArchived && g.currentAmount < g.targetAmount).slice(0, 2);
    });

    const activeLoans = useLiveQuery(async () => {
        const all = await db.loans.toArray();
        const allExpenses = await db.expenses.where('loanId').anyOf(all.map(l => l.id!).filter(Boolean)).toArray();
        
        const active = all.filter(loan => {
            if (loan.isArchived) return false;
            const linkedExpenses = allExpenses.filter(e => e.loanId === loan.id);
            const totalRepayments = linkedExpenses
                .filter(e => (loan.type === 'taken' ? e.type === 'expense' : e.type === 'income'))
                .reduce((s, e) => s + e.amount, 0);
                
            const totalAdditionalAmount = linkedExpenses
                .filter(e => (loan.type === 'taken' ? e.type === 'income' : e.type === 'expense'))
                .reduce((s, e) => s + e.amount, 0);
            
            // Doubling protection heuristic: 
            // If totalAmount (base) is identical to totalAdditionalAmount (records), 
            // it's likely a new-style loan where the initial amount was recorded twice.
            const isProbablyDoubled = (loan.totalAmount > 0 && totalAdditionalAmount === loan.totalAmount);
            const totalGrossAmount = isProbablyDoubled ? totalAdditionalAmount : ((loan.totalAmount || 0) + totalAdditionalAmount);
            
            return totalRepayments < totalGrossAmount;
        });
        
        return active.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 2);
    }, [storeExpenses]);

    const totalSpent = expensesThisMonth?.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0) || 0;
    const totalIncome = expensesThisMonth?.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0) || 0;
    
    const totalBalance = useMemo(() => {
        if (!expensesThisMonth) return 0;
        return expensesThisMonth.reduce((sum, exp) => {
            return exp.type === 'income' ? sum + exp.amount : sum - exp.amount;
        }, 0);
    }, [expensesThisMonth]);

    return (
        <PageContainer
            title={t('appTitle')}
        >
            {/* At A Glance - Compact Premium Glassmorphic Card */}
            <div className="relative mb-6 group">
                {/* Dynamic Background Glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-emerald-500/20 to-teal-500/30 rounded-[1.5rem] blur-xl opacity-60 transition duration-1000" />
                
                <Card 
                    className="relative border border-white/20 dark:border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur-3xl shadow-2xl rounded-[1.5rem] overflow-hidden cursor-pointer active:scale-[0.98] transition-all duration-500 ring-1 ring-inset ring-white/20 dark:ring-white/5"
                    onClick={openBalanceEdit}
                >
                    <CardContent className="p-6 relative z-10">
                        {/* Decorative Background Symbol - Blurred for depth */}
                        <div className="absolute -top-12 -right-12 p-8 opacity-10 dark:opacity-20 blur-[4px] transition-transform duration-700 select-none pointer-events-none">
                            <div className="text-[14rem] font-black italic text-foreground/50">৳</div>
                        </div>
                        
                        <div className="flex justify-between items-start relative z-10">
                            <div className="flex flex-col gap-0.5">
                                <p className="text-foreground/40 text-[11px] font-black uppercase tracking-[0.2em] ml-1">{t('monthlyBalance')}</p>
                                <div className="flex items-baseline gap-2 font-heading">
                                    <span className="text-xl font-black text-primary/40 decoration-primary/20 underline underline-offset-8">৳</span>
                                    <h2 className="text-4xl font-black tracking-tighter text-foreground leading-tight">{formatAmount(totalBalance)}</h2>
                                </div>
                            </div>

                            <div className="flex flex-col items-end text-right gap-1 bg-white/5 dark:bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-[12px] border border-white/10 dark:border-white/5">
                                {resetDate !== 1 && (
                                    <span className="text-[10px] font-black uppercase tracking-wider text-foreground/50">
                                        {t('cycleStarts', { date: formattedStartDate })}
                                    </span>
                                )}
                                <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                                    {daysRemainingLabel}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 relative z-10 mt-6 pt-5 border-t border-foreground/5 font-heading">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[11px] font-black uppercase text-foreground/30 tracking-[0.15em] shrink-0">{t('income')}</span>
                                <span className="text-base font-black text-emerald-500 dark:text-emerald-400">৳{formatAmount(totalIncome)}</span>
                            </div>
                            <div className="w-px h-8 bg-foreground/5" />
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[11px] font-black uppercase text-foreground/30 tracking-[0.15em] shrink-0">{t('expenses')}</span>
                                <span className="text-base font-black text-destructive">৳{formatAmount(totalSpent)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-2.5 mb-6">
                <button
                    type="button"
                    onClick={() => openSmartBatchParser()}
                    className="p-3.5 rounded-2xl glass border border-primary/20 bg-primary/5 hover:bg-primary/10 flex items-center gap-3 text-left transition-all duration-300 active:scale-95 group shadow-sm"
                >
                    <div className="p-2.5 rounded-xl bg-primary/15 text-primary group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300 shrink-0">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black tracking-tight text-foreground">{t('aiSmartNote', { defaultValue: 'AI Smart Note' })}</span>
                        <span className="text-[10px] text-muted-foreground font-medium truncate">{t('aiSmartNoteSubtitle', { defaultValue: 'Parse messy notes' })}</span>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => openAddExpense()}
                    className="p-3.5 rounded-2xl glass border border-white/10 hover:border-primary/30 bg-white/5 hover:bg-muted/40 flex items-center gap-3 text-left transition-all duration-300 active:scale-95 group shadow-sm"
                >
                    <div className="p-2.5 rounded-xl bg-muted/60 text-foreground group-hover:scale-110 transition-all duration-300 shrink-0">
                        <Plus className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black tracking-tight text-foreground">{t('addRecord', { defaultValue: 'Add Record' })}</span>
                        <span className="text-[10px] text-muted-foreground font-medium truncate">{t('singleTransaction', { defaultValue: 'Single entry' })}</span>
                    </div>
                </button>
            </div>

            {/* Recent Expenses */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-sm font-black text-foreground font-heading uppercase tracking-widest">{t('recentExpenses')}</h2>
                    <Link to="/expenses" className="text-xs text-primary font-bold uppercase">{t('viewAll')}</Link>
                </div>
                {!recentExpenses || recentExpenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-6 text-center border-2 border-dashed border-border rounded-2xl bg-muted/30 text-foreground/70">{t('noExpenses')}</p>
                ) : (
                    <div className="flex flex-col gap-[var(--item-gap)]">
                        {recentExpenses.map(exp => (
                            <ExpenseCard key={exp.id} expense={exp} onClick={() => openEditExpense(exp)} />
                        ))}
                    </div>
                )}
            </div>

            {/* Recurring Payments */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-sm font-black text-foreground font-heading uppercase tracking-widest">{t('recurring')}</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground transition-colors"
                        onClick={openRecurringPaymentsList}
                    >
                        <Settings2 className="w-4 h-4" />
                    </Button>
                </div>
                {!recurringPayments || recurringPayments.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-6 text-center border-2 border-dashed border-border rounded-2xl bg-muted/30 text-foreground/70">{t('noRecurring')}</p>
                ) : (
                    <div className="flex flex-col gap-[var(--item-gap)]">
                        {recurringPayments.map(payment => (
                            <RecurringPaymentCard
                                key={payment.id}
                                payment={payment}
                                onClick={() => openRecurringPaymentDetail(payment)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Budget Overview */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-sm font-black text-foreground font-heading uppercase tracking-widest">{t('budgets')}</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground transition-colors"
                        onClick={openBudgetsList}
                    >
                        <Settings2 className="w-4 h-4" />
                    </Button>
                </div>
                {!budgets || budgets.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-6 text-center border-2 border-dashed border-border rounded-2xl bg-muted/30 text-foreground/70">{t('noBudgets')}</p>
                ) : (
                    <div className="flex flex-col gap-[var(--item-gap)]">
                        {budgets.map(budget => (
                            <BudgetCard key={budget.id} budget={budget} onClick={() => openBudgetRecords(budget)} />
                        ))}
                    </div>
                )}
            </div>

            {/* Active Goals */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-sm font-black text-foreground font-heading uppercase tracking-widest">{t('activeGoals')}</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground transition-colors"
                        onClick={openGoalsList}
                    >
                        <Settings2 className="w-4 h-4" />
                    </Button>
                </div>
                {!activeGoals || activeGoals.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-6 text-center border-2 border-dashed border-border rounded-2xl bg-muted/30 text-foreground/70">{t('noGoals')}</p>
                ) : (
                    <div className="flex flex-col gap-[var(--item-gap)]">
                        {activeGoals.map(goal => (
                            <GoalCard key={goal.id} goal={goal} onClick={() => openGoalRecords(goal)} />
                        ))}
                    </div>
                )}
            </div>

            {/* Active Loans */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-sm font-black text-foreground font-heading uppercase tracking-widest">{t('loans')}</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground transition-colors"
                        onClick={openLoansList}
                    >
                        <Settings2 className="w-4 h-4" />
                    </Button>
                </div>
                {!activeLoans || activeLoans.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-6 text-center border-2 border-dashed border-border rounded-2xl bg-muted/30 text-foreground/70">{t('noLoans')}</p>
                ) : (
                    <div className="flex flex-col gap-[var(--item-gap)]">
                        {activeLoans.map(loan => (
                            <LoanCard key={loan.id} loan={loan} onClick={() => openLoanRecords(loan)} />
                        ))}
                    </div>
                )}
            </div>

            <BalanceEditDrawer />
        </PageContainer>
    );
}
