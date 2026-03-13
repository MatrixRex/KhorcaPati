import * as React from 'react';
import { SortAsc, ChevronDown, ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useFilterStore, type InventorySortBy } from '@/stores/filterStore';

import { useTranslation } from 'react-i18next';

export function InventorySort() {
    const { inventorySortBy, setInventorySortBy } = useFilterStore();
    const [isOpen, setIsOpen] = React.useState(false);
    const { t } = useTranslation();

    const labels: Record<InventorySortBy, string> = {
        alphabet: t('alphabetical'),
        count: t('totalCount')
    };

    const icons: Record<InventorySortBy, React.ReactNode> = {
        alphabet: <SortAsc className="h-3.5 w-3.5 opacity-60" />,
        count: <ListOrdered className="h-3.5 w-3.5 opacity-60" />
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 px-2 text-xs font-medium hover:bg-accent/50 group"
                >
                    {icons[inventorySortBy]}
                    <span className="hidden sm:inline">{labels[inventorySortBy]}</span>
                    <ChevronDown className={cn("h-3 w-3 opacity-40 transition-transform duration-200", isOpen && "rotate-180")} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-0 overflow-hidden" align="end">
                <div className="flex flex-col p-2 space-y-1">
                    <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('sortBy')}
                    </div>
                    {(['alphabet', 'count'] as InventorySortBy[]).map((option) => (
                        <Button
                            key={option}
                            variant={inventorySortBy === option ? 'secondary' : 'ghost'}
                            size="sm"
                            className="justify-start font-normal gap-2"
                            onClick={() => {
                                setInventorySortBy(option);
                                setIsOpen(false);
                            }}
                        >
                            {icons[option]}
                            {labels[option]}
                        </Button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
