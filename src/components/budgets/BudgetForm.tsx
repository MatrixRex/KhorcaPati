import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBudgetStore } from '@/stores/budgetStore';
import { format } from 'date-fns';
import { type Budget } from '@/db/schema';
import { CategoryComboBox } from '@/components/expenses/CategoryComboBox';
import { MonthPicker } from './MonthPicker';
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

const budgetSchema = z.object({
    category: z.string().min(1, 'Category is required'),
    limitAmount: z.number().min(1, 'Limit must be greater than 0'),
    alertThreshold: z.number().min(0.1).max(1),
    month: z.string().min(1),
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
    const deleteBudget = useBudgetStore((state) => state.deleteBudget);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

    const handleDelete = async () => {
        if (!initialData?.id) return;
        try {
            await deleteBudget(initialData.id);
            setShowDeleteDialog(false);
            onSuccess?.();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Category */}
                <div className="space-y-2">
                    <Label>Category</Label>
                    <CategoryComboBox
                        value={form.watch('category')}
                        onChange={(val) => form.setValue('category', val, { shouldDirty: true })}
                    />
                    {form.formState.errors.category && (
                        <p className="text-destructive text-sm">{form.formState.errors.category.message}</p>
                    )}
                </div>

                {/* Monthly Limit */}
                <div className="space-y-2">
                    <Label htmlFor="limitAmount">Monthly Limit (৳)</Label>
                    <Input
                        id="limitAmount"
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        {...form.register('limitAmount', { valueAsNumber: true })}
                    />
                    {form.formState.errors.limitAmount && (
                        <p className="text-destructive text-sm">{form.formState.errors.limitAmount.message}</p>
                    )}
                </div>

                {/* Month picker */}
                <div className="space-y-2">
                    <Label>Month</Label>
                    <MonthPicker
                        value={form.watch('month')}
                        onChange={(val) => form.setValue('month', val, { shouldDirty: true })}
                    />
                </div>

                {/* Alert threshold */}
                <div className="space-y-2">
                    <Label htmlFor="alertThreshold">
                        Alert at{' '}
                        <span className="text-primary font-semibold">
                            {Math.round(form.watch('alertThreshold') * 100)}%
                        </span>
                    </Label>
                    <input
                        id="alertThreshold"
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        className="w-full accent-primary"
                        {...form.register('alertThreshold', { valueAsNumber: true })}
                    />
                </div>

                {/* Actions */}
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

                {initialData?.id && (
                    <Button
                        type="button"
                        variant="destructive"
                        className="w-full"
                        onClick={() => setShowDeleteDialog(true)}
                    >
                        Delete Budget
                    </Button>
                )}
            </form>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="w-[90%] rounded-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this budget?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove the budget limit for{' '}
                            <span className="font-semibold">{initialData?.category}</span>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-2 mt-4">
                        <AlertDialogCancel className="flex-1 mt-0">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
