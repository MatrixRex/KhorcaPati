import * as React from 'react';
import { Tag, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useFilterStore } from '@/stores/filterStore';
import { useCategoryStore } from '@/stores/categoryStore';

export function CategoryFilter() {
    const { selectedCategory, setCategory } = useFilterStore();
    const { categories, loadCategories } = useCategoryStore();
    const [isOpen, setIsOpen] = React.useState(false);

    React.useEffect(() => {
        if (categories.length === 0) {
            loadCategories();
        }
    }, [categories.length, loadCategories]);

    const sortedCategories = React.useMemo(() => {
        return [...categories].sort((a, b) => a.name.localeCompare(b.name));
    }, [categories]);

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCategory(null);
    };

    return (
        <div className="flex items-center gap-1">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "h-8 gap-1 px-2 text-xs font-medium hover:bg-accent/50 group shrink-0",
                            selectedCategory && "text-primary bg-primary/10 hover:bg-primary/20"
                        )}
                    >
                        <Tag className={cn("h-3.5 w-3.5 opacity-60", selectedCategory && "opacity-100")} />
                        <span className="truncate max-w-[80px]">
                            {selectedCategory || 'Category'}
                        </span>
                        {!selectedCategory ? (
                            <ChevronDown className={cn("h-3 w-3 opacity-40 transition-transform duration-200", isOpen && "rotate-180")} />
                        ) : (
                            <button
                                onClick={handleClear}
                                className="ml-1 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="end">
                    <div className="flex flex-col space-y-1">
                        <Button
                            variant={selectedCategory === null ? 'secondary' : 'ghost'}
                            size="sm"
                            className="justify-between font-normal h-8"
                            onClick={() => {
                                setCategory(null);
                                setIsOpen(false);
                            }}
                        >
                            <span className="flex items-center gap-2">
                                <Tag className="h-3.5 w-3.5 opacity-40" />
                                All Categories
                            </span>
                            {selectedCategory === null && <Check className="h-3.5 w-3.5" />}
                        </Button>
                        <div className="h-px bg-border my-1" />
                        <div className="max-h-[240px] overflow-y-auto pr-1">
                            {sortedCategories.map((category) => (
                                <Button
                                    key={category.id}
                                    variant={selectedCategory === category.name ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="justify-between font-normal h-8 w-full mb-1"
                                    onClick={() => {
                                        setCategory(category.name);
                                        setIsOpen(false);
                                    }}
                                >
                                    <span className="truncate">{category.name}</span>
                                    {selectedCategory === category.name && <Check className="h-3.5 w-3.5" />}
                                </Button>
                            ))}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
