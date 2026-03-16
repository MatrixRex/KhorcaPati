import { type Goal } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatRelativeDate } from '@/utils/date';
import { useUIStore } from '@/stores/uiStore';

import { cn, formatAmount } from '@/lib/utils';

interface GoalCardProps {
    goal: Goal;
    onClick?: () => void;
}

import { useTranslation } from 'react-i18next';

export function GoalCard({ goal, onClick }: GoalCardProps) {
    const { t } = useTranslation();
    const { openGoalRecords } = useUIStore();
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
                            <h3 className="label-header truncate transition-colors">
                                {goal.title}
                            </h3>
                            {isCompleted && (
                                <span className="flex-shrink-0 label-caption !text-[8px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md shadow-sm">
                                    {t('done')}
                                </span>
                            )}
                        </div>
                        <p className="label-caption text-muted-foreground line-clamp-1">
                            {goal.note || t('noNotes')}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                        <span className="label-caption text-muted-foreground font-black uppercase text-right shrink-0 bg-muted px-1.5 py-0.5 rounded-md">
                            ৳{formatAmount(goal.currentAmount)} <span className="opacity-60">/</span> ৳{formatAmount(goal.targetAmount)}
                        </span>
                    </div>
                </div>

                <div className="space-y-2">
                    <Progress
                        value={percentage}
                        className="premium-progress"
                        indicatorClassName="premium-progress-indicator"
                        style={{ "--progress-indicator": "var(--primary)" } as any}
                    />

                    <div className="flex justify-between items-center label-caption mt-1">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="text-muted-foreground shrink-0 uppercase">
                                {t('savedPercent', { count: Math.round(percentage) })}
                            </span>
                            {goal.deadline && (
                                <span className="text-muted-foreground/50">•</span>
                            )}
                            {goal.deadline && (
                                <span className="text-muted-foreground truncate uppercase">
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

