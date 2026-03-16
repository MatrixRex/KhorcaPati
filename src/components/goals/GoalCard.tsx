import { type Goal } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatRelativeDate } from '@/utils/date';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

import { cn, formatAmount } from '@/lib/utils';

interface GoalCardProps {
    goal: Goal;
    onClick?: () => void;
}

import { useTranslation } from 'react-i18next';

export function GoalCard({ goal, onClick }: GoalCardProps) {
    const { t } = useTranslation();
    const { openAddGoalProgress, openGoalRecords } = useUIStore();
    const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
    const isCompleted = goal.currentAmount >= goal.targetAmount;

    return (
        <Card
            onClick={onClick || (() => openGoalRecords(goal))}
            className={cn(
                "group relative overflow-hidden border-border cursor-pointer shadow-sm active:scale-[0.98] transition-all rounded-xl",
                isCompleted && "border-primary/30"
            )}
            style={{ 
                background: `linear-gradient(to right, color-mix(in oklch, var(--primary) 12%, transparent), transparent)`
            }}
        >
            {/* Primary Glow */}
            <div className="card-glow bg-primary" />
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-black text-sm uppercase tracking-tight truncate transition-colors">
                                {goal.title}
                            </h3>
                            {isCompleted && (
                                <span className="flex-shrink-0 text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md shadow-sm">
                                    {t('done')}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider line-clamp-1">
                            {goal.note || t('noNotes')}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                        <span className="text-xs text-muted-foreground font-black uppercase text-right shrink-0 bg-muted px-1.5 py-0.5 rounded-md">
                            ৳{formatAmount(goal.currentAmount)} <span className="opacity-60">/</span> ৳{formatAmount(goal.targetAmount)}
                        </span>
                        <Button
                            size="icon"
                            variant="outline"
                            className="h-9 w-9 rounded-full border-2 border-primary text-primary active:scale-[0.95] transition-all bg-transparent shrink-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                openAddGoalProgress(goal);
                            }}
                        >
                            <Plus className="w-5 h-5 stroke-[3]" />
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="relative h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                        <Progress
                            value={percentage}
                            className="h-full bg-transparent"
                            indicatorClassName={cn(
                                "transition-all duration-1000 ease-out",
                                isCompleted ? "bg-primary" : "bg-primary"
                            )}
                        />
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest mt-1">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="text-muted-foreground shrink-0">
                                {t('savedPercent', { count: Math.round(percentage) })}
                            </span>
                            {goal.deadline && (
                                <span className="text-muted-foreground/50">•</span>
                            )}
                            {goal.deadline && (
                                <span className="text-muted-foreground truncate">
                                    {formatRelativeDate(goal.deadline, true)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

