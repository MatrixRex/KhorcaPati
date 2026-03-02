import { type Goal } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatRelativeDate } from '@/utils/date';

interface GoalCardProps {
    goal: Goal;
    onClick?: () => void;
}

export function GoalCard({ goal, onClick }: GoalCardProps) {
    const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
    const isCompleted = goal.currentAmount >= goal.targetAmount;

    return (
        <Card
            className={`cursor-pointer hover:bg-muted/50 transition-colors shadow-none ${isCompleted ? 'border-primary/50 bg-primary/5' : ''}`}
            onClick={onClick}
        >
            <CardContent className="px-4 py-3 space-y-2.5">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                        {goal.title}
                        {isCompleted && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-sm">Done</span>}
                    </h3>
                    <span className="text-xs text-muted-foreground font-medium">
                        ৳{goal.currentAmount.toFixed(0)} / ৳{goal.targetAmount.toFixed(0)}
                    </span>
                </div>

                <Progress
                    value={percentage}
                    className="h-1.5"
                />

                <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-0.5">
                    <span className="font-medium">{percentage.toFixed(0)}%</span>
                    {goal.deadline && (
                        <span>Due: {formatRelativeDate(goal.deadline, true)}</span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
