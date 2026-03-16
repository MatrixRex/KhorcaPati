import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DatePicker } from '@/components/ui/date-picker';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLoanStore } from '@/stores/loanStore';
import { type Loan } from '@/db/schema';
import { NumberPad } from '@/components/shared/NumberPad';
import { Calculator } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const loanSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    person: z.string().min(1, 'Person is required'),
    totalAmount: z.number().min(1, 'Amount must be greater than 0'),
    currentAmount: z.number().min(0, 'Current amount cannot be negative'),
    type: z.enum(['taken', 'given']),
    dueDate: z.string().optional(),
    note: z.string().optional(),
});

type LoanFormValues = z.infer<typeof loanSchema>;

interface LoanFormProps {
    initialData?: Loan;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function LoanForm({ initialData, onSuccess, onCancel }: LoanFormProps) {
    const { t } = useTranslation();
    const addLoan = useLoanStore((state) => state.addLoan);
    const updateLoan = useLoanStore((state) => state.updateLoan);
    const [activeField, setActiveField] = useState<'total' | 'current' | null>(null);

    const form = useForm<LoanFormValues>({
        resolver: zodResolver(loanSchema),
        defaultValues: {
            title: initialData?.title || '',
            person: initialData?.person || '',
            totalAmount: initialData?.totalAmount || 0,
            currentAmount: initialData?.currentAmount || 0,
            type: initialData?.type || 'taken',
            dueDate: initialData?.dueDate || '',
            note: initialData?.note || '',
        },
    });

    const onSubmit = async (data: LoanFormValues) => {
        try {
            const payload: Omit<Loan, 'id'> = {
                ...data,
                note: data.note || '',
                dueDate: data.dueDate || null,
                createdAt: initialData?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            if (initialData?.id) {
                await updateLoan(initialData.id, payload);
            } else {
                await addLoan(payload);
            }
            onSuccess?.();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex bg-muted p-1 rounded-xl w-full mb-2">
                <button
                    type="button"
                    onClick={() => form.setValue('type', 'taken', { shouldDirty: true })}
                    className={cn(
                        "flex-1 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all",
                        form.watch('type') === 'taken'
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {t('taken')}
                </button>
                <button
                    type="button"
                    onClick={() => form.setValue('type', 'given', { shouldDirty: true })}
                    className={cn(
                        "flex-1 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all",
                        form.watch('type') === 'given'
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {t('given')}
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="person" className="label-header">{t('person')}</Label>
                    <Input id="person" placeholder={t('personExample')} {...form.register('person')} className="h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="title" className="label-header">{t('loanTitle')}</Label>
                    <Input id="title" placeholder={t('loanExample')} {...form.register('title')} className="h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50" />
                </div>
            </div>

            <div className="space-y-2 relative">
                <Label htmlFor="totalAmount" className="label-header">{t('totalAmount')} (৳)</Label>
                <div className="relative">
                    <Input
                        id="totalAmount"
                        type="text"
                        readOnly
                        value={form.watch('totalAmount') ? `৳${form.watch('totalAmount')}` : '৳০'}
                        onClick={() => setActiveField('total')}
                        className="pr-10 cursor-pointer caret-transparent font-bold text-lg h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50"
                    />
                    <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                </div>
            </div>

            {activeField && (
                <NumberPad
                    value={String(form.getValues('totalAmount'))}
                    label={t('totalLoanAmount')}
                    onChange={(val) => {
                        const num = parseFloat(val);
                        if (!isNaN(num)) {
                            form.setValue('totalAmount', num);
                        }
                    }}
                    onDone={() => setActiveField(null)}
                    onClose={() => setActiveField(null)}
                />
            )}

            <div className="space-y-2">
                <Label htmlFor="dueDate" className="label-header">{t('deadline')} ({t('optional')})</Label>
                <Controller
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                        <DatePicker
                            date={field.value ? parseISO(field.value) : undefined}
                            setDate={(date) => {
                                field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                            }}
                            className="h-12 rounded-xl bg-background/50 border-border"
                        />
                    )}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="note" className="text-[11px] font-bold uppercase">{t('note')} ({t('optional')})</Label>
                <Input
                    id="note"
                    placeholder={t('note')}
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={true}
                    className="h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50"
                    {...form.register('note')}
                />
            </div>

            <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 btn-premium">
                    {initialData ? t('editLoan') : t('addLoan')}
                </Button>
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel} className="flex-1 btn-secondary-premium">
                        {t('cancel')}
                    </Button>
                )}
            </div>
        </form>
    );
}
