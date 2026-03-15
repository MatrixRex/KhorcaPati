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
                            {t('expenseLabel')}
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
                                    ? "bg-emerald-500 text-white shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {t('incomeLabel')}
                        </button>
                    </div>
                </div>
                <div className="flex items-center">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
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
                        className="h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50"
                        {...form.register('title', {
                            onBlur: handleBlur
                        })}
                    />
                    {form.formState.errors.title && (
                        <p className="text-rose-600 text-[11px] font-black uppercase tracking-wider">{t('titleRequired')}</p>
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
                                className="pr-10 cursor-pointer caret-transparent h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50"
                                placeholder="0"
                            />
                            <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                        {form.formState.errors.amount && (
                            <p className="text-rose-600 text-[11px] font-black mt-1 ml-1 uppercase tracking-tight leading-none antialiased">{form.formState.errors.amount.message}</p>
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
                                    className="h-12 rounded-xl bg-background/50 border-border"
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
                            className="h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50"
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
                            <SelectTrigger className="h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50">
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
                        className="h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50"
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
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-12 rounded-xl font-bold"
                            >
                                {t('confirmPayment')}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleSkip}
                                className="w-full"
                            >
                                {t('skipNext')}
                            </Button>
                        </div>
                    )}
                    {onCancel && !initialData && (
                        <Button
                            type="button"
                            variant="outline"
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
                    className="w-full text-rose-600 hover:bg-rose-500/10 h-11 rounded-xl font-black uppercase tracking-widest text-[11px] antialiased"
                >
                    <Trash2 className="w-4 h-4 mr-2" />
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
                    <AlertDialogFooter className="flex-row gap-2 mt-4">
                        <AlertDialogCancel className="flex-1 mt-0">{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="flex-1 bg-rose-600 text-white hover:bg-rose-700 rounded-xl">
                            {t('deleteRecord')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
