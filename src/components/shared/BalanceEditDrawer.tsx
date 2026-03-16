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
    SheetTitle
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
            <SheetContent 
                side="bottom" 
                className="max-h-[92dvh] h-auto rounded-t-xl p-0 glass z-[60] flex flex-col overflow-hidden"
            >
                {/* Unified Handle Bar */}
                <div className="h-1.5 w-12 bg-muted/40 rounded-full mx-auto mt-3 mb-2 shrink-0" />
                
                <div className="flex-1 overflow-y-auto px-6 pb-10 pt-2" data-scroll-container>
                    {/* Header inside scroll area like ExpenseForm */}
                    <SheetHeader className="mb-6 flex flex-row items-center justify-between p-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/10">
                                <Wallet className="w-5 h-5" />
                            </div>
                            <div className="space-y-0.5">
                                <SheetTitle className="text-xl font-black tracking-tight text-left leading-tight font-heading">{t('editBalance')}</SheetTitle>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 text-left">
                                    {t('balanceDrawerDescription')}
                                </p>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="space-y-6">
                        {/* Current & Desired Balance */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-end px-1">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">{t('desiredBalance')}</Label>
                                <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">{t('current')}</span>
                                    <span className="text-sm font-black opacity-30 italic font-heading tracking-tighter">৳{formatAmount(currentTotalBalance)}</span>
                                </div>
                            </div>
                            <div className="relative group">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-primary/30 italic transition-colors group-focus-within:text-primary/60">৳</span>
                                <Input 
                                    type="number"
                                    value={newBalance}
                                    onChange={(e) => setNewBalance(e.target.value)}
                                    className="h-16 pl-12 pr-6 text-3xl font-black rounded-2xl bg-foreground/5 border-none focus-visible:ring-2 focus-visible:ring-primary/20 font-heading tracking-tighter"
                                    placeholder={t('balancePlaceholder')}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Toggle */}
                        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 flex items-center justify-between transition-all hover:bg-primary/[0.08]">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-black tracking-tight text-primary font-heading">{t('createAdjustmentRecord')}</span>
                                <span className="text-[10px] text-primary/50 font-bold leading-relaxed">{t('adjustmentDescription')}</span>
                            </div>
                            <Switch 
                                checked={createRecord} 
                                onCheckedChange={setCreateRecord}
                                className="data-[state=checked]:bg-primary"
                            />
                        </div>

                        {/* Warning */}
                        {!createRecord && (
                            <div className="flex items-start gap-3.5 p-5 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-500 animate-reveal">
                                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-xs font-black uppercase tracking-wider">{t('headsUp')}</p>
                                    <p className="text-[10px] font-bold opacity-70 leading-relaxed">
                                        {t('balanceUpdateWarning')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="space-y-3 pt-6">
                        <Button 
                            className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest gap-3 shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-primary-foreground font-heading border-none"
                            onClick={handleSave}
                        >
                            <Check className="w-5 h-5 stroke-[4]" />
                            {t('updateBalance')}
                        </Button>
                        <Button 
                            variant="ghost"
                            className="w-full h-12 rounded-xl font-black text-[10px] uppercase tracking-widest text-muted-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-all"
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
