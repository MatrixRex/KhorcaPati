import { useState } from 'react';
import { type Expense, db } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatRelativeDate } from '@/utils/date';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layers, ChevronDown, CornerDownRight } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { formatAmount } from '@/lib/utils';

interface ExpenseCardProps {
    expense: Expense;
    onClick?: () => void;
}

import { useTranslation } from 'react-i18next';

export function ExpenseCard({ expense, onClick }: ExpenseCardProps) {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);
    const { openEditExpense } = useUIStore();
    const { categories } = useCategoryStore();

    const catInfo = categories.find(c => c.name.toLowerCase() === expense.category.toLowerCase());
    const catColor = catInfo?.color || '#3b82f6';

    const subExpenses = useLiveQuery(() =>
        expense.isNested ? db.expenses.where('parentId').equals(expense.id!).toArray() : []
        , [expense.isNested, expense.id]);

    const handleToggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="flex flex-col gap-1">
            <Card
                className={cn(
                    "cursor-pointer active:scale-[0.98] transition-all border-border shadow-sm rounded-xl group relative",
                    isExpanded && "bg-muted/10 border-primary/20",
                    expense.isNested && !isExpanded && "bg-primary/5 border-primary/10 stacked-card-effect"
                )}
                style={{
                    background: `linear-gradient(to right, ${catColor}1F, transparent)`
                }}
                onClick={onClick}
            >
                {/* Categorical Glow (Standardized) */}
                <div
                    className="card-glow"
                    style={{ backgroundColor: catColor }}
                />
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex flex-col flex-1 overflow-hidden pr-2">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="label-header truncate transition-colors capitalize">
                                {expense.note || t(expense.type)}
                            </h3>
                            {expense.isRecurring && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 font-bold uppercase tracking-wider">
                                    ↺ {t(expense.recurringInterval?.toLowerCase() || '')}
                                </Badge>
                            )}
                            {expense.isNested && (
                                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                    <Layers className="w-3 h-3" />
                                </div>
                            )}
                        </div>
                        <div className="flex items-center label-caption text-muted-foreground gap-2">
                            <span>{formatRelativeDate(expense.date, true)}</span>
                            <span className="opacity-50">•</span>
                            <span className="truncate uppercase">{expense.category}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <div className="flex flex-col items-end">
                            <span className={cn(
                                "text-value-md tabular-nums",
                                expense.type === 'income' ? "text-success" : "text-destructive"
                            )}>
                                {expense.type === 'income' ? '+' : '-'}৳{formatAmount(expense.amount)}
                            </span>
                            {expense.parentId && (
                                <Badge variant="outline" className="label-caption border-primary/20 text-primary px-1 h-3.5 mt-0.5">
                                    {t('sub')}
                                </Badge>
                            )}
                        </div>

                        {expense.isNested && (
                            <button
                                onClick={handleToggleExpand}
                                className={cn(
                                    "p-2 rounded-full transition-all",
                                    isExpanded ? "text-primary rotate-180" : "text-muted-foreground"
                                )}
                            >
                                <ChevronDown className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {isExpanded && subExpenses && (
                <div className="ml-4 flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-200">
                    {subExpenses.map(sub => (
                        <div
                            key={sub.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60 transition-all cursor-pointer group/sub"
                            onClick={(e) => {
                                e.stopPropagation();
                                openEditExpense(sub);
                            }}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <div className="flex flex-col overflow-hidden">
                                    <span className="label-header !text-[11px] truncate capitalize transition-colors">
                                        {sub.note || t(sub.type)}
                                    </span>
                                    <span className="label-caption !text-[8px] text-muted-foreground uppercase">{sub.category}</span>
                                </div>
                            </div>
                            <span className={cn(
                                "text-value-md !text-xs",
                                sub.type === 'income' ? "text-success" : "text-destructive"
                            )}>
                                ৳{formatAmount(sub.amount)}
                            </span>
                        </div>


                    ))}
                    {subExpenses.length === 0 && (
                        <div className="ml-7 p-3 label-caption text-muted-foreground/60 italic border border-dashed rounded-xl border-border/60 text-center">
                            {t('emptyCollection')}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

