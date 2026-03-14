import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Item } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { useState } from 'react';
import { ChevronRight, Package, ExternalLink, History, Trash2 } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useNavigate } from 'react-router-dom';
import { useCloseWatcher } from '@/hooks/use-close-watcher';
import { useTranslation } from 'react-i18next';

import { useFilterStore } from '@/stores/filterStore';
import { isWithinInterval } from 'date-fns';
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
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { formatNumber } from '@/lib/utils';


export function ItemTracker() {
    const { startDate, endDate, inventorySortBy, selectedCategory } = useFilterStore();
    const { selectedInventoryItem, setSelectedInventoryItem, openEditExpense } = useUIStore();
    const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
    const [showDeleteWholeConfirm, setShowDeleteWholeConfirm] = useState(false);
    const [affectedItemNames, setAffectedItemNames] = useState<string[]>([]);
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleDeleteItem = async (item: Item) => {
        if (!item.expenseId) {
            await db.items.delete(item.id!);
            return;
        }

        try {
            await db.transaction('rw', [db.items, db.expenses], async () => {
                // 1. Disable auto-tracking for the source expense
                await db.expenses.update(item.expenseId!, { itemAutoTrack: false });
                
                // 2. Delete ALL items for this expense (converts them to notes only)
                await db.items.where('expenseId').equals(item.expenseId!).delete();
            });
            setItemToDelete(null);
        } catch (error) {
            console.error("Failed to delete item:", error);
        }
    };

    const handleDeleteWholeItem = async (name: string) => {
        try {
            const affectedItems = await db.items.where('name').equals(name).toArray();
            const expenseIds = Array.from(new Set(affectedItems.map(item => item.expenseId).filter(Boolean)));

            await db.transaction('rw', [db.items, db.expenses], async () => {
                for (const expId of expenseIds) {
                    await db.expenses.update(expId!, { itemAutoTrack: false });
                }
                await db.items.where('expenseId').anyOf(expenseIds as number[]).delete();
                await db.items.where('name').equals(name).delete();
            });
            
            setShowDeleteWholeConfirm(false);
            setSelectedInventoryItem(null);
        } catch (error) {
            console.error("Failed to delete whole item:", error);
        }
    };

    // Close on back button / Esc
    useCloseWatcher(!!selectedInventoryItem, () => setSelectedInventoryItem(null));

    const items = useLiveQuery(async () => {
        let all: Item[];
        if (selectedCategory) {
            // Find all expenses in this category
            const expenseIds = (await db.expenses
                .where('category').equals(selectedCategory)
                .primaryKeys()) as number[];
            
            // Find items linked to these expenses
            all = await db.items
                .where('expenseId')
                .anyOf(expenseIds)
                .toArray();
        } else {
            all = await db.items.orderBy('date').reverse().toArray();
        }

        return all.filter(item => {
            const date = new Date(item.date);
            return isWithinInterval(date, { start: startDate, end: endDate });
        });
    }, [startDate, endDate, selectedCategory]);

    if (!items) {
        return <div className="p-4 text-center text-muted-foreground">{t('loadingItems')}</div>;
    }

    if (items.length === 0) {
        return (
            <div className="p-8 text-center flex flex-col items-center justify-center h-[50vh]">
                <div className="text-4xl mb-4 opacity-50">📦</div>
                <h3 className="font-semibold text-lg">{t('inventoryEmpty')}</h3>
                <p className="text-muted-foreground text-sm">{t('inventoryEmptyDescription')}</p>
            </div>
        );
    }

    // Group items by name
    const groupedItems = items.reduce((acc, item) => {
        const key = item.name.toLowerCase().trim();
        if (!acc[key]) {
            acc[key] = {
                name: item.name,
                totalQty: 0,
                unit: item.unit,
                records: []
            };
        }
        acc[key].totalQty += item.qty;
        acc[key].records.push(item);
        return acc;
    }, {} as Record<string, { name: string; totalQty: number; unit: string; records: Item[] }>);

    const groupedList = Object.values(groupedItems).sort((a, b) => {
        if (inventorySortBy === 'alphabet') {
            return a.name.localeCompare(b.name);
        } else {
            return b.totalQty - a.totalQty; // Sort DESC by count
        }
    });

    const handleEntryClick = async (expenseId: number | null) => {
        if (expenseId) {
            const expense = await db.expenses.get(expenseId);
            if (expense) {
                openEditExpense(expense, '/items');
                navigate('/expenses');
            }
        }
    };

    const prepareDeleteItem = async (item: Item) => {
        if (item.expenseId) {
            const others = await db.items
                .where('expenseId')
                .equals(item.expenseId)
                .toArray();
            
            const otherNames = Array.from(new Set(
                others
                    .filter(o => o.id !== item.id)
                    .map(o => o.name)
            ));
            setAffectedItemNames(otherNames);
        } else {
            setAffectedItemNames([]);
        }
        setItemToDelete(item);
    };

    const prepareDeleteWholeItem = async (name: string) => {
        const affectedItems = await db.items.where('name').equals(name).toArray();
        const expenseIds = Array.from(new Set(affectedItems.map(item => item.expenseId).filter(Boolean)));
        
        const allLinkedItems = await db.items
            .where('expenseId')
            .anyOf(expenseIds as number[])
            .toArray();
        
        const otherNames = Array.from(new Set(
            allLinkedItems
                .filter(o => o.name.toLowerCase().trim() !== name.toLowerCase().trim())
                .map(o => o.name)
        ));
        
        setAffectedItemNames(otherNames);
        setShowDeleteWholeConfirm(true);
    };
        return (
        <div className="flex flex-col gap-[var(--item-gap)] pb-24">
            {groupedList.map((group) => (
                <Card
                    key={group.name}
                    className="overflow-hidden hover:bg-muted/30 active:scale-[0.98] transition-all cursor-pointer border-none bg-card shadow-sm"
                    onClick={() => setSelectedInventoryItem(group.name)}
                >
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-transform group-hover:scale-110">
                                <Package size={24} />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <h3 className="font-semibold text-sm truncate capitalize leading-tight">
                                    {group.name}
                                </h3>
                                <p className="text-[11px] text-muted-foreground font-medium">
                                    {t(group.records.length === 1 ? 'record' : 'records_plural', { count: group.records.length })}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end">
                                <div className="flex items-baseline gap-1">
                                    <span className="font-bold text-base text-primary leading-none">{formatNumber(group.totalQty)}</span>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{group.unit}</span>
                                </div>
                            </div>
                            <ChevronRight className="text-muted-foreground opacity-30" size={16} />
                        </div>
                    </CardContent>
                </Card>
            ))}

            {/* Inventory Item Details Drawer */}
            <Sheet 
                open={!!selectedInventoryItem} 
                onOpenChange={(open) => !open && setSelectedInventoryItem(null)}
            >
                <SheetContent 
                    side="bottom" 
                    className="h-[92dvh] rounded-t-[32px] p-0 border-none bg-background overflow-hidden flex flex-col"
                >
                    <div className="h-1.5 w-12 bg-muted/40 rounded-full mx-auto mt-3 mb-2 shrink-0" />
                    
                    {selectedInventoryItem && groupedItems[selectedInventoryItem.toLowerCase().trim()] && (
                        <div className="flex flex-col h-full overflow-hidden">
                            {/* Drawer Header */}
                            <div className="px-6 pb-6 pt-2 shrink-0 border-b">
                                <SheetHeader className="text-left mb-6">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                                <Package size={20} />
                                            </div>
                                            <div>
                                                <SheetTitle className="text-xl font-black capitalize leading-tight">
                                                {groupedItems[selectedInventoryItem.toLowerCase().trim()].name}
                                                </SheetTitle>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                    {t('itemDetails')}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => prepareDeleteWholeItem(selectedInventoryItem)}
                                            className="w-10 h-10 rounded-full bg-destructive/5 hover:bg-destructive/10 flex items-center justify-center text-destructive transition-colors shrink-0"
                                            title={t('deleteWholeItem')}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </SheetHeader>

                                <div className="flex items-center justify-between gap-4 bg-muted/30 p-4 rounded-2xl border border-border/50">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">{t('totalStock')}</span>
                                        <div className="flex items-baseline gap-1.5 mt-0.5">
                                            <span className="text-2xl font-black text-primary leading-none">
                                                {formatNumber(groupedItems[selectedInventoryItem.toLowerCase().trim()].totalQty)}
                                            </span>
                                            <span className="text-xs font-bold text-muted-foreground uppercase">
                                                {groupedItems[selectedInventoryItem.toLowerCase().trim()].unit}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center border shadow-sm">
                                            <History size={18} className="text-muted-foreground/60" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Entry History List */}
                            <div className="flex-1 overflow-auto px-6 py-6 flex flex-col gap-3 pb-24">
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{t('transactionHistory')}</h4>
                                    <div className="h-px bg-border flex-1 ml-4" />
                                </div>

                                {groupedItems[selectedInventoryItem.toLowerCase().trim()].records
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map((record, idx) => (
                                        <div
                                            key={record.id || idx}
                                            onClick={() => handleEntryClick(record.expenseId)}
                                            className="group transition-all active:scale-[0.98] cursor-pointer"
                                        >
                                            <Card className="overflow-hidden border-none bg-muted/40 group-hover:bg-muted/60 transition-colors rounded-2xl">
                                                <CardContent className="p-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                                        <div className="w-10 h-10 rounded-xl bg-background border flex flex-col items-center justify-center shrink-0 shadow-sm">
                                                            <span className="text-[8px] font-black text-muted-foreground uppercase leading-none mb-0.5">
                                                                {format(new Date(record.date), 'MMM')}
                                                            </span>
                                                            <span className="text-sm font-black leading-none">
                                                                {formatNumber(format(new Date(record.date), 'dd'))}
                                                            </span>
                                                        </div>

                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-baseline gap-1.5">
                                                                <span className="text-base font-black">+{formatNumber(record.qty)}</span>
                                                                <span className="text-[10px] font-bold text-muted-foreground uppercase">{record.unit}</span>
                                                            </div>

                                                            {record.rawInput && record.rawInput.toLowerCase() !== record.name.toLowerCase() && (
                                                                <p className="text-[10px] text-muted-foreground italic truncate leading-tight mt-0.5">
                                                                    "{record.rawInput}"
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                prepareDeleteItem(record);
                                                            }}
                                                            className="w-8 h-8 rounded-full bg-destructive/5 hover:bg-destructive/10 flex items-center justify-center text-destructive transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                        <div className="w-8 h-8 rounded-full bg-primary/5 group-hover:bg-primary/20 flex items-center justify-center text-primary transition-colors">
                                                            <ExternalLink size={14} />
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent className="w-[90%] rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('deleteItem')}</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4">
                            <span className="block">{t('deleteItemConfirm')}</span>
                            {affectedItemNames.length > 0 && (
                                <span className="block bg-destructive/5 p-3 rounded-xl border border-destructive/10">
                                    <span className="block text-[10px] font-black uppercase tracking-wider text-destructive mb-2">{t('alsoAffects')}</span>
                                    <span className="flex flex-wrap gap-2">
                                        {affectedItemNames.map(name => (
                                            <span key={name} className="px-2 py-0.5 bg-destructive/10 text-destructive text-[10px] font-bold rounded-md capitalize">
                                                {name}
                                            </span>
                                        ))}
                                    </span>
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-2 mt-4">
                        <AlertDialogCancel className="flex-1 mt-0 rounded-xl">{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => itemToDelete && handleDeleteItem(itemToDelete)} 
                            className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                        >
                            {t('done')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={showDeleteWholeConfirm} onOpenChange={setShowDeleteWholeConfirm}>
                <AlertDialogContent className="w-[90%] rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive flex items-center gap-2">
                            <Trash2 size={18} />
                            {t('deleteWholeItem')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4">
                            <span className="block">{t('deleteWholeItemConfirm')}</span>
                            {affectedItemNames.length > 0 && (
                                <span className="block bg-destructive/5 p-3 rounded-xl border border-destructive/10">
                                    <span className="block text-[10px] font-black uppercase tracking-wider text-destructive mb-2">{t('alsoAffects')}</span>
                                    <span className="flex flex-wrap gap-2">
                                        {affectedItemNames.map(name => (
                                            <span key={name} className="px-2 py-0.5 bg-destructive/10 text-destructive text-[10px] font-bold rounded-md capitalize">
                                                {name}
                                            </span>
                                        ))}
                                    </span>
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-2 mt-4">
                        <AlertDialogCancel className="flex-1 mt-0 rounded-xl">{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => selectedInventoryItem && handleDeleteWholeItem(selectedInventoryItem)} 
                            className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                        >
                            {t('done')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
