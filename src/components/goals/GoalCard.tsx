import { type Goal } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatRelativeDate } from '@/utils/date';
import { Button } from '@/components/ui/button';
import { Plus, Edit2 } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

import { cn } from '@/lib/utils';

interface GoalCardProps {
    goal: Goal;
}

export function GoalCard({ goal }: GoalCardProps) {
    const { openEditGoal, openAddGoalProgress, openGoalRecords } = useUIStore();
    const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
    const isCompleted = goal.currentAmount >= goal.targetAmount;

    return (
        <Card
            onClick={() => openGoalRecords(goal)}
            className={cn(
                "group relative overflow-hidden transition-all duration-300 border-border/40 hover:border-primary/20 cursor-pointer",
                "bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md rounded-3xl",
                isCompleted && "border-primary/30 bg-primary/[0.02]"
            )}
        >
            <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-black text-sm uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                                {goal.title}
                            </h3>
                            {isCompleted && (
                                <span className="flex-shrink-0 text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground px-2.5 py-1 rounded-full shadow-sm animate-pulse">
                                    Done
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider line-clamp-1 opacity-60">
                            {goal.note || 'No notes added'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                                e.stopPropagation();
                                openEditGoal(goal);
                            }}
                        >
                            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                            size="icon"
                            variant="outline"
                            className="h-10 w-10 rounded-full border-2 border-primary text-primary hover:bg-primary/10 hover:scale-[1.05] active:scale-[0.95] transition-all bg-transparent"
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
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Saved Progress</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black tabular-nums">৳{goal.currentAmount.toLocaleString()}</span>
                                <span className="text-[11px] font-bold text-muted-foreground opacity-40">/ ৳{goal.targetAmount.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-lg font-black text-primary italic">{percentage.toFixed(0)}%</span>
                        </div>
                    </div>

                    <div className="relative h-2.5 w-full bg-muted/40 rounded-full overflow-hidden">
                        <Progress
                            value={percentage}
                            className="h-full bg-transparent"
                            indicatorClassName={cn(
                                "transition-all duration-1000 ease-out",
                                isCompleted ? "bg-primary" : "bg-primary"
                            )}
                        />
                        <div 
                            className="absolute top-0 left-0 h-full bg-primary/20 blur-sm transition-all duration-1000"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>

                    <div className="flex justify-between items-center py-0.5">
                        <div className="flex gap-2">
                            {goal.deadline && (
                                <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-lg">
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                                    <span className="text-[10px] font-bold text-muted-foreground/80 lowercase">
                                        {formatRelativeDate(goal.deadline, true)}
                                    </span>
                                </div>
                            )}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 italic">
                            Updated {formatRelativeDate(goal.updatedAt)}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
