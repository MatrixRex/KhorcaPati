import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useExpenseStore } from '@/stores/expenseStore';
import { format } from 'date-fns';
import { type Expense } from '@/db/schema';

const expenseSchema = z.object({
    title: z.string().min(1, 'Title is required'),
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

    const form = useForm<ExpenseFormValues>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            title: initialData?.title || '',
            amount: initialData?.amount || 0,
            category: initialData?.category || 'General',
            date: initialData?.date || format(new Date(), 'yyyy-MM-dd'),
            note: initialData?.note || '',
            isRecurring: initialData?.isRecurring || false,
            recurringInterval: initialData?.recurringInterval || null,
        },
    });

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
            } else {
                await addExpense(payload);
            }
            onSuccess?.();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" placeholder="e.g. Grocery" {...form.register('title')} />
                {form.formState.errors.title && (
                    <p className="text-destructive text-sm">{form.formState.errors.title.message}</p>
                )}
            </div>

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
            </div>

            <div className="space-y-2">
                <Label htmlFor="note">Note (Optional)</Label>
                <Input id="note" placeholder="Add a note" {...form.register('note')} />
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
