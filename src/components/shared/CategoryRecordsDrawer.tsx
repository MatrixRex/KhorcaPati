import { useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useFilterStore } from '@/stores/filterStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';

export function CategoryRecordsDrawer() {
    const { isCategoryRecordsOpen, closeCategoryRecords, categoryForRecords, openEditExpense } = useUIStore();
    const { setCategory } = useFilterStore();
    const { t } = useTranslation();

    // When the category in UI store changes, update the filter store
    useEffect(() => {
        if (isCategoryRecordsOpen && categoryForRecords) {
            setCategory(categoryForRecords);
        }
    }, [isCategoryRecordsOpen, categoryForRecords, setCategory]);

    // Cleanup filter when closing
    const handleClose = () => {
        closeCategoryRecords();
        setCategory(null);
    };

    return (
        <Sheet open={isCategoryRecordsOpen} onOpenChange={(open) => !open && handleClose()}>
            <SheetContent 
                side="bottom" 
                className="max-h-[92dvh] h-auto rounded-t-3xl p-0 glass overflow-hidden z-[60] flex flex-col border-white/10"
            >
                {/* Visual Polish */}
                <div className="absolute top-0 left-0 right-0 h-32 opacity-15 blur-3xl pointer-events-none bg-primary/20" />
                <div className="h-1.5 w-12 bg-muted/20 rounded-full mx-auto mt-4 mb-2 relative z-10 shrink-0" />
                
                <div className="flex-1 overflow-y-auto px-6 relative z-10" data-scroll-container>
                    <SheetHeader className="px-0 py-6 shrink-0 border-b border-foreground/5 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                <Search className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <SheetTitle className="text-2xl font-black tracking-tight leading-none mb-1">
                                    {t('recordsForCategory', { category: categoryForRecords })}
                                </SheetTitle>
                                <SheetDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                                    {t('analytics')} • {categoryForRecords}
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="pb-10">
                        <ExpenseList onEdit={openEditExpense} />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
