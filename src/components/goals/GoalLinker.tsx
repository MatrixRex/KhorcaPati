import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Goal, type Expense } from '@/db/schema';
import { useGoalStore } from '@/stores/goalStore';
import { cn, formatAmount } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Check, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface GoalLinkerProps {
    goal: Goal;
    onSuccess?: () => void;
}

export function GoalLinker({ goal, onSuccess }: GoalLinkerProps) {
    const [search, setSearch] = useState('');
    const linkExpenseToGoal = useGoalStore((state) => state.linkExpenseToGoal);

    const expenses = useLiveQuery(() => 
        db.expenses
            .orderBy('date')
            .reverse()
            .toArray()
    ) || [];

    const filteredExpenses = expenses.filter(e => {
        const matchesSearch = e.note?.toLowerCase().includes(search.toLowerCase()) || 
                             e.category.toLowerCase().includes(search.toLowerCase());
        return matchesSearch;
    });

    const handleToggleLink = async (expense: Expense) => {
        if (!expense.id || !goal.id) return;
        const isLinked = expense.goalId === goal.id;
        await linkExpenseToGoal(expense.id, isLinked ? null : goal.id);
    };

    return (
        <div className="flex flex-col bg-background">
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md pb-4 px-1">
                <div className="flex flex-col gap-4">
                    <Button 
                        className="w-full h-11 rounded-xl font-bold"
                        onClick={() => onSuccess?.()}
                    >
                        Done Linking
                    </Button>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search records to link..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-11 rounded-2xl bg-muted/40 border-none focus-visible:ring-primary"
                        />
                        {search && (
                            <button 
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-muted rounded-full flex items-center justify-center"
                            >
                                <X className="w-3 h-3 text-muted-foreground" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 space-y-2 mt-4">
                {filteredExpenses.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-40">
                        No records found
                    </div>
                ) : (
                    filteredExpenses.map((exp) => {
                        const isLinkedToThisGoal = exp.goalId === goal.id;
                        const isLinkedToOtherGoal = exp.goalId && exp.goalId !== goal.id;

                        return (
                            <div
                                key={exp.id}
                                onClick={() => handleToggleLink(exp)}
                                className={cn(
                                    "flex items-center justify-between p-4 rounded-2xl transition-all border cursor-pointer",
                                    isLinkedToThisGoal 
                                        ? "bg-primary/5 border-primary/30 shadow-sm" 
                                        : "bg-muted/10 border-border/10 hover:bg-muted/20"
                                )}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all",
                                        isLinkedToThisGoal ? "bg-primary text-primary-foreground scale-105 shadow-md" : "bg-muted/50 text-muted-foreground"
                                    )}>
                                        {isLinkedToThisGoal ? <Check className="w-5 h-5 stroke-[4]" /> : (exp.type === 'income' ? '💰' : '💸')}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-black truncate capitalize">
                                                {exp.note || exp.category}
                                            </span>
                                            {isLinkedToOtherGoal && (
                                                <span className="text-[8px] font-black uppercase tracking-tighter bg-orange-500/10 text-orange-600 px-1.5 py-0.5 rounded">
                                                    Linked Elsewhere
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                                            <span>{exp.category}</span>
                                            <span>•</span>
                                            <span>{format(parseISO(exp.date), 'dd MMM yyyy')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right ml-2 shrink-0">
                                    <span className={cn(
                                        "text-base font-black tabular-nums",
                                        exp.type === 'income' ? "text-green-600" : "text-primary"
                                    )}>
                                        {exp.type === 'income' ? '-' : '+'}৳{formatAmount(exp.amount)}
                                    </span>
                                    <div className="text-[9px] font-bold text-muted-foreground/60 uppercase">
                                        {exp.type === 'income' ? 'Withdrawal' : 'Deposit'}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
