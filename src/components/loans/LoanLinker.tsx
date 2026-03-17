import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Loan, type Expense } from '@/db/schema';
import { cn, formatAmount } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Check, Search, X, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface LoanLinkerProps {
    loan: Partial<Loan>;
    selectedExpenseId?: number | null;
    onSelect: (expense: Expense | null) => void;
    onDone: () => void;
}

export function LoanLinker({ loan, selectedExpenseId, onSelect, onDone }: LoanLinkerProps) {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');

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

    const handleToggleLink = (expense: Expense) => {
        if (!expense.id) return;
        if (selectedExpenseId === expense.id) {
            onSelect(null);
        } else {
            onSelect(expense);
        }
    };

    return (
        <div className="flex flex-col bg-transparent h-full max-h-[80vh]">
            <div className="sticky top-0 z-10 bg-transparent pb-4 px-1">
                <div className="flex flex-col gap-4">
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex gap-3 items-start">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-amber-700 uppercase leading-tight">
                            {t('linkingOverwriteWarning')}
                        </p>
                    </div>

                    <Button 
                        className="w-full h-11 rounded-xl font-bold btn-premium"
                        onClick={onDone}
                    >
                        {t('doneLinking')}
                    </Button>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder={t('searchRecords')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-12 rounded-xl bg-foreground/[0.03] border-foreground/[0.05] shadow-sm focus:bg-foreground/[0.05] focus:border-primary/50 transition-all font-medium"
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

            <div className="flex-1 overflow-y-auto space-y-2 mt-4 pb-10">
                {filteredExpenses.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-40">
                        {t('noRecords')}
                    </div>
                ) : (
                    filteredExpenses.map((exp) => {
                        const isSelected = exp.id === selectedExpenseId;
                        const isLinkedElsewhere = exp.loanId && (!loan.id || exp.loanId !== loan.id);
                        const isLinkedToThis = loan.id && exp.loanId === loan.id;

                        return (
                            <div
                                key={exp.id}
                                onClick={() => handleToggleLink(exp)}
                                className={cn(
                                    "flex items-center justify-between p-4 rounded-2xl transition-all border cursor-pointer",
                                    isSelected || isLinkedToThis
                                        ? "bg-primary/10 border-primary/30 shadow-lg ring-1 ring-primary/20" 
                                        : "bg-foreground/[0.03] border-foreground/[0.05] hover:bg-foreground/[0.08]"
                                )}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all",
                                        isSelected || isLinkedToThis ? "bg-primary text-primary-foreground scale-105 shadow-md" : "bg-muted/50 text-muted-foreground"
                                    )}>
                                        {isSelected || isLinkedToThis ? <Check className="w-5 h-5 stroke-[4]" /> : (exp.type === 'income' ? '💰' : '💸')}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-black truncate capitalize">
                                                {exp.note || exp.category}
                                            </span>
                                            {isLinkedElsewhere && (
                                                <span className="text-[8px] font-black uppercase tracking-tighter bg-orange-500/10 text-orange-600 px-1.5 py-0.5 rounded">
                                                    Linked Elsewhere
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                                            <span>{exp.category}</span>
                                            <span>•</span>
                                            <span>{format(parseISO(exp.date), 'dd MMM yy')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right ml-2 shrink-0">
                                    <span className={cn(
                                        "text-base font-black tabular-nums",
                                        exp.type === 'income' ? "text-green-600" : "text-primary"
                                    )}>
                                        {exp.type === 'income' ? '+' : '-'}৳{formatAmount(exp.amount)}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
