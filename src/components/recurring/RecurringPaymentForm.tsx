import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useRecurringPaymentStore } from '@/stores/recurringPaymentStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { format, addDays, addWeeks, addMonths, addYears, parseISO } from 'date-fns';
import { db, type RecurringPayment } from '@/db/schema';
import { CategoryComboBox } from '../expenses/CategoryComboBox';
import { NumberPad } from '@/components/shared/NumberPad';
import { Trash2, Calculator } from 'lucide-react';
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
    type: z.enum(['expense', 'income']),
    category: z.string().min(1, 'Category is required'),
    startDate: z.string(),
    interval: z.enum(['one-time', 'daily', 'weekly', 'monthly', 'yearly']),
    note: z.string().optional(),
});

import { useTranslation } from 'react-i18next';

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
    const [showNumberPad, setShowNumberPad] = useState(false);

    const addExpense = useExpenseStore((state) => state.addExpense);
    const addRecurringPayment = useRecurringPaymentStore((state) => state.addRecurringPayment);
    const updateRecurringPayment = useRecurringPaymentStore((state) => state.updateRecurringPayment);
    const deleteRecurringPayment = useRecurringPaymentStore((state) => state.deleteRecurringPayment);
    const { t } = useTranslation();

    const form = useForm<RecurringFormValues>({
        resolver: zodResolver(recurringSchema),
        defaultValues: {
            title: initialData?.title || '',
            amount: initialData?.amount || 0,
            type: initialData?.type || 'expense',
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
                type: initialData.type,
                category: initialData.category,
                date: format(new Date(), 'yyyy-MM-dd'), // Confirming now
                note: initialData.note || '',
                isRecurring: false, // This specific entry isn't recurring
                recurringInterval: null,
                recurringNextDue: null,
                parentId: null,
                isNested: false,
                itemAutoTrack: false,
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
                type: data.type,
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
        const values = form.getValues();
        if (values.amount > 0 && values.title.trim()) {
            form.handleSubmit(performSave)();
        }
    };

    return (
        <>
            <form className="space-y-4 pb-24">
                <div className="flex justify-between items-center mb-2">
                    <div className="segmented-control-container">
                        <button
                            type="button"
                            onClick={() => {
                                form.setValue('type', 'expense', { shouldDirty: true });
                                form.handleSubmit(performSave)();
                            }}
                            className={cn(
                                "segmented-control-item",
                                form.watch('type') === 'expense' && "segmented-control-item-active"
                            )}
                        >
                            {t('expenseLabel')}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                form.setValue('type', 'income', { shouldDirty: true });
                                form.handleSubmit(performSave)();
                            }}
                            className={cn(
                                "segmented-control-item",
                                form.watch('type') === 'income' && "segmented-control-item-active !bg-emerald-500"
                            )}
                        >
                            {t('incomeLabel')}
                        </button>
                    </div>
                </div>
                <div className="flex items-center">
                    <div className="label-header">
                        {saveStatus === 'saving' && t('saving')}
                        {saveStatus === 'saved' && t('allChangesSaved')}
                        {saveStatus === 'error' && <span className="text-rose-500/90">{t('errorSaving')}</span>}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="title">{t('recurringTitle')}</Label>
                    <Input
                        id="title"
                        placeholder={t('recurringTitlePlaceholder')}
                        className="input-glass"
                        {...form.register('title', {
                            onBlur: handleBlur
                        })}
                    />
                    {form.formState.errors.title && (
                        <p className="form-error">{t('titleRequired')}</p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 relative">
                        <Label htmlFor="amount">{t('amount')}</Label>
                        <div className="relative">
                            <Input
                                id="amount"
                                type="text"
                                readOnly
                                value={form.watch('amount') || ''}
                                onClick={() => setShowNumberPad(true)}
                                className="pr-10 cursor-pointer caret-transparent input-glass"
                                placeholder="0"
                            />
                            <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                        {form.formState.errors.amount && (
                            <p className="form-error mt-1 ml-1 !tracking-tight !leading-none lowercase first-letter:uppercase">{form.formState.errors.amount.message}</p>
                        )}
                        {showNumberPad && (
                            <NumberPad
                                value={String(form.getValues('amount'))}
                                label={form.watch('type') === 'expense' ? t('recurring') + ' ' + t('expenseLabel') : t('recurring') + ' ' + t('incomeLabel')}
                                onChange={(val) => {
                                    const num = parseFloat(val);
                                    if (!isNaN(num)) {
                                        form.setValue('amount', num);
                                    }
                                }}
                                onDone={() => {
                                    setShowNumberPad(false);
                                    handleBlur();
                                }}
                                onClose={() => setShowNumberPad(false)}
                            />
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="startDate">{t('startDate')}</Label>
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
                                    className="input-glass"
                                />
                            )}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="category">{t('category')}</Label>
                        <CategoryComboBox
                            value={form.watch('category')}
                            onChange={(val: string) => {
                                form.setValue('category', val, { shouldDirty: true });
                            }}
                            onBlur={() => form.handleSubmit(performSave)()}
                            className="input-glass"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="interval">{t('interval')}</Label>
                        <Select
                            value={form.watch('interval')}
                            onValueChange={(val: any) => {
                                form.setValue('interval', val, { shouldDirty: true });
                                form.handleSubmit(performSave)();
                            }}
                        >
                            <SelectTrigger className="input-glass">
                                <SelectValue placeholder={t('selectInterval')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="one-time">{t('oneTime')}</SelectItem>
                                <SelectItem value="daily">{t('daily')}</SelectItem>
                                <SelectItem value="weekly">{t('weekly')}</SelectItem>
                                <SelectItem value="monthly">{t('monthly')}</SelectItem>
                                <SelectItem value="yearly">{t('yearly')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="note">{t('note')} ({t('optional')})</Label>
                    <Input
                        id="note"
                        placeholder={t('recurringNotePlaceholder')}
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={true}
                        className="input-glass"
                        {...form.register('note', {
                            onBlur: handleBlur
                        })}
                    />
                </div>

                <div className="pt-6 space-y-3">
                    {initialData && (
                        <div className="grid grid-cols-2 gap-3 mb-2">
                            <Button
                                type="button"
                                variant="default"
                                onClick={handleConfirm}
                                className="w-full btn-premium"
                            >
                                {t('confirmPayment')}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleSkip}
                                className="w-full btn-secondary-premium"
                            >
                                {t('skipNext')}
                            </Button>
                        </div>
                    )}
                    
                    {onCancel && !initialData && (
                        <Button
                            type="button"
                            variant="default"
                            onClick={async () => {
                                const values = form.getValues();
                                if (values.amount <= 0) {
                                    form.setError('amount', { message: t('amountRequired') });
                                    setShowNumberPad(true);
                                    return;
                                }
                                if (!values.title.trim()) {
                                    form.setError('title', { message: t('titleRequired') });
                                    return;
                                }

                                // Final save just in case
                                await form.handleSubmit(performSave)();
                                onCancel();
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
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            {t('deleteRecord')}
                        </Button>
                    )}
                </div>
            </form>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="w-[90%] rounded-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('deleteBudgetDescription').replace('{{category}}', form.getValues('title'))}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-2 mt-4">
                        <AlertDialogAction onClick={handleDelete} className="w-full btn-destructive-premium">
                            {t('deleteRecord')}
                        </AlertDialogAction>
                        <AlertDialogCancel className="w-full mt-0 btn-secondary-premium">{t('cancel')}</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
