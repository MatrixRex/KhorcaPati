import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBudgetStore } from '@/stores/budgetStore';
import { format, parseISO } from 'date-fns';
import { type Budget, type BudgetRecurringInterval, db } from '@/db/schema';
import { CategoryComboBox } from '@/components/expenses/CategoryComboBox';
import { cn } from '@/lib/utils';
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

const INTERVALS: { value: BudgetRecurringInterval; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
];

const budgetSchema = z.object({
    category: z.string().min(1, 'Category is required'),
    limitAmount: z.number().min(1, 'Limit must be greater than 0'),
    alertThreshold: z.number().min(0.1).max(1),
    timelineType: z.enum(['recurring', 'range']),
    recurringInterval: z.enum(['daily', 'weekly', 'monthly', 'yearly']).nullable(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
}).superRefine((data, ctx) => {
    if (data.timelineType === 'recurring' && !data.recurringInterval) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select an interval', path: ['recurringInterval'] });
    }
    if (data.timelineType === 'range') {
        if (!data.startDate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Start date required', path: ['startDate'] });
        if (!data.endDate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End date required', path: ['endDate'] });
        if (data.startDate && data.endDate && data.startDate > data.endDate) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End date must be after start date', path: ['endDate'] });
        }
    }
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

    const today = format(new Date(), 'yyyy-MM-dd');

    const form = useForm<BudgetFormValues>({
        resolver: zodResolver(budgetSchema),
        defaultValues: {
            category: initialData?.category ?? '',
            limitAmount: initialData?.limitAmount ?? 1000,
            alertThreshold: initialData?.alertThreshold ?? 0.8,
            timelineType: initialData?.timelineType ?? 'recurring',
            recurringInterval: initialData?.recurringInterval ?? 'monthly',
            startDate: initialData?.startDate ?? today,
            endDate: initialData?.endDate ?? today,
        },
    });

    const timelineType = form.watch('timelineType');
    const interval = form.watch('recurringInterval');

    const onSubmit = async (data: BudgetFormValues) => {
        // Validate category against DB — must exist and must not be "Unsorted"
        const trimmed = data.category.trim();
        if (!trimmed || trimmed.toLowerCase() === 'unsorted') {
            form.setError('category', { message: 'Please select a valid category (not Unsorted)' });
            return;
        }
        const categoryInDb = await db.categories
            .filter((c) => c.name.toLowerCase() === trimmed.toLowerCase())
            .first();
        if (!categoryInDb) {
            form.setError('category', { message: 'Category not found — create it in the expense form first' });
            return;
        }

        try {
            const payload: Omit<Budget, 'id'> = {
                category: categoryInDb.name,   // use exact DB casing
                limitAmount: data.limitAmount,
                alertThreshold: data.alertThreshold,
                timelineType: data.timelineType,
                recurringInterval: data.timelineType === 'recurring' ? data.recurringInterval : null,
                startDate: data.timelineType === 'range' ? data.startDate : null,
                endDate: data.timelineType === 'range' ? data.endDate : null,
                createdAt: initialData?.createdAt ?? new Date().toISOString(),
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                {/* Category */}
                <div className="space-y-2">
                    <Label>Category</Label>
                    <CategoryComboBox
                        value={form.watch('category')}
                        onChange={(val) => {
                            form.setValue('category', val, { shouldDirty: true });
                            form.clearErrors('category');
                        }}
                    />
                    {form.formState.errors.category && (
                        <p className="text-destructive text-sm">{form.formState.errors.category.message}</p>
                    )}
                </div>

                {/* Limit amount */}
                <div className="space-y-2">
                    <Label htmlFor="limitAmount">Budget Limit (৳)</Label>
                    <Input
                        id="limitAmount"
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        onKeyDown={(e) => {
                            if (['e', 'E', '+', '-'].includes(e.key)) {
                                e.preventDefault();
                            }
                        }}
                        {...form.register('limitAmount', {
                            valueAsNumber: true,
                            setValueAs: (v) => v === "" ? 0 : Number(v)
                        })}
                    />
                    {form.formState.errors.limitAmount && (
                        <p className="text-destructive text-sm">{form.formState.errors.limitAmount.message}</p>
                    )}
                </div>

                {/* ── Timeline mode toggle ───────────────────────────── */}
                <div className="space-y-3">
                    <Label>Timeline</Label>

                    {/* Segmented control */}
                    <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-muted">
                        {(['recurring', 'range'] as const).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => form.setValue('timelineType', mode, { shouldDirty: true })}
                                className={cn(
                                    'py-2 rounded-md text-sm font-medium transition-all',
                                    timelineType === mode
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {mode === 'recurring' ? '↺ Recurring' : '📅 Date Range'}
                            </button>
                        ))}
                    </div>

                    {/* Recurring: interval chips */}
                    {timelineType === 'recurring' && (
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Resets every period automatically</p>
                            <div className="grid grid-cols-4 gap-2">
                                {INTERVALS.map(({ value, label }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => form.setValue('recurringInterval', value, { shouldDirty: true })}
                                        className={cn(
                                            'py-2 rounded-lg text-sm font-medium border transition-all',
                                            interval === value
                                                ? 'bg-primary text-primary-foreground border-primary shadow'
                                                : 'bg-background border-border text-muted-foreground hover:bg-muted'
                                        )}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            {form.formState.errors.recurringInterval && (
                                <p className="text-destructive text-sm">{form.formState.errors.recurringInterval.message}</p>
                            )}
                        </div>
                    )}

                    {/* Range: from / to date pickers */}
                    {timelineType === 'range' && (
                        <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">Track spending within a fixed window</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="startDate" className="text-xs">From</Label>
                                    <Controller
                                        control={form.control}
                                        name="startDate"
                                        render={({ field }) => (
                                            <DatePicker
                                                date={field.value ? parseISO(field.value) : undefined}
                                                setDate={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                                className="h-9 text-xs"
                                            />
                                        )}
                                    />
                                    {form.formState.errors.startDate && (
                                        <p className="text-destructive text-xs">{form.formState.errors.startDate.message}</p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="endDate" className="text-xs">To</Label>
                                    <Controller
                                        control={form.control}
                                        name="endDate"
                                        render={({ field }) => (
                                            <DatePicker
                                                date={field.value ? parseISO(field.value) : undefined}
                                                setDate={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                                className="h-9 text-xs"
                                            />
                                        )}
                                    />
                                    {form.formState.errors.endDate && (
                                        <p className="text-destructive text-xs">{form.formState.errors.endDate.message}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
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
                <div className="flex gap-2 pt-2">
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
