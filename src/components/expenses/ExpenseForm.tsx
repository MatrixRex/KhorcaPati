import { useState } from 'react';
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
    amount: z.number().min(0.01, 'Amount must be greater than 0'),
    type: z.enum(['expense', 'income']),
    category: z.string().min(1, 'Category is required'),
    date: z.string(),
    note: z.string().optional(),
    isRecurring: z.boolean(),
    recurringInterval: z.enum(['daily', 'weekly', 'monthly', 'yearly']).nullable(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
    initialData?: Expense;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function ExpenseForm({ initialData, onSuccess, onCancel }: ExpenseFormProps) {
    const [currentId, setCurrentId] = useState<number | undefined>(initialData?.id);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const addExpense = useExpenseStore((state) => state.addExpense);
    const updateExpense = useExpenseStore((state) => state.updateExpense);
    const deleteExpense = useExpenseStore((state) => state.deleteExpense);
    const addItem = useItemStore((state) => state.addItem);
    const categories = useCategoryStore((state) => state.categories);

    const form = useForm<ExpenseFormValues>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            amount: initialData?.amount || 0,
            type: initialData?.type || 'expense',
            category: initialData?.category || 'Unsorted',
            date: initialData?.date || format(new Date(), 'yyyy-MM-dd'),
            note: initialData?.note || '',
            isRecurring: initialData?.isRecurring || false,
            recurringInterval: initialData?.recurringInterval || null,
        },
    });

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

    const performSave = async (data: ExpenseFormValues) => {
        if (data.amount <= 0) return;

        setSaveStatus('saving');
        try {
            // Query DB directly to avoid stale React state (e.g. when a new category was just created)
            const categoryInDb = await db.categories
                .filter(c => c.name.toLowerCase() === data.category.trim().toLowerCase())
                .first();
            const validCategory = categoryInDb?.name || 'Unsorted';

            const payload: Omit<Expense, 'id'> = {
                ...data,
                type: data.type,
                category: validCategory,
                note: data.note || '',
                parentId: initialData?.parentId || null,
                recurringNextDue: null,
                tags: initialData?.tags || [],
                createdAt: initialData?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            if (currentId) {
                await updateExpense(currentId, payload);
                await db.items.where('expenseId').equals(currentId).delete();
                await processItems(currentId, data.note || '', data.date);
            } else {
                const newId = await addExpense(payload);
                setCurrentId(newId);
                await processItems(newId, data.note || '', data.date);
            }
            setSaveStatus('saved');
            // We don't call onSuccess() here because we want to keep the sheet open for further edits
        } catch (err) {
            console.error(err);
            setSaveStatus('error');
        }
    };

    const handleBlur = () => {
        const values = form.getValues();
        if (values.amount > 0) {
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
                <div className="flex items-center">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {saveStatus === 'saving' && 'Saving...'}
                        {saveStatus === 'saved' && 'All changes saved'}
                        {saveStatus === 'error' && <span className="text-destructive">Error saving</span>}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
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
                        />
                        {form.formState.errors.amount && (
                            <p className="text-destructive text-sm">{form.formState.errors.amount.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
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
                    <Label htmlFor="note">Note / Items (Optional)</Label>
                    <Input
                        id="note"
                        placeholder="Grocery: Oil 1L, Rice 2kg"
                        {...form.register('note', {
                            onBlur: handleBlur
                        })}
                    />
                    <p className="text-[10px] text-muted-foreground">Items separated by commas or new lines will be auto-tracked.</p>
                </div>

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
                            className="w-full"
                        >
                            Done
                        </Button>
                    )}
                    {(currentId || initialData) && (
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => setShowDeleteDialog(true)}
                            className="w-full"
                        >
                            Delete Expense
                        </Button>
                    )}
                </div>
            </form>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="w-[90%] rounded-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this expense and its linked inventory items.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-2 mt-4">
                        <AlertDialogCancel className="flex-1 mt-0">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
