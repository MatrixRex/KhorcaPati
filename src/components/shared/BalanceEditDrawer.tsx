import { useState, useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle,
    SheetDescription
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Wallet, Check, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export function BalanceEditDrawer() {
    const { isBalanceEditDrawerOpen, closeBalanceEdit } = useUIStore();
    const { initialBalance, setInitialBalance } = useSettingsStore();
    const { addExpense } = useExpenseStore();

    const allExpenses = useLiveQuery(() => db.expenses.filter(e => !e.parentId).toArray()) || [];
    
    const derivedBalance = allExpenses.reduce((sum, exp) => {
        return exp.type === 'income' ? sum + exp.amount : sum - exp.amount;
    }, 0);

    const currentTotalBalance = initialBalance + derivedBalance;

    const [newBalance, setNewBalance] = useState<string>('');
    const [createRecord, setCreateRecord] = useState(true);

    useEffect(() => {
        if (isBalanceEditDrawerOpen) {
            setNewBalance(currentTotalBalance.toString());
        }
    }, [isBalanceEditDrawerOpen, currentTotalBalance]);

    const handleSave = async () => {
        const targetValue = parseFloat(newBalance);
        if (isNaN(targetValue)) return;

        const diff = targetValue - currentTotalBalance;

        if (Math.abs(diff) < 0.01) {
            closeBalanceEdit();
            return;
        }

        if (createRecord) {
            await addExpense({
                parentId: null,
                isNested: false,
                amount: Math.abs(diff),
                type: diff > 0 ? 'income' : 'expense',
                category: 'Adjustment',
                date: format(new Date(), 'yyyy-MM-dd'),
                note: 'Balance manual adjustment',
                isRecurring: false,
                recurringInterval: null,
                recurringNextDue: null,
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        } else {
            // New Initial Balance = targetValue - derivedBalance
            setInitialBalance(targetValue - derivedBalance);
        }

        closeBalanceEdit();
    };

    return (
        <Sheet open={isBalanceEditDrawerOpen} onOpenChange={(open) => !open && closeBalanceEdit()}>
            <SheetContent side="bottom" className="rounded-t-[40px] p-0 border-none overflow-hidden flex flex-col max-h-[85vh]">
                <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mt-4 mb-2 shrink-0" />
                
                <SheetHeader className="px-6 py-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <Wallet className="w-6 h-6" />
                        </div>
                        <div>
                            <SheetTitle className="text-2xl font-black tracking-tight text-left">Edit Balance</SheetTitle>
                            <SheetDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60 text-left">
                                Set your current cash in hand
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-8">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Desired Balance</Label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-muted-foreground/40 italic">৳</span>
                                <Input 
                                    type="number"
                                    value={newBalance}
                                    onChange={(e) => setNewBalance(e.target.value)}
                                    className="h-16 pl-10 pr-6 text-3xl font-black rounded-3xl bg-muted/20 border-none focus-visible:ring-2 focus-visible:ring-primary"
                                    placeholder="0"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="bg-primary/5 border border-primary/10 rounded-3xl p-4 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-primary">Create adjustment record</span>
                                <span className="text-[10px] text-primary/60 font-medium">Add an income/expense entry for the difference</span>
                            </div>
                            <Switch 
                                checked={createRecord} 
                                onCheckedChange={setCreateRecord}
                                className="data-[state=checked]:bg-primary"
                            />
                        </div>

                        {!createRecord && (
                            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-600">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-xs font-bold">Heads up!</p>
                                    <p className="text-[10px] font-semibold opacity-80 leading-relaxed">
                                        Updating without a record will change your 'Starting Balance' hidden in settings. 
                                        This won't show up in your recent activity or reports as a transaction.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 pt-4">
                        <div className="flex justify-between items-center px-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Current</span>
                            <span className="text-sm font-black opacity-40 italic">৳{currentTotalBalance.toLocaleString()}</span>
                        </div>
                        <Button 
                            className="w-full h-14 rounded-3xl font-black text-sm uppercase tracking-widest gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            onClick={handleSave}
                        >
                            <Check className="w-5 h-5 stroke-[3]" />
                            Update Balance
                        </Button>
                        <Button 
                            variant="ghost"
                            className="w-full h-12 rounded-2xl font-bold text-xs uppercase tracking-widest text-muted-foreground"
                            onClick={closeBalanceEdit}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
