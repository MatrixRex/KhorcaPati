import { type Goal } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatRelativeDate } from '@/utils/date';

import { cn } from '@/lib/utils';

interface GoalCardProps {
    goal: Goal;
    onClick?: () => void;
}

export function GoalCard({ goal, onClick }: GoalCardProps) {
    const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
    const isCompleted = goal.currentAmount >= goal.targetAmount;

    return (
        <Card
            className={cn(
                "cursor-pointer hover:bg-muted/30 active:scale-[0.98] transition-all border-border/40 shadow-sm rounded-2xl overflow-hidden group",
                isCompleted && "border-primary/30 bg-primary/5"
            )}
            onClick={onClick}
        >
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
                        {goal.title}
                        {isCompleted && (
                            <span className="text-[9px] font-black uppercase tracking-widest bg-primary text-primary-foreground px-2 py-0.5 rounded-full shadow-sm">
                                Complete
                            </span>
                        )}
                    </h3>
                    <span className="text-[10px] text-muted-foreground font-black uppercase bg-muted px-1.5 py-0.5 rounded-md">
                        ৳{goal.currentAmount.toFixed(0)} <span className="opacity-40">/</span> ৳{goal.targetAmount.toFixed(0)}
                    </span>
                </div>

                <Progress
                    value={percentage}
                    className="h-2 bg-muted/50"
                    indicatorClassName="transition-all duration-500"
                />

                <div className="flex justify-between items-center mt-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                        {percentage.toFixed(0)}% Saved
                    </span>
                    {goal.deadline && (
                        <span className="text-[10px] font-bold text-muted-foreground/80 flex items-center gap-1">
                            <span className="w-1 h-1 bg-primary rounded-full" />
                            {formatRelativeDate(goal.deadline, true)}
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
