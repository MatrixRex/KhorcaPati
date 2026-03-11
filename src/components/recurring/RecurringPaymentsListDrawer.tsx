import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { RecurringPaymentCard } from './RecurringPaymentCard';
import { useUIStore } from '@/stores/uiStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus, Info } from 'lucide-react';

export function RecurringPaymentsListDrawer() {
    const { isRecurringPaymentsListOpen, closeRecurringPaymentsList, openAddRecurringPayment, openEditRecurringPayment } = useUIStore();

    const recurringPayments = useLiveQuery(async () => {
        return await db.recurringPayments.orderBy('nextDueDate').toArray();
    });

    return (
        <Sheet open={isRecurringPaymentsListOpen} onOpenChange={(open) => !open && closeRecurringPaymentsList()}>
            <SheetContent side="bottom" className="h-[92vh] rounded-t-[32px] p-0 overflow-hidden border-none bg-background">
                <div className="h-1.5 w-12 bg-muted/40 rounded-full mx-auto mt-3 mb-2" />
                <div className="px-6 pb-6 h-full flex flex-col pt-2">
                    <SheetHeader className="px-0 py-4 shrink-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <SheetTitle className="text-2xl font-black tracking-tight">Recurring</SheetTitle>
                                <SheetDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
                                    {recurringPayments?.length || 0} Total Payments
                                </SheetDescription>
                            </div>
                            <Button 
                                variant="outline" 
                                size="icon" 
                                className="rounded-full h-10 w-10 border-primary/20 bg-primary/5 text-primary"
                                onClick={openAddRecurringPayment}
                            >
                                <Plus className="w-5 h-5" />
                            </Button>
                        </div>
                    </SheetHeader>

                    {!recurringPayments || recurringPayments.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
                            <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center">
                                <Info className="w-8 h-8 text-muted-foreground/40" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-1">No Recurring Payments</h3>
                                <p className="text-sm text-muted-foreground max-w-[200px]">Set up your monthly bills, subscriptions, or income.</p>
                            </div>
                            <Button onClick={openAddRecurringPayment} className="mt-4 rounded-full px-8">
                                Get Started
                            </Button>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 pb-8">
                            <div className="grid grid-cols-1 gap-3">
                                {recurringPayments.map(payment => (
                                    <RecurringPaymentCard
                                        key={payment.id}
                                        payment={payment}
                                        onClick={() => openEditRecurringPayment(payment)}
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
