import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useExpenseStore } from '@/stores/expenseStore';
import { useItemStore } from '@/stores/itemStore';
import { parseItemInput } from '@/parsers/itemParser';
import { format, parseISO } from 'date-fns';
import { db, type Expense } from '@/db/schema';
import { CategoryComboBox } from './CategoryComboBox';
import { useCategoryStore } from '@/stores/categoryStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUIStore } from '@/stores/uiStore';
import { ChevronRight, Plus, Layers, Trash2 } from 'lucide-react';
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

const expenseSchema = z.object({
    amount: z.number().min(0, 'Amount cannot be negative'),
    type: z.enum(['expense', 'income']),
    category: z.string().min(1, 'Category is required'),
    date: z.string(),
    note: z.string().optional(),
    isRecurring: z.boolean(),
    isNested: z.boolean(),
    recurringInterval: z.enum(['daily', 'weekly', 'monthly', 'yearly']).nullable(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
    initialData?: Expense;
    onSuccess?: () => void;
    onCancel?: () => void;
    hideCollectionToggle?: boolean;
}

export function ExpenseForm({ initialData, onSuccess, onCancel, hideCollectionToggle }: ExpenseFormProps) {

    const { initialParentId } = useUIStore();
    const [currentId, setCurrentId] = useState<number | undefined>(initialData?.id);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
            category: initialData?.category || 'Unsorted',
            date: initialData?.date || format(new Date(), 'yyyy-MM-dd'),
            note: initialData?.note || '',
            isRecurring: initialData?.isRecurring || false,
            isNested: initialData?.isNested || false,
            recurringInterval: initialData?.recurringInterval || null,
        },
    });

    const isNested = form.watch('isNested');

    // Auto-update amount and date for nested record based on sub-records
    useEffect(() => {
        if (isNested && subExpenses && subExpenses.length > 0) {
            const totalAmount = subExpenses.reduce((sum, e) => sum + e.amount, 0);
            const latestDate = subExpenses.reduce((latest, e) => (e.date > latest ? e.date : latest), subExpenses[0].date);

            form.setValue('amount', totalAmount);
            form.setValue('date', latestDate);

            // Auto-save the parent after updating from sub-records
            performSave(form.getValues());
        }
    }, [isNested, subExpenses]);

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
        if (!data.isNested && data.amount <= 0) return;
        if (saveStatus === 'saving') return currentId || initialData?.id;

        setSaveStatus('saving');
        try {
            const categoryInDb = await db.categories
                .filter(c => c.name.toLowerCase() === data.category.trim().toLowerCase())
                .first();
            const validCategory = categoryInDb?.name || 'Unsorted';

            const payload: Omit<Expense, 'id'> = {
                ...data,
                type: data.type,
                category: validCategory,
                note: data.note || '',
                parentId: initialData?.parentId || initialParentId || null,
                isNested: data.isNested,
                recurringNextDue: null,
                tags: initialData?.tags || [],
                createdAt: initialData?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            let savedId = currentId;
            if (currentId) {
                await updateExpense(currentId, payload);
                await db.items.where('expenseId').equals(currentId).delete();
                await processItems(currentId, data.note || '', data.date);
            } else {
                const newId = await addExpense(payload);
                savedId = newId;
                setCurrentId(newId);
                await processItems(newId, data.note || '', data.date);
            }
            setSaveStatus('saved');
            return savedId;
        } catch (err) {
            console.error("Save failed:", err);
            setSaveStatus('error');
            return undefined;
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
            <form className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex bg-muted p-1 rounded-xl w-full">
                        <button
                            type="button"
                            onClick={() => {
                                form.setValue('type', 'expense', { shouldDirty: true });
                                form.handleSubmit(performSave)();
                            }}
                            className={cn(
                                "flex-1 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all",
                                form.watch('type') === 'expense'
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Expense
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                form.setValue('type', 'income', { shouldDirty: true });
                                form.handleSubmit(performSave)();
                            }}
                            className={cn(
                                "flex-1 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all",
                                form.watch('type') === 'income'
                                    ? "bg-green-600 text-white shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Income
                        </button>
                    </div>
                </div>

                {!hideCollectionToggle && (
                    <div className="flex items-center justify-between">
                        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {saveStatus === 'saving' && 'Saving...'}
                            {saveStatus === 'saved' && 'All changes saved'}
                            {saveStatus === 'error' && <span className="text-destructive">Error saving</span>}
                            {saveStatus === 'idle' && 'No changes yet'}
                        </div>

                        <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
                            <Layers className={cn("w-3.5 h-3.5", isNested ? "text-primary" : "text-muted-foreground")} />
                            <span className="text-[10px] font-bold uppercase tracking-tight">Collection</span>
                            <button
                                type="button"
                                onClick={() => {
                                    const newVal = !isNested;
                                    form.setValue('isNested', newVal, { shouldDirty: true });
                                    form.handleSubmit(performSave)();
                                }}
                                className={cn(
                                    "w-8 h-4 rounded-full transition-colors relative",
                                    isNested ? "bg-primary" : "bg-muted-foreground/30"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform",
                                    isNested ? "left-4.5" : "left-0.5"
                                )} />
                            </button>
                        </div>
                    </div>
                )}
                {hideCollectionToggle && (
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {saveStatus === 'saving' && 'Saving...'}
                        {saveStatus === 'saved' && 'All changes saved'}
                        {saveStatus === 'error' && <span className="text-destructive">Error saving</span>}
                        {saveStatus === 'idle' && 'No changes yet'}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount" className={cn(isNested && "opacity-50")}>Amount</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            disabled={isNested}
                            inputMode="decimal"
                            onKeyDown={(e) => {
                                if (['e', 'E', '+', '-'].includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                            {...form.register('amount', {
                                valueAsNumber: true,
                                setValueAs: (v) => v === "" ? 0 : Number(v),
                                onBlur: handleBlur
                            })}
                            className={cn(isNested && "bg-muted border-dashed")}
                        />
                        {form.formState.errors.amount && (
                            <p className="text-destructive text-sm">{form.formState.errors.amount.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date" className={cn(isNested && "opacity-50")}>Date</Label>
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
                                />
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <div className="w-full">
                        <CategoryComboBox
                            value={form.watch('category')}
                            onChange={(val: string) => {
                                form.setValue('category', val, { shouldDirty: true });
                            }}
                            onBlur={() => form.handleSubmit(performSave)()}
                        />
                    </div>
                    {form.formState.errors.category && (
                        <p className="text-destructive text-sm">{form.formState.errors.category.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="note">Note {!isNested && '/ Items'} (Optional)</Label>
                    <Input
                        id="note"
                        placeholder={isNested ? "Trip to Cox's Bazar" : "Grocery: Oil 1L, Rice 2kg"}
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={true}
                        {...form.register('note', {
                            onBlur: handleBlur
                        })}
                    />
                    {!isNested && <p className="text-[10px] text-muted-foreground">Items separated by commas or new lines will be auto-tracked.</p>}
                </div>

                {isNested && (
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sub Records</Label>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] gap-1 rounded-full px-3 border-primary/20 hover:bg-primary/5 hover:text-primary"
                                onClick={async () => {
                                    let parentId = currentId || initialData?.id;
                                    if (!parentId) {
                                        parentId = await performSave(form.getValues());
                                    }
                                    if (parentId) {
                                        useUIStore.getState().openAddSubRecord(parentId);
                                    }
                                }}

                            >
                                <Plus className="w-3 h-3" />
                                Add Record
                            </Button>
                        </div>

                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                            {subExpenses && subExpenses.length > 0 ? (
                                subExpenses.map(sub => (
                                    <div
                                        key={sub.id}
                                        className="flex items-center justify-between p-2 rounded-xl bg-muted/30 border border-border/40 group hover:border-primary/20 transition-all cursor-pointer"
                                        onClick={() => useUIStore.getState().openEditSubRecord(sub)}
                                    >
                                        <div className="flex flex-col gap-0.5 overflow-hidden">
                                            <span className="text-[11px] font-bold truncate capitalize">{sub.note || sub.type}</span>
                                            <span className="text-[9px] text-muted-foreground">{sub.category} • {format(parseISO(sub.date), 'dd MMM')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-xs font-black", sub.type === 'income' ? "text-green-600" : "text-primary")}>
                                                ৳{sub.amount.toFixed(0)}
                                            </span>
                                            <ChevronRight className="w-3 h-3 text-muted-foreground opacity-30 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-[10px] text-muted-foreground italic text-center py-4 border border-dashed rounded-xl">
                                    No sub-records added yet.
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
                            onClick={() => {
                                const currentVal = form.getValues('category');
                                const match = categories.find(c => c.name.toLowerCase() === currentVal.trim().toLowerCase());
                                if (!match) {
                                    form.setValue('category', 'Unsorted');
                                }
                                onCancel();
                            }}
                            className="w-full h-11 rounded-xl font-bold"
                        >
                            Done
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
                            Delete Record
                        </Button>
                    )}
                </div>
            </form>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="w-[90%] rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this record{isNested ? ' and ALL its sub-records' : ''}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-2 mt-4">
                        <AlertDialogCancel className="flex-1 mt-0 rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

