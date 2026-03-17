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
import { useGoalStore } from '@/stores/goalStore';
import { type Goal } from '@/db/schema';
import { NumberPad } from '@/components/shared/NumberPad';
import { Calculator } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

const goalSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    targetAmount: z.number().min(1, 'Target must be greater than 0'),
    currentAmount: z.number().min(0, 'Current amount cannot be negative'),
    deadline: z.string().optional(),
    note: z.string().optional(),
});

type GoalFormValues = z.infer<typeof goalSchema>;

interface GoalFormProps {
    initialData?: Goal;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function GoalForm({ initialData, onSuccess, onCancel }: GoalFormProps) {
    const { t } = useTranslation();
    const addGoal = useGoalStore((state) => state.addGoal);
    const updateGoal = useGoalStore((state) => state.updateGoal);
    const deleteGoal = useGoalStore((state) => state.deleteGoal);
    const [activeField, setActiveField] = useState<'target' | 'current' | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const form = useForm<GoalFormValues>({
        resolver: zodResolver(goalSchema),
        defaultValues: {
            title: initialData?.title || '',
            targetAmount: initialData?.targetAmount || 10000,
            currentAmount: initialData?.currentAmount || 0,
            deadline: initialData?.deadline || '',
            note: initialData?.note || '',
        },
    });

    const onSubmit = async (data: GoalFormValues) => {
        try {
            const payload: Omit<Goal, 'id'> = {
                ...data,
                note: data.note || '',
                deadline: data.deadline || null,
                createdAt: initialData?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            if (initialData?.id) {
                await updateGoal(initialData.id, payload);
            } else {
                await addGoal(payload);
            }
            onSuccess?.();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async () => {
        if (!initialData?.id) return;
        try {
            await deleteGoal(initialData.id);
            setShowDeleteDialog(false);
            onSuccess?.();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="title">{t('goalTitle')}</Label>
                <Input 
                    id="title" 
                    placeholder={t('goalExample')} 
                    className="h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50"
                    {...form.register('title')} 
                />
                {form.formState.errors.title && (
                    <p className="text-rose-60- text-xs font-black mt-1 ml-1 uppercase tracking-tight leading-none antialiased">{form.formState.errors.title.message}</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 relative">
                    <Label htmlFor="targetAmount">{t('target')} (৳)</Label>
                    <div className="relative">
                        <Input
                            id="targetAmount"
                            type="text"
                            readOnly
                            value={form.watch('targetAmount')}
                            onClick={() => setActiveField('target')}
                            className={cn(
                                "pr-10 cursor-pointer caret-transparent h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50",
                                activeField === 'target' && "ring-2 ring-primary/50 border-primary bg-primary/5"
                            )}
                        />
                        <input type="hidden" {...form.register('targetAmount', { valueAsNumber: true })} />
                        <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                </div>

                <div className="space-y-2 relative">
                    <Label htmlFor="currentAmount" className="label-header">{t('saved')} (৳)</Label>
                    <div className="relative">
                        <Input
                            id="currentAmount"
                            type="text"
                            readOnly
                            value={form.watch('currentAmount')}
                            onClick={() => setActiveField('current')}
                            className={cn(
                                "pr-10 cursor-pointer caret-transparent h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50",
                                activeField === 'current' && "ring-2 ring-primary/50 border-primary bg-primary/5"
                            )}
                        />
                        <input type="hidden" {...form.register('currentAmount', { valueAsNumber: true })} />
                        <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                </div>

                {activeField && (
                    <NumberPad
                        value={String(form.getValues(activeField === 'target' ? 'targetAmount' : 'currentAmount'))}
                        label={activeField === 'target' ? t('targetGoalLabel') : t('savedAmountLabel')}
                        inputId={activeField === 'target' ? 'targetAmount' : 'currentAmount'}
                        onChange={(val) => {
                            const num = parseFloat(val);
                            if (!isNaN(num)) {
                                form.setValue(activeField === 'target' ? 'targetAmount' : 'currentAmount', num);
                            }
                        }}
                        onDone={() => setActiveField(null)}
                        onClose={() => setActiveField(null)}
                    />
                )}
            </div>


            <div className="space-y-2">
                <Label htmlFor="deadline" className="label-header">{t('deadline')} ({t('optional')})</Label>
                <Controller
                    control={form.control}
                    name="deadline"
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
                <Label htmlFor="note">{t('note')} ({t('optional')})</Label>
                <Input
                    id="note"
                    placeholder={t('personalGoalExample')}
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={true}
                    className="h-12 rounded-xl bg-background/50 border-border shadow-sm focus:bg-background/80 focus:border-primary/50"
                    {...form.register('note')}
                />
            </div>

            <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 btn-premium">
                    {initialData ? t('updateGoal') : t('addGoal')}
                </Button>
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel} className="flex-1 btn-secondary-premium">
                        {t('cancel')}
                    </Button>
                )}
            </div>

            {initialData?.id && (
                <Button
                    type="button"
                    variant="ghost"
                    className="w-full btn-destructive-premium"
                    onClick={() => setShowDeleteDialog(true)}
                >
                    {t('deleteGoal')}
                </Button>
            )}
        </form>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent className="w-[90%] rounded-xl">
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('deleteGoalQuestion')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('deleteGoalDescription', { title: initialData?.title })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row gap-2 mt-4">
                    <AlertDialogCancel className="flex-1 mt-0 btn-secondary-premium !h-10">{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        className="flex-1 btn-destructive-premium !h-10"
                    >
                        {t('deleteRecord')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}
