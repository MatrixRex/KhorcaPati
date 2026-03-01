import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBudgetStore } from '@/stores/budgetStore';
import { format } from 'date-fns';
import { type Budget } from '@/db/schema';

const budgetSchema = z.object({
    category: z.string().min(1, 'Category is required'),
    limitAmount: z.number().min(1, 'Limit must be greater than 0'),
    alertThreshold: z.number().min(0.1).max(1),
    month: z.string().min(1)
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

interface BudgetFormProps {
    initialData?: Budget;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function BudgetForm({ initialData, onSuccess, onCancel }: BudgetFormProps) {
    const addBudget = useBudgetStore((state) => state.addBudget);
    const updateBudget = useBudgetStore((state) => state.updateBudget);

    const form = useForm<BudgetFormValues>({
        resolver: zodResolver(budgetSchema),
        defaultValues: {
            category: initialData?.category || '',
            limitAmount: initialData?.limitAmount || 1000,
            alertThreshold: initialData?.alertThreshold || 0.8,
            month: initialData?.month || format(new Date(), 'yyyy-MM'),
        },
    });

    const onSubmit = async (data: BudgetFormValues) => {
        try {
            const payload: Omit<Budget, 'id'> = {
                ...data,
                createdAt: initialData?.createdAt || new Date().toISOString(),
            };

            if (initialData?.id) {
                await updateBudget(initialData.id, payload);
            } else {
                await addBudget(payload);
            }
            onSuccess?.();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" placeholder="e.g. Food" {...form.register('category')} />
                {form.formState.errors.category && (
                    <p className="text-destructive text-sm">{form.formState.errors.category.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="limitAmount">Monthly Limit (৳)</Label>
                <Input
                    id="limitAmount"
                    type="number"
                    step="0.01"
                    {...form.register('limitAmount', { valueAsNumber: true })}
                />
                {form.formState.errors.limitAmount && (
                    <p className="text-destructive text-sm">{form.formState.errors.limitAmount.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="month">Month</Label>
                <Input id="month" type="month" {...form.register('month')} />
            </div>

            <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                    {initialData ? 'Update Budget' : 'Add Budget'}
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
