import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { RecurringPaymentCard } from './RecurringPaymentCard';
import { useUIStore } from '@/stores/uiStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
                    <SheetHeader className="mb-6 flex flex-row items-center justify-between space-y-0">
                        <SheetTitle className="text-xl font-black tracking-tight">Recurring Payments</SheetTitle>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-full border-primary/20 text-primary hover:bg-primary/5 font-bold px-4"
                            onClick={openAddRecurringPayment}
                        >
                            <Plus className="w-4 h-4 mr-1.5" />
                            Add New
                        </Button>
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
