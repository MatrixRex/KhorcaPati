import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Item } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { useState } from 'react';
import { ChevronRight, Package, StickyNote, ArrowLeft, ExternalLink, History } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useNavigate } from 'react-router-dom';
import { useCloseWatcher } from '@/hooks/use-close-watcher';

export function ItemTracker() {
    const { selectedInventoryItem, setSelectedInventoryItem, openEditExpense } = useUIStore();
    const [touchStartX, setTouchStartX] = useState(0);
    const navigate = useNavigate();

    // Close on back button / Esc
    useCloseWatcher(!!selectedInventoryItem, () => setSelectedInventoryItem(null));

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStartX(e.touches[0].clientX);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touchEndX = e.changedTouches[0].clientX;
        // If swiped from left edge (>50px swipe, starting from leftmost 40px)
        if (touchStartX < 40 && touchEndX - touchStartX > 70) {
            setSelectedInventoryItem(null);
        }
    };

    const items = useLiveQuery(
        () => db.items.orderBy('date').reverse().toArray()
    );

    if (!items) {
        return <div className="p-4 text-center text-muted-foreground">Loading items...</div>;
    }

    if (items.length === 0) {
        return (
            <div className="p-8 text-center flex flex-col items-center justify-center h-[50vh]">
                <div className="text-4xl mb-4 opacity-50">📦</div>
                <h3 className="font-semibold text-lg">Inventory empty</h3>
                <p className="text-muted-foreground text-sm">Add items using the smart input bar above.</p>
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

    const groupedList = Object.values(groupedItems).sort((a, b) => a.name.localeCompare(b.name));

    const handleEntryClick = async (expenseId: number | null) => {
        if (expenseId) {
            const expense = await db.expenses.get(expenseId);
            if (expense) {
                openEditExpense(expense, '/items');
                navigate('/expenses');
            }
        }
    };

    if (selectedInventoryItem && groupedItems[selectedInventoryItem.toLowerCase().trim()]) {
        const group = groupedItems[selectedInventoryItem.toLowerCase().trim()];
        return (
            <div
                className="fixed top-0 left-0 right-0 bottom-16 z-40 bg-background flex flex-col animate-in slide-in-from-right duration-300 pointer-events-auto"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Full-screen Detail Header */}
                <div className="safe-top bg-card border-b shadow-sm pt-10 px-4 pb-4">
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            onClick={() => setSelectedInventoryItem(null)}
                            className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-all active:scale-95"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <h2 className="text-lg font-bold flex-1 truncate">Item Details</h2>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                <Package size={28} />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <h3 className="text-2xl font-black truncate capitalize leading-tight">
                                    {group.name}
                                </h3>
                                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                    <History size={14} />
                                    {group.records.length} historical records
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 bg-secondary/30 p-3 rounded-2xl border border-border/50">
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Stock</div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-primary leading-none">{group.totalQty}</span>
                                <span className="text-sm font-bold text-muted-foreground">{group.unit}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Entry History List */}
                <div className="flex-1 overflow-auto p-4 space-y-4 pb-10">
                    <div className="flex items-center justify-between px-1">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Transaction History</h4>
                        <div className="h-px bg-border flex-1 ml-4" />
                    </div>

                    {group.records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record, idx) => (
                        <div
                            key={record.id || idx}
                            onClick={() => handleEntryClick(record.expenseId)}
                            className="group transition-all active:scale-[0.98] cursor-pointer"
                        >
                            <Card className="overflow-hidden border-none bg-muted/30 group-hover:bg-muted/50 transition-colors">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <div className="w-12 h-12 rounded-xl bg-background border flex flex-col items-center justify-center shrink-0 shadow-sm">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-0.5">
                                                {format(new Date(record.date), 'MMM')}
                                            </span>
                                            <span className="text-lg font-black leading-none">
                                                {format(new Date(record.date), 'dd')}
                                            </span>
                                        </div>

                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-lg font-bold">+{record.qty}</span>
                                                <span className="text-xs font-semibold text-muted-foreground">{record.unit}</span>
                                            </div>

                                            {record.rawInput && record.rawInput.toLowerCase() !== record.name.toLowerCase() && (
                                                <p className="text-xs text-muted-foreground italic truncate">
                                                    "{record.rawInput}"
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {record.note && (
                                            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                <StickyNote size={14} />
                                            </div>
                                        )}
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
        );
    }

    return (
        <div className="space-y-3 pb-24">
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
                                <h3 className="font-bold text-lg truncate capitalize leading-tight">
                                    {group.name}
                                </h3>
                                <p className="text-xs text-muted-foreground font-medium">
                                    {group.records.length} {group.records.length === 1 ? 'record' : 'records'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end">
                                <div className="flex items-baseline gap-1">
                                    <span className="font-black text-2xl text-primary leading-none">{group.totalQty}</span>
                                    <span className="text-xs font-bold text-muted-foreground uppercase">{group.unit}</span>
                                </div>
                            </div>
                            <ChevronRight className="text-muted-foreground opacity-30" size={20} />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
