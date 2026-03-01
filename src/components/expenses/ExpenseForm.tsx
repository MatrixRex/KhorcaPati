import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useExpenseStore } from '@/stores/expenseStore';
import { useItemStore } from '@/stores/itemStore';
import { parseItemInput } from '@/parsers/itemParser';
import { format } from 'date-fns';
import { db, type Expense } from '@/db/schema';

const expenseSchema = z.object({
    amount: z.number().min(0.01, 'Amount must be greater than 0'),
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
    const addExpense = useExpenseStore((state) => state.addExpense);
    const updateExpense = useExpenseStore((state) => state.updateExpense);
    const addItem = useItemStore((state) => state.addItem);

    const form = useForm<ExpenseFormValues>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            amount: initialData?.amount || 0,
            category: initialData?.category || 'General',
            date: initialData?.date || format(new Date(), 'yyyy-MM-dd'),
            note: initialData?.note || '',
            isRecurring: initialData?.isRecurring || false,
            recurringInterval: initialData?.recurringInterval || null,
        },
    });

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

    const onSubmit = async (data: ExpenseFormValues) => {
        try {
            const payload: Omit<Expense, 'id'> = {
                ...data,
                note: data.note || '',
                parentId: initialData?.parentId || null,
                recurringNextDue: null,
                tags: initialData?.tags || [],
                createdAt: initialData?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            if (initialData?.id) {
                await updateExpense(initialData.id, payload);
                // Clear and re-sync items for this expense
                await db.items.where('expenseId').equals(initialData.id).delete();
                await processItems(initialData.id, data.note || '', data.date);
            } else {
                const newId = await addExpense(payload);
                await processItems(newId, data.note || '', data.date);
            }
            onSuccess?.();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        {...form.register('amount', { valueAsNumber: true })}
                    />
                    {form.formState.errors.amount && (
                        <p className="text-destructive text-sm">{form.formState.errors.amount.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" {...form.register('date')} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" placeholder="e.g. Food" {...form.register('category')} />
                {form.formState.errors.category && (
                    <p className="text-destructive text-sm">{form.formState.errors.category.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="note">Note / Items (Optional)</Label>
                <Input id="note" placeholder="Grocery: Oil 1L, Rice 2kg" {...form.register('note')} />
                <p className="text-[10px] text-muted-foreground">Items separated by commas or new lines will be auto-tracked.</p>
            </div>

            <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                    {initialData ? 'Update Expense' : 'Add Expense'}
                </Button>
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                        Cancel
                    </Button>
                )}
            </div>
        </form>
    );
}
