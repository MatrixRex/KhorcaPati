import { type Loan } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatRelativeDate } from '@/utils/date';
import { Button } from '@/components/ui/button';
import { Plus, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { cn, formatAmount } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface LoanCardProps {
    loan: Loan;
    onClick?: () => void;
}

export function LoanCard({ loan, onClick }: LoanCardProps) {
    const { t } = useTranslation();
    const { openAddLoanProgress, openLoanRecords } = useUIStore();
    const percentage = Math.min((loan.currentAmount / loan.totalAmount) * 100, 100);
    const isCompleted = loan.currentAmount >= loan.totalAmount;
    const isTaken = loan.type === 'taken';

    return (
        <Card
            onClick={onClick || (() => openLoanRecords(loan))}
            className={cn(
                "group relative overflow-hidden transition-all duration-300 border-border/40 hover:border-primary/20 cursor-pointer shadow-sm active:scale-[0.98] transition-all rounded-2xl",
                isCompleted && "border-primary/30"
            )}
            style={{ 
                background: `linear-gradient(to right, ${isTaken ? 'hsl(var(--destructive))08' : 'hsl(var(--primary))08'}, transparent)`
            }}
        >
            <div 
                className={cn(
                    "absolute -left-4 top-0 bottom-0 w-8 opacity-20 blur-xl pointer-events-none",
                    isTaken ? "bg-destructive" : "bg-primary"
                )}
            />
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-black text-sm uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                                {loan.title}
                            </h3>
                            {isCompleted && (
                                <span className="flex-shrink-0 text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md shadow-sm">
                                    {t('done')}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase tracking-wider line-clamp-1 opacity-70">
                            {isTaken ? <ArrowDownLeft className="w-3 h-3 text-destructive" /> : <ArrowUpRight className="w-3 h-3 text-primary" />}
                            <span>{isTaken ? t('borrowedFrom') : t('lentTo')}: {loan.person}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                        <span className="text-xs text-muted-foreground font-black uppercase text-right shrink-0 bg-muted px-1.5 py-0.5 rounded-md">
                            ৳{formatAmount(loan.currentAmount)} <span className="opacity-40">/</span> ৳{formatAmount(loan.totalAmount)}
                        </span>
                        <Button
                            size="icon"
                            variant="outline"
                            className={cn(
                                "h-9 w-9 rounded-full border-2 text-primary hover:bg-primary/10 hover:scale-[1.05] active:scale-[0.95] transition-all bg-transparent shrink-0",
                                isTaken ? "border-destructive text-destructive hover:bg-destructive/10" : "border-primary text-primary"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                openAddLoanProgress(loan);
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
                                isTaken ? "bg-destructive" : "bg-primary"
                            )}
                        />
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest mt-1">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="text-muted-foreground/60 shrink-0">
                                {t('percentDone', { percent: Math.round(percentage) })}
                            </span>
                            {loan.dueDate && (
                                <span className="text-muted-foreground/30">•</span>
                            )}
                            {loan.dueDate && (
                                <span className="text-muted-foreground/60 truncate">
                                    {formatRelativeDate(loan.dueDate, true)}
                                </span>
                            )}
                        </div>
                        <div className="text-[10px] font-black text-muted-foreground/40">
                             {t('remaining')}: ৳{formatAmount(loan.totalAmount - loan.currentAmount)}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
