import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

export function ItemTracker() {
    const items = useLiveQuery(
        () => db.items.orderBy('date').reverse().toArray()
    );

    if (!items) {
        return <div className="p-4 text-center text-muted-foreground">Loading items...</div>;
    }

    if (items.length === 0) {
        return (
            <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="text-4xl mb-4">📦</div>
                <h3 className="font-semibold text-lg">Inventory empty</h3>
                <p className="text-muted-foreground text-sm">Add items using the smart input bar above.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2 pb-20">
            {items.map((item) => (
                <Card key={item.id} className="mb-2 hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex flex-col flex-1 pr-2 overflow-hidden">
                            <h3 className="font-semibold text-base truncate capitalize">{item.name}</h3>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                <span>{format(new Date(item.date), 'MMM d, yyyy')}</span>
                                {item.rawInput && (
                                    <>
                                        <span>•</span>
                                        <span className="italic">"{item.rawInput}"</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="shrink-0 flex items-baseline gap-1 bg-secondary/50 px-2 py-1 rounded-md">
                            <span className="font-bold text-lg text-primary">{item.qty}</span>
                            <span className="text-sm text-muted-foreground">{item.unit}</span>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
