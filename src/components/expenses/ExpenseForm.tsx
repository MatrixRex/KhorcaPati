import { useState, useEffect, useRef, useMemo } from 'react';
import { cn, formatAmount } from '@/lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useExpenseStore } from '@/stores/expenseStore';
import { useItemStore } from '@/stores/itemStore';
import { parseItemInput } from '@/parsers/itemParser';
import { format, parseISO } from 'date-fns';
import { db, type Expense } from '@/db/schema';
import { CategoryComboBox } from './CategoryComboBox';
import { GoalComboBox } from './GoalComboBox';
import { LoanComboBox } from './LoanComboBox';

import { useCategoryStore } from '@/stores/categoryStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUIStore } from '@/stores/uiStore';
import { ChevronRight, Plus, Layers, Trash2, Calculator, Edit2 } from 'lucide-react';
import { NumberPad } from '@/components/shared/NumberPad';

import { SuggestionInput } from './SuggestionInput';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useTranslation } from 'react-i18next';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';


const expenseSchema = z.object({
    amount: z.number().min(0.01, 'Please enter a valid amount'),
    type: z.enum(['expense', 'income']),
    category: z.string().min(1, 'Category is required'),
    goalId: z.number().nullable().optional(),
    loanId: z.number().nullable().optional(),
    date: z.string(),
    note: z.string().optional(),
    isRecurring: z.boolean(),
    isNested: z.boolean(),
    itemAutoTrack: z.boolean(),
    recurringInterval: z.enum(['daily', 'weekly', 'monthly', 'yearly']).nullable(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
    initialData?: Expense;
    parentId?: number | null;
    onSuccess?: () => void;
    onCancel?: () => void;
    hideCollectionToggle?: boolean;
    initialLoanId?: number | null;
}

export function ExpenseForm({ initialData, parentId: propParentId, onSuccess, onCancel, hideCollectionToggle, initialLoanId }: ExpenseFormProps) {
    const { t } = useTranslation();

    const [fixedParentId] = useState<number | null>(() => {
        if (initialData) return initialData.parentId;
        if (propParentId !== undefined) return propParentId;
        return null;
    });
    const [currentId, setCurrentId] = useState<number | undefined>(initialData?.id);
    const isSavingRef = useRef(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showUngroupDialog, setShowUngroupDialog] = useState(false);
    const [showNumberPad, setShowNumberPad] = useState(false);
    const [wasAmountEdited, setWasAmountEdited] = useState(false);
    const categoryRef = useRef<HTMLInputElement>(null);
    const noteRef = useRef<HTMLInputElement>(null);
    const [mode, setMode] = useState<'regular' | 'debt'>(() => {
        if (initialData?.loanId) return 'debt';
        if (initialLoanId) return 'debt';
        return 'regular';
    });


    useEffect(() => {
        if (!initialData && !propParentId && !hideCollectionToggle) {
            setShowNumberPad(true);
        }
    }, []);

    const addExpense = useExpenseStore((state) => state.addExpense);
    const updateExpense = useExpenseStore((state) => state.updateExpense);
    const deleteExpense = useExpenseStore((state) => state.deleteExpense);
    const addItem = useItemStore((state) => state.addItem);
    const categories = useCategoryStore((state) => state.categories);

    const subExpenses = useLiveQuery(() =>
        currentId ? db.expenses.where('parentId').equals(currentId).toArray() : []
        , [currentId]);

    const form = useForm<ExpenseFormValues>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            amount: initialData?.amount || 0,
            type: initialData?.type || 'expense',
            category: initialData?.category || (mode === 'debt' ? 'Debt' : ''),
            goalId: initialData?.goalId || null,
            loanId: initialData?.loanId || initialLoanId || null,
            date: initialData?.date || format(new Date(), 'yyyy-MM-dd'),
            note: initialData?.note || '',
            isRecurring: initialData?.isRecurring || false,
            isNested: initialData?.isNested || false,
            itemAutoTrack: initialData?.itemAutoTrack ?? true,
            recurringInterval: initialData?.recurringInterval || null,
        },
    });

    const loanId = form.watch('loanId');
    const selectedLoanInDb = useLiveQuery(async () => loanId ? await db.loans.get(loanId) : undefined, [loanId]);
    const openEditLoan = useUIStore((state) => state.openEditLoan);

    const loanLinkedExpenses = useLiveQuery(() => 
        loanId ? db.expenses.where('loanId').equals(loanId).toArray() : []
    , [loanId]) || [];

    const currentAmount = form.watch('amount');
    const recordType = form.watch('type');

    const loanProgress = useMemo(() => {
        if (!selectedLoanInDb) return null;
        
        // Baseline: What's already in DB, excluding the current record we're editing
        const baselineRepayments = loanLinkedExpenses
            .filter(e => (selectedLoanInDb.type === 'taken' ? e.type === 'expense' : e.type === 'income'))
            .filter(e => e.id !== currentId)
            .reduce((s, e) => s + e.amount, 0);
            
        const baselineAdditional = loanLinkedExpenses
            .filter(e => (selectedLoanInDb.type === 'taken' ? e.type === 'income' : e.type === 'expense'))
            .filter(e => e.id !== currentId)
            .reduce((s, e) => s + e.amount, 0);

        const totalGrossAmount = selectedLoanInDb.totalAmount + baselineAdditional;
        const currentPercentage = totalGrossAmount > 0 ? Math.min((baselineRepayments / totalGrossAmount) * 100, 100) : 0;
        
        // Check if current action decreases debt (Repayment)
        const isRepayment = (selectedLoanInDb.type === 'taken' && recordType === 'expense') || 
                          (selectedLoanInDb.type === 'given' && recordType === 'income');
        
        const projectedRepayments = baselineRepayments + (isRepayment ? currentAmount : 0);
        const projectedPercentage = totalGrossAmount > 0 ? Math.min((projectedRepayments / totalGrossAmount) * 100, 100) : 0;
        const remainingAmount = Math.max(0, totalGrossAmount - baselineRepayments);
        
        return { 
            percentage: currentPercentage, 
            projectedPercentage, 
            remainingAmount, 
            totalGrossAmount,
            isRepayment
        };
    }, [selectedLoanInDb, loanLinkedExpenses, currentAmount, recordType, currentId]);

    useEffect(() => {
        if (mode === 'debt') {
            if (selectedLoanInDb) {
                const categoryName = selectedLoanInDb.type === 'given' ? 'Lent' : 'Borrowed';
                form.setValue('category', categoryName, { shouldDirty: true });
                
                // Set default type for new records in debt mode
                // Lent (given) -> Repaid (income), Borrowed (taken) -> Paid Back (expense)
                if (!initialData && !currentId) {
                    const defaultType = selectedLoanInDb.type === 'given' ? 'income' : 'expense';
                    form.setValue('type', defaultType, { shouldDirty: true });
                }
            } else {
                form.setValue('category', 'Debt', { shouldDirty: true });
            }
            if (currentId) form.handleSubmit(performSave)();
        }
    }, [mode, selectedLoanInDb, initialData, currentId]);

    // Reactive restriction for overpayment
    useEffect(() => {
        if (mode === 'debt' && loanProgress?.isRepayment && loanId) {
            const currentAmount = form.getValues('amount');
            if (currentAmount > loanProgress.remainingAmount) {
                form.setValue('amount', loanProgress.remainingAmount);
            }
        }
    }, [loanId, recordType, mode, loanProgress?.remainingAmount, loanProgress?.isRepayment]);


    const isNested = form.watch('isNested');

    useEffect(() => {
        if (isNested && subExpenses && subExpenses.length > 0) {
            const parentType = form.getValues('type');
            const totalAmount = subExpenses.reduce((sum, e) => {
                return e.type === parentType ? sum + e.amount : sum - e.amount;
            }, 0);
            const latestDate = subExpenses.reduce((latest, e) => (e.date > latest ? e.date : latest), subExpenses[0].date);

            form.setValue('amount', Math.max(0, totalAmount));
            form.setValue('date', latestDate);

            performSave(form.getValues());
        }
    }, [isNested, subExpenses]);

    const handleAmountDone = () => {
        setShowNumberPad(false);
        setTimeout(() => categoryRef.current?.focus(), 150);
    };

    const handleCategoryEnter = () => {
        setTimeout(() => noteRef.current?.focus(), 50);
    };

    const handleNoteEnter = () => {
        form.handleSubmit(performSave)();
    };

    const handleUngroup = async () => {
        if (!currentId || !subExpenses) return;
        try {
            await db.transaction('rw', db.expenses, async () => {
                const subIds = subExpenses.map(s => s.id!).filter(id => id !== undefined);
                if (subIds.length > 0) {
                    await db.expenses.where('id').anyOf(subIds as number[]).modify({ parentId: null });
                }
                await db.expenses.delete(currentId);
            });
            setShowUngroupDialog(false);
            onSuccess?.();
        } catch (err) {
            console.error("Ungrouping failed:", err);
        }
    };

    const handleDelete = async () => {
        const idToDelete = currentId || initialData?.id;
        if (!idToDelete) return;
        try {
            await deleteExpense(idToDelete);
            setShowDeleteDialog(false);
            onSuccess?.();
        } catch (err) {
            console.error(err);
        }
    };

    const processItems = async (expenseId: number, note: string, date: string) => {
        if (!note) return;
        const itemLines = note.split(/[,\n]/).filter(s => s.trim());
        for (const line of itemLines) {
            const parsed = parseItemInput(line.trim());
            if (parsed.name) {
                await addItem({
                    expenseId,
                    name: parsed.name,
                    rawInput: line.trim(),
                    qty: parsed.qty,
                    unit: parsed.unit,
                    date: date,
                    note: '',
                    createdAt: new Date().toISOString()
                });
            }
        }
    };

    const performSave = async (data: ExpenseFormValues): Promise<number | undefined> => {
        if (!data.isNested && data.amount <= 0) {
            form.setError('amount', { message: 'Please enter a valid amount' });
            setWasAmountEdited(true);
            return;
        }
        if (isSavingRef.current) return currentId;

        isSavingRef.current = true;
        try {
            const categoryInDb = await db.categories
                .filter(c => c.name.toLowerCase() === data.category.trim().toLowerCase())
                .first();
            const defaultCat = await db.categories.where('isDefault').equals(1).first();
            const validCategory = categoryInDb?.name || defaultCat?.name || 'Unlisted';

            let finalParentId = fixedParentId;
            if (currentId && finalParentId === currentId) {
                finalParentId = null;
            }

            const payload: Omit<Expense, 'id'> = {
                ...data,
                type: data.type,
                category: validCategory,
                goalId: data.goalId || null,
                loanId: data.loanId || null,
                note: data.note || '',
                parentId: finalParentId,
                isNested: data.isNested,
                itemAutoTrack: data.itemAutoTrack,
                recurringNextDue: null,
                tags: initialData?.tags || [],
                createdAt: initialData?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            let savedId = currentId;
            if (currentId) {
                await updateExpense(currentId, payload);
                await db.items.where('expenseId').equals(currentId).delete();
                if (data.itemAutoTrack) {
                    await processItems(currentId, data.note || '', data.date);
                }
            } else {
                const newId = await addExpense(payload);
                savedId = newId;
                setCurrentId(newId);
                if (data.itemAutoTrack) {
                    await processItems(newId, data.note || '', data.date);
                }
            }
            return savedId;
        } catch (err) {
            console.error("Save failed:", err);
            return undefined;
        } finally {
            isSavingRef.current = false;
        }
    };

    const handleBlur = () => {
        const values = form.getValues();
        if (values.isNested || values.amount > 0) {
            form.handleSubmit(performSave)();
        }
    };

    return (
        <>
            <SheetHeader className="mb-6 flex flex-row items-center justify-between p-0">
                <SheetTitle className="text-xl font-black">
                    {initialData ? (hideCollectionToggle ? t('editSubRecord') : t('editRecord')) : (hideCollectionToggle ? t('addSubRecord') : t('addRecord'))}
                </SheetTitle>
                <div className="flex bg-muted p-0.5 rounded-lg border border-border/50">
                    <button
                        type="button"
                        onClick={() => {
                            setMode('regular');
                            form.setValue('loanId', null, { shouldDirty: true });
                        }}
                        className={cn(
                            "px-3 py-1 text-[10px] font-black uppercase tracking-tight rounded-lg transition-all",
                            mode === 'regular' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {t('regular')}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setMode('debt');
                            form.setValue('itemAutoTrack', false, { shouldDirty: true });
                            form.setValue('goalId', null, { shouldDirty: true });
                        }}
                        className={cn(
                            "px-3 py-1 text-[10px] font-black uppercase tracking-tight rounded-lg transition-all",
                            mode === 'debt' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {t('debt')}
                    </button>
                </div>
            </SheetHeader>

            <form className="space-y-4 pb-6">
                {mode === 'debt' ? (
                    /* DEBT MODE LAYOUT */
                    <>
                        {/* 1. Loan Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="loan" className="text-[11px] font-bold uppercase">{t('loans')}</Label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Controller
                                        control={form.control}
                                        name="loanId"
                                        render={({ field }) => (
                                            <LoanComboBox
                                                value={field.value ?? null}
                                                placeholder={t('selectLoan')}
                                                onChange={(val) => {
                                                    field.onChange(val);
                                                    form.handleSubmit(performSave)();
                                                }}
                                                className="h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50"
                                            />
                                        )}
                                    />
                                </div>
                                {selectedLoanInDb && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-12 w-12 rounded-xl shrink-0 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 shadow-sm"
                                        onClick={() => openEditLoan(selectedLoanInDb)}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* 2. Progress Bar & Remaining Amount */}
                        {loanProgress && (
                            <div className="bg-muted/30 p-4 rounded-2xl border border-border/10 space-y-3">
                                <div className="flex justify-between items-end mb-1">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                                            {selectedLoanInDb?.type === 'given' ? t('collectionProgress') : t('loanProgress')}
                                        </span>
                                        <span className={cn(
                                            "text-sm font-black",
                                            selectedLoanInDb?.type === 'taken' ? "text-red-600" : "text-green-600"
                                        )}>
                                            ৳{formatAmount(loanProgress.remainingAmount)} {t('remaining')}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-black text-muted-foreground/60">
                                        {Math.round(loanProgress.projectedPercentage)}%
                                    </span>
                                </div>
                                <div className="relative h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                                    {/* Projected Progress Bar (Shadow) */}
                                    <div 
                                        className={cn(
                                            "absolute inset-y-0 left-0 transition-all duration-500 ease-out opacity-40",
                                            selectedLoanInDb?.type === 'taken' ? "bg-red-400" : "bg-green-400"
                                        )}
                                        style={{ width: `${loanProgress.projectedPercentage}%` }}
                                    />
                                    {/* Current Progress Bar */}
                                    <div 
                                        className={cn(
                                            "absolute inset-y-0 left-0 transition-all duration-1000 ease-out",
                                            selectedLoanInDb?.type === 'taken' ? "bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.4)]" : "bg-green-600 shadow-[0_0_8px_rgba(22,163,74,0.4)]"
                                        )}
                                        style={{ width: `${loanProgress.percentage}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* 3. Type Toggle */}
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex bg-muted p-1 rounded-xl w-full">
                                <button
                                    type="button"
                                    onClick={() => {
                                        form.setValue('type', 'expense', { shouldDirty: true });
                                        if (currentId) form.handleSubmit(performSave)();
                                    }}
                                    className={cn(
                                        "flex-1 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all",
                                        form.watch('type') === 'expense'
                                            ? "bg-rose-500 text-white shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {form.watch('category') === 'Lent' ? t('lentOut') : (form.watch('category') === 'Borrowed' ? t('paidBackOut') : t('expenseLabel'))}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        form.setValue('type', 'income', { shouldDirty: true });
                                        if (currentId) form.handleSubmit(performSave)();
                                    }}
                                    className={cn(
                                        "flex-1 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all",
                                        form.watch('type') === 'income'
                                            ? "bg-emerald-500 text-white shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {form.watch('category') === 'Lent' ? t('repaidIn') : (form.watch('category') === 'Borrowed' ? t('borrowedIn') : t('incomeLabel'))}
                                </button>
                            </div>
                        </div>

                        {/* 4. Amount + Date */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 relative">
                                <Label htmlFor="amount" className="text-[11px] font-bold uppercase">{t('amount')}</Label>
                                <div className="relative">
                                    <Input
                                        id="amount"
                                        type="text"
                                        readOnly
                                        value={form.watch('amount') ? `৳${formatAmount(form.watch('amount'))}` : '৳০'}
                                        onClick={() => setShowNumberPad(true)}
                                        className={cn(
                                            "pr-10 cursor-pointer caret-transparent font-black text-lg h-12 rounded-xl transition-all border-border bg-background/50 shadow-sm focus:bg-background/80 focus:border-primary/50",
                                            wasAmountEdited && form.getValues('amount') <= 0 && "border-destructive ring-2 ring-destructive/20"
                                        )}
                                        placeholder="৳০"
                                    />
                                    <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                                </div>
                                {form.formState.errors.amount && (
                                    <p className="text-rose-600 text-[11px] font-black mt-1 ml-1 uppercase tracking-tight leading-none antialiased">{form.formState.errors.amount.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="date" className="text-[11px] font-bold uppercase">{t('date')}</Label>
                                <Controller
                                    control={form.control}
                                    name="date"
                                    render={({ field }) => (
                                        <DatePicker
                                            date={field.value ? parseISO(field.value) : undefined}
                                            setDate={(date) => {
                                                const newDate = date ? format(date, 'yyyy-MM-dd') : '';
                                                field.onChange(newDate);
                                                if (newDate) {
                                                    form.handleSubmit(performSave)();
                                                }
                                            }}
                                            className="h-12 rounded-xl font-medium"
                                        />
                                    )}
                                />
                            </div>
                        </div>

                        {/* 5. Note */}
                        <div className="space-y-2">
                            <Label htmlFor="note" className="text-[11px] font-bold uppercase">{t('note')}</Label>
                            <Controller
                                control={form.control}
                                name="note"
                                render={({ field }) => (
                                    <SuggestionInput
                                        ref={noteRef}
                                        id="note"
                                        type="note"
                                        disableSuggestions
                                        placeholder={t('expenseNoteOnlyPlaceholder')}
                                        value={field.value || ''}
                                        onChange={(val: string) => {
                                            field.onChange(val);
                                        }}
                                        onBlur={() => {
                                            field.onBlur();
                                            handleBlur();
                                        }}
                                        onEnter={handleNoteEnter}
                                        className="h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50"
                                    />
                                )}
                            />
                        </div>

                        {/* 6. Category (Grayed Out) */}
                        <div className="space-y-2">
                            <Label htmlFor="category" className="text-[11px] font-bold uppercase">{t('category')}</Label>
                            <div className="w-full">
                                <CategoryComboBox
                                    ref={categoryRef}
                                    value={form.watch('category')}
                                    disabled
                                    placeholder={t('autoSetFromLoan')}
                                    onChange={(val: string) => {
                                        form.setValue('category', val, { shouldDirty: true });
                                    }}
                                    onBlur={() => form.handleSubmit(performSave)()}
                                    onEnter={handleCategoryEnter}
                                    className="h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50"
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    /* REGULAR MODE LAYOUT */
                    <>
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex bg-muted p-1 rounded-xl w-full">
                                <button
                                    type="button"
                                    onClick={() => {
                                        form.setValue('type', 'expense', { shouldDirty: true });
                                        if (currentId) form.handleSubmit(performSave)();
                                    }}
                                    className={cn(
                                        "flex-1 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all",
                                        form.watch('type') === 'expense'
                                            ? "bg-rose-500 text-white shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {t('expenseLabel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        form.setValue('type', 'income', { shouldDirty: true });
                                        if (currentId) form.handleSubmit(performSave)();
                                    }}
                                    className={cn(
                                        "flex-1 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all",
                                        form.watch('type') === 'income'
                                            ? "bg-emerald-500 text-white shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {t('incomeLabel')}
                                </button>
                            </div>
                        </div>

                        {!hideCollectionToggle && (
                            <div className={cn(
                                "flex items-center justify-between p-3 rounded-2xl border transition-all duration-300",
                                isNested ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border/20"
                            )}>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <Layers className={cn("w-4 h-4", isNested ? "text-primary" : "text-muted-foreground")} />
                                        <span className="text-xs font-black uppercase tracking-tight">{t('collectionMode')}</span>
                                    </div>
                                    <span className="text-[9px] text-muted-foreground font-medium">{t('collectionDescription')}</span>
                                </div>
                                <Switch
                                    checked={isNested}
                                    onCheckedChange={() => {
                                        const newVal = !isNested;
                                        if (!newVal && subExpenses && subExpenses.length > 0) {
                                            setShowUngroupDialog(true);
                                        } else {
                                            form.setValue('isNested', newVal, { shouldDirty: true });
                                            form.handleSubmit(performSave)();
                                        }
                                    }}
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 relative">
                                <Label htmlFor="amount" className={cn("text-[11px] font-bold uppercase", isNested && "opacity-50")}>
                                    {isNested ? t('totalAmount') : t('amount')}
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="amount"
                                        type="text"
                                        readOnly
                                        disabled={isNested}
                                        value={form.watch('amount') ? `৳${formatAmount(form.watch('amount'))}` : '৳০'}
                                        onClick={() => !isNested && setShowNumberPad(true)}
                                        className={cn(
                                            "pr-10 cursor-pointer caret-transparent font-black text-lg h-12 rounded-xl transition-all",
                                            isNested ? "bg-muted border-dashed opacity-70" : "bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50",
                                            !isNested && wasAmountEdited && form.getValues('amount') <= 0 && "border-destructive ring-2 ring-destructive/20"
                                        )}
                                        placeholder="৳০"
                                    />
                                    {!isNested && <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />}
                                </div>
                                {form.formState.errors.amount && (
                                    <p className="text-rose-600 text-[11px] font-black mt-1 ml-1 uppercase tracking-tight leading-none antialiased">{form.formState.errors.amount.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="date" className={cn("text-[11px] font-bold uppercase", isNested && "opacity-50")}>{t('date')}</Label>
                                <Controller
                                    control={form.control}
                                    name="date"
                                    render={({ field }) => (
                                        <DatePicker
                                            disabled={isNested}
                                            date={field.value ? parseISO(field.value) : undefined}
                                            setDate={(date) => {
                                                const newDate = date ? format(date, 'yyyy-MM-dd') : '';
                                                field.onChange(newDate);
                                                if (newDate) {
                                                    form.handleSubmit(performSave)();
                                                }
                                            }}
                                            className="h-12 rounded-xl font-medium bg-background/50 border-border"
                                        />
                                    )}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category" className="text-[11px] font-bold uppercase">{t('category')}</Label>
                            <div className="w-full">
                                <CategoryComboBox
                                    ref={categoryRef}
                                    value={form.watch('category')}
                                    onChange={(val: string) => {
                                        form.setValue('category', val, { shouldDirty: true });
                                    }}
                                    onBlur={() => form.handleSubmit(performSave)()}
                                    onEnter={handleCategoryEnter}
                                    className="h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="goal" className="text-[11px] font-bold uppercase">{t('linkToGoal')}</Label>
                            <div className="w-full">
                                <Controller
                                    control={form.control}
                                    name="goalId"
                                    render={({ field }) => (
                                        <GoalComboBox
                                            value={field.value ?? null}
                                            onChange={(val) => {
                                                field.onChange(val);
                                                form.handleSubmit(performSave)();
                                            }}
                                            className="h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50"
                                        />
                                    )}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                {!isNested && (
                                    <div className="flex bg-muted p-0.5 rounded-lg border border-border/50">
                                        <button
                                            type="button"
                                            onPointerDown={(e) => {
                                                e.preventDefault();
                                                form.setValue('itemAutoTrack', true, { shouldDirty: true });
                                                form.handleSubmit(performSave)();
                                                noteRef.current?.focus();
                                            }}
                                            className={cn(
                                                "px-2 py-0.5 text-[9px] font-black uppercase tracking-tight rounded-lg transition-all",
                                                form.watch('itemAutoTrack') ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                                            )}
                                        >
                                            {t('itemsLabel')}
                                        </button>
                                        <button
                                            type="button"
                                            onPointerDown={(e) => {
                                                e.preventDefault();
                                                form.setValue('itemAutoTrack', false, { shouldDirty: true });
                                                form.handleSubmit(performSave)();
                                                noteRef.current?.focus();
                                            }}
                                            className={cn(
                                                "px-2 py-0.5 text-[9px] font-black uppercase tracking-tight rounded-lg transition-all",
                                                !form.watch('itemAutoTrack') ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                                            )}
                                        >
                                            {t('notesLabel')}
                                        </button>
                                    </div>
                                )}
                                {isNested && <Label htmlFor="note" className="text-[11px] font-bold uppercase">{t('collectionTitle')}</Label>}
                            </div>
                            <Controller
                                control={form.control}
                                name="note"
                                render={({ field }) => (
                                    <SuggestionInput
                                        ref={noteRef}
                                        id="note"
                                        type="note"
                                        disableSuggestions={isNested || !form.watch('itemAutoTrack')}
                                        placeholder={isNested ? t('collectionTitlePlaceholder') : (form.watch('itemAutoTrack') ? t('expenseNotePlaceholder') : t('expenseNoteOnlyPlaceholder'))}
                                        value={field.value || ''}
                                        onChange={(val: string) => {
                                            field.onChange(val);
                                        }}
                                        onBlur={() => {
                                            field.onBlur();
                                            handleBlur();
                                        }}
                                        onEnter={handleNoteEnter}
                                        className="h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50"
                                    />
                                )}
                            />
                            {!isNested && form.watch('itemAutoTrack') && <p className="text-[9px] text-muted-foreground font-medium italic">{t('autoTrackDescription')}</p>}
                        </div>

                        {isNested && (
                            <div className="space-y-3 pt-4 border-t border-dashed border-border mt-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <Label className="text-[11px] font-black uppercase tracking-widest text-primary">{t('subRecords')}</Label>
                                        <span className="text-[9px] text-muted-foreground">{t('individualExpenses')}</span>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-[11px] gap-1.5 rounded-full px-4 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 shadow-sm"
                                        onClick={async () => {
                                            if (!isNested) form.setValue('isNested', true);
                                            const parentId = await performSave({ ...form.getValues(), isNested: true });
                                            if (parentId) useUIStore.getState().openAddSubRecord(parentId);
                                        }}
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        {t('addSubRecord')}
                                    </Button>
                                </div>
                                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                                    {subExpenses && subExpenses.length > 0 ? (
                                        subExpenses.map((sub: Expense) => (
                                            <div key={sub.id} className="flex flex-col gap-1 p-3 rounded-2xl bg-primary/5 border border-primary/10 group active:scale-[0.98] transition-all cursor-pointer">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black">{sub.note || sub.category}</span>
                                                        <span className="text-[10px] text-muted-foreground uppercase">{sub.category}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 ml-2">
                                                        <span className={cn(
                                                            "text-sm font-black",
                                                            sub.type === 'income' ? "text-green-600" : "text-red-600"
                                                        )}>
                                                            ৳{formatAmount(sub.amount)}
                                                        </span>
                                                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center border-2 border-dashed rounded-3xl bg-muted/20 border-border/20">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{t('emptyCollection')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}

                <div className="pt-4 space-y-2">
                    {onCancel && (
                        <Button
                            type="button"
                            variant="default"
                            onClick={async () => {
                                const values = form.getValues();
                                if (!values.isNested && values.amount <= 0) {
                                    form.setError('amount', { message: 'Amount is required' });
                                    setWasAmountEdited(true);
                                    setShowNumberPad(true);
                                    return;
                                }
                                const currentVal = form.getValues('category');
                                const match = categories.find(c => c.name.toLowerCase() === currentVal.trim().toLowerCase());
                                if (!match) {
                                    const defCat = categories.find(c => c.isDefault);
                                    form.setValue('category', defCat?.name || 'Unlisted');
                                }
                                await form.handleSubmit(performSave)();
                                onSuccess ? onSuccess() : (onCancel && onCancel());
                            }}
                            className="w-full btn-premium"
                        >
                            {t('done')}
                        </Button>
                    )}
                    {(currentId || initialData) && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setShowDeleteDialog(true)}
                            className="w-full btn-destructive-premium"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('deleteRecord')}
                        </Button>
                    )}
                </div>
            </form>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="w-[90%] rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('thisWillPermanentlyDelete')}{isNested ? t('andSubRecords') : ''}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-2 mt-4">
                        <AlertDialogCancel className="flex-1 mt-0 rounded-xl">{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="flex-1 btn-destructive-premium !h-10">
                            {t('deleteRecord')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={showUngroupDialog} onOpenChange={setShowUngroupDialog}>
                <AlertDialogContent className="w-[90%] rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('ungroupCollection')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('ungroupDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-2 mt-4">
                        <AlertDialogCancel className="flex-1 mt-0 rounded-xl">{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUngroup} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
                            {t('ungroup')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {showNumberPad && (
                <NumberPad
                    value={String(form.getValues('amount'))}
                    label={form.watch('type') === 'expense' ? `${t('expenseLabel')} ${t('amount')}` : `${t('incomeLabel')} ${t('amount')}`}
                    onChange={(val) => {
                        let num = parseFloat(val);
                        if (!isNaN(num)) {
                            // Restrict overpay in debt mode for repayments
                            if (mode === 'debt' && loanProgress?.isRepayment && loanProgress.remainingAmount > 0 && num > loanProgress.remainingAmount) {
                                num = loanProgress.remainingAmount;
                            }
                            form.setValue('amount', num);
                            setWasAmountEdited(true);
                        }
                    }}
                    onDone={handleAmountDone}
                    onClose={() => setShowNumberPad(false)}
                />
            )}
        </>
    );
}
