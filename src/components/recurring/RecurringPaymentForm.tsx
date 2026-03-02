import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRecurringPaymentStore } from '@/stores/recurringPaymentStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { format, addDays, addWeeks, addMonths, addYears, parseISO } from 'date-fns';
import { db, type RecurringPayment } from '@/db/schema';
import { CategoryComboBox } from '../expenses/CategoryComboBox';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

const recurringSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    amount: z.number().min(0.01, 'Amount must be greater than 0'),
    category: z.string().min(1, 'Category is required'),
    startDate: z.string(),
    interval: z.enum(['one-time', 'daily', 'weekly', 'monthly', 'yearly']),
    note: z.string().optional(),
});

type RecurringFormValues = z.infer<typeof recurringSchema>;

interface RecurringPaymentFormProps {
    initialData?: RecurringPayment;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function RecurringPaymentForm({ initialData, onSuccess, onCancel }: RecurringPaymentFormProps) {
    const [currentId, setCurrentId] = useState<number | undefined>(initialData?.id);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const addExpense = useExpenseStore((state) => state.addExpense);
    const addRecurringPayment = useRecurringPaymentStore((state) => state.addRecurringPayment);
    const updateRecurringPayment = useRecurringPaymentStore((state) => state.updateRecurringPayment);
    const deleteRecurringPayment = useRecurringPaymentStore((state) => state.deleteRecurringPayment);

    const form = useForm<RecurringFormValues>({
        resolver: zodResolver(recurringSchema),
        defaultValues: {
            title: initialData?.title || '',
            amount: initialData?.amount || 0,
            category: initialData?.category || 'Unsorted',
            startDate: initialData?.startDate || format(new Date(), 'yyyy-MM-dd'),
            interval: initialData?.interval || 'monthly',
            note: initialData?.note || '',
        },
    });

    const getNextDueDate = (current: Date, interval: string) => {
        switch (interval) {
            case 'daily': return addDays(current, 1);
            case 'weekly': return addWeeks(current, 1);
            case 'monthly': return addMonths(current, 1);
            case 'yearly': return addYears(current, 1);
            default: return current;
        }
    };

    const handleConfirm = async () => {
        if (!initialData) return;

        try {
            // 1. Create Expense
            await addExpense({
                amount: initialData.amount,
                category: initialData.category,
                date: format(new Date(), 'yyyy-MM-dd'), // Confirming now
                note: `[Recurring] ${initialData.title}${initialData.note ? ': ' + initialData.note : ''}`,
                isRecurring: false, // This specific entry isn't recurring
                recurringInterval: null,
                recurringNextDue: null,
                parentId: null,
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            // 2. Update or Delete Recurring Payment
            if (initialData.interval === 'one-time') {
                await deleteRecurringPayment(initialData.id!);
            } else {
                const currentNext = parseISO(initialData.nextDueDate);
                const nextDate = getNextDueDate(currentNext, initialData.interval);
                await updateRecurringPayment(initialData.id!, {
                    nextDueDate: format(nextDate, 'yyyy-MM-dd')
                });
            }
            onSuccess?.();
        } catch (err) {
            console.error(err);
        }
    };

    const handleSkip = async () => {
        if (!initialData) return;

        try {
            if (initialData.interval === 'one-time') {
                await deleteRecurringPayment(initialData.id!);
            } else {
                const currentNext = parseISO(initialData.nextDueDate);
                const nextDate = getNextDueDate(currentNext, initialData.interval);
                await updateRecurringPayment(initialData.id!, {
                    nextDueDate: format(nextDate, 'yyyy-MM-dd')
                });
            }
            onSuccess?.();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async () => {
        const idToDelete = currentId || initialData?.id;
        if (!idToDelete) return;
        try {
            await deleteRecurringPayment(idToDelete);
            setShowDeleteDialog(false);
            onSuccess?.();
        } catch (err) {
            console.error(err);
        }
    };

    const performSave = async (data: RecurringFormValues) => {
        if (data.amount <= 0) return;

        setSaveStatus('saving');
        try {
            const categoryInDb = await db.categories
                .filter(c => c.name.toLowerCase() === data.category.trim().toLowerCase())
                .first();
            const validCategory = categoryInDb?.name || 'Unsorted';

            // Calculate next due date if creating new
            // For now, nextDueDate = startDate
            // When user confirms a payment, we calculate the next one.
            const nextDueDate = initialData?.nextDueDate || data.startDate;

            const payload: Omit<RecurringPayment, 'id'> = {
                ...data,
                category: validCategory,
                note: data.note || '',
                nextDueDate: nextDueDate,
                createdAt: initialData?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            if (currentId) {
                await updateRecurringPayment(currentId, payload);
            } else {
                const newId = await addRecurringPayment(payload);
                setCurrentId(newId);
            }
            setSaveStatus('saved');
        } catch (err) {
            console.error(err);
            setSaveStatus('error');
        }
    };

    const handleBlur = () => {
        if (form.formState.isDirty) {
            form.handleSubmit(performSave)();
        }
    };

    return (
        <>
            <form className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {saveStatus === 'saving' && 'Saving...'}
                        {saveStatus === 'saved' && 'All changes saved'}
                        {saveStatus === 'error' && <span className="text-destructive">Error saving</span>}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                        id="title"
                        placeholder="Electricity Bill, Rent, etc."
                        {...form.register('title', {
                            onBlur: handleBlur
                        })}
                    />
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
                            inputMode="decimal"
                            onKeyDown={(e) => {
                                // Prevent e, E, +, -
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
                        <Label htmlFor="startDate">Start Date</Label>
                        <Controller
                            control={form.control}
                            name="startDate"
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

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <CategoryComboBox
                            value={form.watch('category')}
                            onChange={(val: string) => {
                                form.setValue('category', val, { shouldDirty: true });
                            }}
                            onBlur={() => form.handleSubmit(performSave)()}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="interval">Interval</Label>
                        <Select
                            value={form.watch('interval')}
                            onValueChange={(val: any) => {
                                form.setValue('interval', val, { shouldDirty: true });
                                form.handleSubmit(performSave)();
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select interval" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="one-time">One-time</SelectItem>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="note">Note (Optional)</Label>
                    <Input
                        id="note"
                        placeholder="Any additional details"
                        {...form.register('note', {
                            onBlur: handleBlur
                        })}
                    />
                </div>

                <div className="pt-4 space-y-2">
                    {initialData && (
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <Button
                                type="button"
                                variant="default"
                                onClick={handleConfirm}
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                            >
                                Confirm Payment
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleSkip}
                                className="w-full"
                            >
                                Skip / Next
                            </Button>
                        </div>
                    )}
                    {onCancel && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            className="w-full"
                        >
                            {initialData ? 'Back' : 'Cancel'}
                        </Button>
                    )}
                    {(currentId || initialData) && (
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => setShowDeleteDialog(true)}
                            className="w-full"
                        >
                            Delete Recurring Payment
                        </Button>
                    )}
                </div>
            </form>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="w-[90%] rounded-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this recurring payment schedule.
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
