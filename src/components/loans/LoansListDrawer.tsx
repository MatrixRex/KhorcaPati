import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { LoanCard } from './LoanCard';
import { useUIStore } from '@/stores/uiStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function LoansListDrawer() {
    const { isLoansListOpen, closeLoansList, openAddLoan, openEditLoan } = useUIStore();
    const { t } = useTranslation();

    const loans = useLiveQuery(async () => {
        return await db.loans.orderBy('createdAt').reverse().toArray();
    });

    return (
        <Sheet open={isLoansListOpen} onOpenChange={(open) => !open && closeLoansList()}>
            <SheetContent 
                side="bottom" 
                className="max-h-[92dvh] h-auto rounded-t-xl p-0 glass overflow-hidden z-[60] flex flex-col"
            >
                <div className="absolute top-0 left-0 right-0 h-32 opacity-10 blur-3xl pointer-events-none bg-primary" />
                <div className="h-1.5 w-12 bg-muted/40 rounded-full mx-auto mt-3 mb-2 relative z-10 shrink-0" />
                <div className="flex-1 overflow-y-auto px-6 pb-12 relative z-10" data-scroll-container>
                    <SheetHeader className="px-0 py-4 shrink-0 border-b mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <SheetTitle className="text-2xl font-black tracking-tight">{t('loans')}</SheetTitle>
                                <SheetDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
                                    {loans?.length || 0} {t('totalLoans')}
                                </SheetDescription>
                            </div>
                            <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-10 w-10 rounded-full border-2 border-primary text-primary hover:bg-primary/10 hover:scale-[1.05] active:scale-[0.95] transition-all bg-transparent"
                                onClick={openAddLoan}
                            >
                                <Plus className="w-5 h-5 stroke-[3]" />
                            </Button>
                        </div>
                    </SheetHeader>

                    {!loans || loans.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
                            <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center">
                                <Info className="w-8 h-8 text-muted-foreground/40" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-1">{t('noLoansYet')}</h3>
                                <p className="text-sm text-muted-foreground max-w-[200px]">{t('loanSetupDescription')}</p>
                            </div>
                            <Button onClick={openAddLoan} className="mt-4 rounded-full px-8">
                                {t('addFirstLoan')}
                            </Button>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 pb-8">
                            <div className="grid grid-cols-1 gap-3">
                                {loans.map(loan => (
                                    <LoanCard
                                        key={loan.id}
                                        loan={loan}
                                        onClick={() => openEditLoan(loan)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
