import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DatePicker } from '@/components/ui/date-picker';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLoanStore } from '@/stores/loanStore';
import { db, type Loan } from '@/db/schema';
import { NumberPad } from '@/components/shared/NumberPad';
import { Calculator, Plus, Link as LinkIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useExpenseStore } from '@/stores/expenseStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LoanLinker } from './LoanLinker';
import { useUIStore } from '@/stores/uiStore';

const loanSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    person: z.string().min(1, 'Person is required'),
    totalAmount: z.number().min(1, 'Amount must be greater than 0'),
    currentAmount: z.number().min(0, 'Current amount cannot be negative'),
    type: z.enum(['taken', 'given']),
    dueDate: z.string().optional(),
    note: z.string().optional(),
});

type LoanFormValues = z.infer<typeof loanSchema>;

interface LoanFormProps {
    initialData?: Loan;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function LoanForm({ initialData, onSuccess, onCancel }: LoanFormProps) {
    const { t } = useTranslation();
    const addLoan = useLoanStore((state) => state.addLoan);
    const updateLoan = useLoanStore((state) => state.updateLoan);
    const deleteLoan = useLoanStore((state) => state.deleteLoan);
    const addExpense = useExpenseStore((state) => state.addExpense);
    
    const [activeField, setActiveField] = useState<'total' | 'current' | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    
    // Linking state
    const [linkMode, setLinkMode] = useState<'new' | 'link'>('new');
    const [selectedExpenseId, setSelectedExpenseId] = useState<number | null>(null);
    const [selectedExpenseNote, setSelectedExpenseNote] = useState<string | null>(null);
    const { isLoanLinkerOpen, setLoanLinkerOpen } = useUIStore();
    const isLinkerOpen = isLoanLinkerOpen;
    const setIsLinkerOpen = setLoanLinkerOpen;

    const form = useForm<LoanFormValues>({
        resolver: zodResolver(loanSchema),
        defaultValues: {
            title: initialData?.title || '',
            person: initialData?.person || '',
            totalAmount: initialData?.totalAmount || 0,
            currentAmount: initialData?.currentAmount || 0,
            type: initialData?.type || 'taken',
            dueDate: initialData?.dueDate || '',
            note: initialData?.note || '',
        },
    });

    const onSubmit = async (data: LoanFormValues) => {
        try {
            const payload: Omit<Loan, 'id'> = {
                ...data,
                note: data.note || '',
                dueDate: data.dueDate || null,
                createdAt: initialData?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            let loanId: number;
            if (initialData?.id) {
                await updateLoan(initialData.id, payload);
                loanId = initialData.id;
            } else {
                loanId = await addLoan(payload);
            }

            // Handle record creation/linking
            if (linkMode === 'new') {
                const expensePayload = {
                    amount: data.totalAmount,
                    type: data.type === 'given' ? 'expense' as const : 'income' as const,
                    category: data.type === 'given' ? 'Lent' : 'Borrowed',
                    date: format(new Date(), 'yyyy-MM-dd'),
                    note: data.title,
                    loanId: loanId,
                    parentId: null,
                    isNested: false,
                    isRecurring: false,
                    itemAutoTrack: false,
                    recurringInterval: null,
                    recurringNextDue: null,
                    tags: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                await addExpense(expensePayload);
            } else if (linkMode === 'link' && selectedExpenseId) {
                const categoryName = data.type === 'given' ? 'Lent' : 'Borrowed';
                await db.expenses.update(selectedExpenseId, { 
                    category: categoryName,
                    loanId: loanId,
                    updatedAt: new Date().toISOString()
                });
                await useLoanStore.getState().recalculateLoanAmount(loanId);
            }

            onSuccess?.();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async () => {
        if (!initialData?.id) return;
        try {
            await deleteLoan(initialData.id);
            setShowDeleteDialog(false);
            onSuccess?.();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex bg-muted p-1 rounded-xl w-full mb-2">
                <button
                    type="button"
                    onClick={() => form.setValue('type', 'taken', { shouldDirty: true })}
                    className={cn(
                        "flex-1 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all",
                        form.watch('type') === 'taken'
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {t('taken')}
                </button>
                <button
                    type="button"
                    onClick={() => form.setValue('type', 'given', { shouldDirty: true })}
                    className={cn(
                        "flex-1 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all",
                        form.watch('type') === 'given'
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {t('given')}
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="person" className="label-header">{t('person')}</Label>
                    <Input id="person" placeholder={t('personExample')} {...form.register('person')} className="h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="title" className="label-header">{t('loanTitle')}</Label>
                    <Input id="title" placeholder={t('loanExample')} {...form.register('title')} className="h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50" />
                </div>
            </div>

            <div className="space-y-2 relative">
                <Label htmlFor="totalAmount" className="label-header">{t('totalAmount')} (৳)</Label>
                <div className="relative">
                    <Input
                        id="totalAmount"
                        type="text"
                        readOnly
                        value={form.watch('totalAmount') ? `৳${form.watch('totalAmount')}` : '৳০'}
                        onClick={() => setActiveField('total')}
                        className={cn(
                            "pr-10 cursor-pointer caret-transparent font-bold text-lg h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50",
                            activeField === 'total' && "ring-2 ring-primary/50 border-primary bg-primary/5"
                        )}
                    />
                    <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                </div>
            </div>

            {activeField && (
                <NumberPad
                    value={String(form.getValues('totalAmount'))}
                    label={t('totalLoanAmount')}
                    inputId="totalAmount"
                    onChange={(val) => {
                        const num = parseFloat(val);
                        if (!isNaN(num)) {
                            form.setValue('totalAmount', num);
                        }
                    }}
                    onDone={() => setActiveField(null)}
                    onClose={() => setActiveField(null)}
                />
            )}

            <div className="space-y-2">
                <Label htmlFor="dueDate" className="label-header">{t('deadline')} ({t('optional')})</Label>
                <Controller
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                        <DatePicker
                            date={field.value ? parseISO(field.value) : undefined}
                            setDate={(date) => {
                                field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                            }}
                            className="h-12 rounded-xl bg-background/50 border-border"
                        />
                    )}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="note" className="text-[11px] font-bold uppercase">{t('note')} ({t('optional')})</Label>
                <Input
                    id="note"
                    placeholder={t('note')}
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={true}
                    className="h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50"
                    {...form.register('note')}
                />
            </div>

            {!initialData && (
                <div className="space-y-3 pt-2">
                    <Label className="label-header">{t('linkRecord')}</Label>
                    <div className="flex bg-muted p-1 rounded-xl w-full">
                        <button
                            type="button"
                            onClick={() => setLinkMode('new')}
                            className={cn(
                                "flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 rounded-lg transition-all border",
                                linkMode === 'new'
                                    ? "bg-primary/10 border-primary/30 text-primary shadow-sm"
                                    : "text-muted-foreground border-transparent hover:text-foreground"
                            )}
                        >
                            <Plus className="w-3 h-3 stroke-[3]" />
                            {t('linkTypeNew')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsLinkerOpen(true)}
                            className={cn(
                                "flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 rounded-lg transition-all border",
                                linkMode === 'link'
                                    ? "bg-primary border-primary text-white shadow-sm"
                                    : "text-muted-foreground border-transparent hover:text-foreground"
                            )}
                        >
                            <LinkIcon className="w-3 h-3 stroke-[3]" />
                            {linkMode === 'link' ? (selectedExpenseNote || t('linkTypeLink')) : t('linkTypeLink')}
                        </button>
                    </div>
                </div>
            )}

            <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 btn-premium">
                    {initialData ? t('editLoan') : t('addLoan')}
                </Button>
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel} className="flex-1 btn-secondary-premium">
                        {t('cancel')}
                    </Button>
                )}
            </div>

            {initialData?.id && (
                <Button
                    type="button"
                    variant="ghost"
                    className="w-full btn-destructive-premium"
                    onClick={() => setShowDeleteDialog(true)}
                >
                    {t('deleteLoan')}
                </Button>
            )}
        </form>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent className="w-[90%] rounded-xl">
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('deleteLoanQuestion')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('deleteLoanDescription', { person: initialData?.person })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row gap-2 mt-4">
                    <AlertDialogCancel className="flex-1 mt-0 btn-secondary-premium !h-10">{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        className="flex-1 btn-destructive-premium !h-10"
                    >
                        {t('deleteRecord')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Sheet open={isLinkerOpen} onOpenChange={setIsLinkerOpen}>
            <SheetContent 
                side="bottom" 
                className="h-[85vh] rounded-t-[32px] px-4 pb-0 z-[90]"
                overlayClassName="z-[90]"
            >
                <SheetHeader className="mb-4">
                    <SheetTitle>{t('selectRecordToLink')}</SheetTitle>
                </SheetHeader>
                <LoanLinker 
                    loan={form.getValues()}
                    selectedExpenseId={selectedExpenseId}
                    onSelect={(exp) => {
                        if (exp) {
                            setSelectedExpenseId(exp.id!);
                            setSelectedExpenseNote(exp.note || exp.category);
                            setLinkMode('link');
                        } else {
                            setSelectedExpenseId(null);
                            setSelectedExpenseNote(null);
                            setLinkMode('new');
                        }
                    }}
                    onDone={() => setIsLinkerOpen(false)}
                />
            </SheetContent>
        </Sheet>
        </>
    );
}
