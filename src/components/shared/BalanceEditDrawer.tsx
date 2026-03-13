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
import { formatAmount } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export function BalanceEditDrawer() {
    const { isBalanceEditDrawerOpen, closeBalanceEdit } = useUIStore();
    const { initialBalance, setInitialBalance } = useSettingsStore();
    const { addExpense } = useExpenseStore();
    const { t } = useTranslation();

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
                category: t('adjustment'),
                date: format(new Date(), 'yyyy-MM-dd'),
                note: t('balanceManualAdjustment'),
                isRecurring: false,
                recurringInterval: null,
                recurringNextDue: null,
                itemAutoTrack: false,
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
            <SheetContent side="bottom" className="rounded-t-[28px] p-0 border-none overflow-hidden flex flex-col max-h-[85vh]">
                <div className="w-10 h-1 bg-muted rounded-full mx-auto mt-3 mb-1 shrink-0" />
                
                {/* Compact header */}
                <SheetHeader className="px-4 py-2 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Wallet className="w-4 h-4" />
                        </div>
                        <div>
                            <SheetTitle className="text-lg font-black tracking-tight text-left leading-tight">{t('editBalance')}</SheetTitle>
                            <SheetDescription className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60 text-left">
                                {t('balanceDrawerDescription')}
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
                    <div className="space-y-3">
                        {/* Balance input */}
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t('desiredBalance')}</Label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-black text-muted-foreground/40 italic">৳</span>
                                <Input 
                                    type="number"
                                    value={newBalance}
                                    onChange={(e) => setNewBalance(e.target.value)}
                                    className="h-12 pl-9 pr-4 text-2xl font-black rounded-2xl bg-muted/20 border-none focus-visible:ring-2 focus-visible:ring-primary"
                                    placeholder={t('balancePlaceholder')}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Toggle */}
                        <div className="bg-primary/5 border border-primary/10 rounded-2xl px-3 py-2.5 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-primary">{t('createAdjustmentRecord')}</span>
                                <span className="text-[10px] text-primary/60 font-medium">{t('adjustmentDescription')}</span>
                            </div>
                            <Switch 
                                checked={createRecord} 
                                onCheckedChange={setCreateRecord}
                                className="data-[state=checked]:bg-primary"
                            />
                        </div>

                        {/* Warning */}
                        {!createRecord && (
                            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-600">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <div className="space-y-0.5">
                                    <p className="text-xs font-bold">{t('headsUp')}</p>
                                    <p className="text-[10px] font-semibold opacity-80 leading-relaxed">
                                        {t('balanceUpdateWarning')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="space-y-2 pt-1">
                        <div className="flex justify-between items-center px-1 pb-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{t('current')}</span>
                            <span className="text-sm font-black opacity-40 italic">৳{formatAmount(currentTotalBalance)}</span>
                        </div>
                        <Button 
                            className="w-full h-11 rounded-2xl font-black text-sm uppercase tracking-widest gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            onClick={handleSave}
                        >
                            <Check className="w-4 h-4 stroke-[3]" />
                            {t('updateBalance')}
                        </Button>
                        <Button 
                            variant="ghost"
                            className="w-full h-9 rounded-xl font-bold text-xs uppercase tracking-widest text-muted-foreground"
                            onClick={closeBalanceEdit}
                        >
                            {t('cancel')}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
