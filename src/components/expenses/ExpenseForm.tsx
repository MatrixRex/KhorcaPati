import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
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
import { useCategoryStore } from '@/stores/categoryStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUIStore } from '@/stores/uiStore';
import { ChevronRight, Plus, Layers, Trash2, Calculator } from 'lucide-react';
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

const expenseSchema = z.object({
    amount: z.number().min(0.01, 'Please enter a valid amount'),
    type: z.enum(['expense', 'income']),
    category: z.string().min(1, 'Category is required'),
    goalId: z.number().nullable().optional(),
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
}

export function ExpenseForm({ initialData, parentId: propParentId, onSuccess, onCancel, hideCollectionToggle }: ExpenseFormProps) {
    const { t } = useTranslation();

    // Store initial parentId locally on mount to prevent it from changing if the global store changes
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

    // Focus Amount (NumberPad) on mount if it's a new record
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
            category: initialData?.category || '',
            goalId: initialData?.goalId || null,
            date: initialData?.date || format(new Date(), 'yyyy-MM-dd'),
            note: initialData?.note || '',
            isRecurring: initialData?.isRecurring || false,
            isNested: initialData?.isNested || false,
            itemAutoTrack: initialData?.itemAutoTrack ?? true,
            recurringInterval: initialData?.recurringInterval || null,
        },
    });

    const isNested = form.watch('isNested');

    // Auto-update amount and date for nested record based on sub-records
    useEffect(() => {
        if (isNested && subExpenses && subExpenses.length > 0) {
            const parentType = form.getValues('type');
            const totalAmount = subExpenses.reduce((sum, e) => {
                return e.type === parentType ? sum + e.amount : sum - e.amount;
            }, 0);
            const latestDate = subExpenses.reduce((latest, e) => (e.date > latest ? e.date : latest), subExpenses[0].date);

            form.setValue('amount', Math.max(0, totalAmount));
            form.setValue('date', latestDate);

            // Auto-save the parent after updating from sub-records
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
                    // Convert all sub-records to normal top-level records
                    await db.expenses.where('id').anyOf(subIds as number[]).modify({ parentId: null });
                }
                // Permanently delete the parent collection record
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
        // Nested records can have 0 amount if no sub-records yet
        if (!data.isNested && data.amount <= 0) {
            form.setError('amount', { message: 'Please enter a valid amount' });
            setWasAmountEdited(true); // Show error outline immediately
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

            // Prevent self-parenting
            let finalParentId = fixedParentId;
            if (currentId && finalParentId === currentId) {
                finalParentId = null;
            }

            const payload: Omit<Expense, 'id'> = {
                ...data,
                type: data.type,
                category: validCategory,
                goalId: data.goalId || null,
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
            <form className="space-y-4 pb-6">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex bg-muted p-1 rounded-xl w-full">
                        <button
                            type="button"
                            onClick={() => {
                                form.setValue('type', 'expense', { shouldDirty: true });
                                if (currentId) form.handleSubmit(performSave)();
                            }}
                            className={cn(
                                "flex-1 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all",
                                form.watch('type') === 'expense'
                                    ? "bg-primary text-primary-foreground shadow-sm"
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
                                "flex-1 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all",
                                form.watch('type') === 'income'
                                    ? "bg-green-600 text-white shadow-sm"
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
                                value={form.watch('amount') ? `৳${form.watch('amount').toFixed(0)}` : '৳0'}
                                onClick={() => !isNested && setShowNumberPad(true)}
                                className={cn(
                                    "pr-10 cursor-pointer caret-transparent font-black text-lg h-12 rounded-xl transition-all",
                                    isNested ? "bg-muted border-dashed opacity-70" : "border-primary/20 shadow-sm focus:border-primary",
                                    !isNested && wasAmountEdited && form.getValues('amount') <= 0 && "border-destructive ring-2 ring-destructive/20"
                                )}
                                placeholder="৳0"
                            />
                            {!isNested && <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />}
                        </div>
                        {form.formState.errors.amount && (
                            <p className="text-destructive text-[10px] font-bold">{form.formState.errors.amount.message}</p>
                        )}

                        {showNumberPad && (
                            <NumberPad
                                value={String(form.getValues('amount'))}
                                label={form.watch('type') === 'expense' ? `${t('expenseLabel')} ${t('amount')}` : `${t('incomeLabel')} ${t('amount')}`}
                                onChange={(val) => {
                                    const num = parseFloat(val);
                                    if (!isNaN(num)) {
                                        form.setValue('amount', num);
                                        setWasAmountEdited(true);
                                    }
                                }}
                                onDone={handleAmountDone}
                                onClose={() => setShowNumberPad(false)}
                            />
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
                                    className="h-12 rounded-xl font-medium"
                                />
                            )}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                                    />
                                )}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        {!isNested && (
                            <div className="flex bg-muted p-0.5 rounded-lg border border-border/50">
                                <button
                                    type="button"
                                    onClick={() => {
                                        form.setValue('itemAutoTrack', true, { shouldDirty: true });
                                        form.handleSubmit(performSave)();
                                    }}
                                    className={cn(
                                        "px-2 py-0.5 text-[9px] font-black uppercase tracking-tight rounded-md transition-all",
                                        form.watch('itemAutoTrack') ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                                    )}
                                >
                                    {t('itemsLabel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        form.setValue('itemAutoTrack', false, { shouldDirty: true });
                                        form.handleSubmit(performSave)();
                                    }}
                                    className={cn(
                                        "px-2 py-0.5 text-[9px] font-black uppercase tracking-tight rounded-md transition-all",
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
                                className="h-12 rounded-xl"
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
                                    // Ensure isNested is explicitly true when adding a sub-record
                                    if (!isNested) {
                                        form.setValue('isNested', true);
                                    }

                                    let parentId = currentId || initialData?.id;
                                    // Always save to ensure we have an ID and isNested state is persisted
                                    parentId = await performSave({ ...form.getValues(), isNested: true });

                                    if (parentId) {
                                        useUIStore.getState().openAddSubRecord(parentId);
                                    }
                                }}

                            >
                                <Plus className="w-3.5 h-3.5" />
                                {t('addSubRecord')}
                            </Button>
                        </div>

                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                            {subExpenses && subExpenses.length > 0 ? (
                                <div className="grid gap-2">
                                    {subExpenses.map((sub: any) => (
                                        <div
                                            key={sub.id}
                                            className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-border/30 group hover:border-primary/30 hover:bg-muted/40 transition-all cursor-pointer"
                                            onClick={() => useUIStore.getState().openEditSubRecord(sub)}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border/40 shrink-0">
                                                    <span className="text-xs">📄</span>
                                                </div>
                                                <div className="flex flex-col gap-0.5 overflow-hidden">
                                                    <span className="text-xs font-bold truncate capitalize group-hover:text-primary transition-colors">
                                                        {sub.note || sub.type}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">
                                                        <span>{sub.category}</span>
                                                        <span>•</span>
                                                        <span>{format(parseISO(sub.date), 'dd MMM')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 ml-2">
                                                <span className={cn(
                                                    "text-sm font-black",
                                                    sub.type === 'income' ? "text-green-600" : "text-primary"
                                                )}>
                                                    ৳{sub.amount.toFixed(0)}
                                                </span>
                                                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-[11px] text-muted-foreground italic text-center py-8 border-2 border-dashed rounded-3xl border-muted flex flex-col items-center gap-2 bg-muted/5">
                                    <div className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center mb-1">
                                        <Layers className="w-5 h-5 opacity-20" />
                                    </div>
                                    {t('thisCollectionIsEmpty')}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            form.setValue('isNested', true);
                                            form.handleSubmit(performSave)();
                                        }}
                                        className="text-primary font-black uppercase tracking-tighter not-italic hover:underline mt-1"
                                    >
                                        {t('addFirstRecord')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="pt-4 space-y-2">
                    {onCancel && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={async () => {
                                // If it's a new record and amount is 0, show error and don't close
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
                                
                                // Perform a final save before closing
                                await form.handleSubmit(performSave)();
                                onSuccess ? onSuccess() : (onCancel && onCancel());
                            }}
                            className="w-full h-11 rounded-xl font-bold"
                        >
                            {t('done')}
                        </Button>
                    )}
                    {(currentId || initialData) && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setShowDeleteDialog(true)}
                            className="w-full text-destructive hover:bg-destructive/5 h-11 rounded-xl"
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
                        <AlertDialogAction onClick={handleDelete} className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
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
        </>
    );
}

