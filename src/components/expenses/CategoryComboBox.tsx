import * as React from "react";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverAnchor,
} from "@/components/ui/popover";
import { useCategoryStore } from "@/stores/categoryStore";

interface CategoryComboBoxProps {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
}

export function CategoryComboBox({ value, onChange, onBlur }: CategoryComboBoxProps) {
    const [open, setOpen] = React.useState(false);
    const [isModified, setIsModified] = React.useState(false);
    const [showError, setShowError] = React.useState(false);
    const { categories, addCategory } = useCategoryStore();
    const skipBlurRef = React.useRef(false);

    const sortedCategories = React.useMemo(() => {
        return [...categories].sort((a, b) => a.name.localeCompare(b.name));
    }, [categories]);

    const filteredCategories = React.useMemo(() => {
        if (!isModified || !value) return sortedCategories;
        const s = value.toLowerCase();
        return sortedCategories.filter(c =>
            c.name.toLowerCase().includes(s) ||
            isFuzzyMatch(s, c.name.toLowerCase())
        );
    }, [sortedCategories, value, isModified]);

    const hasExactMatch = React.useMemo(() => {
        return categories.some(c => c.name.toLowerCase() === value.toLowerCase());
    }, [categories, value]);

    function isFuzzyMatch(search: string, name: string) {
        let i = 0;
        let j = 0;
        while (i < search.length && j < name.length) {
            if (search[i].toLowerCase() === name[j].toLowerCase()) i++;
            j++;
        }
        return i === search.length;
    }

    const handleCreateNew = async () => {
        if (!value) return;
        const capitalizedValue = value.trim().charAt(0).toUpperCase() + value.trim().slice(1);
        await addCategory(capitalizedValue);
        onChange(capitalizedValue);
        setIsModified(false);
        setShowError(false);
        setOpen(false);
        // Trigger save immediately after creation
        onBlur?.();
    };

    return (
        <Popover open={open} onOpenChange={setOpen} modal={false}>
            <PopoverAnchor asChild>
                <div className="flex flex-col gap-1">
                    <Input
                        placeholder="Search or enter category..."
                        value={value}
                        onChange={(e) => {
                            onChange(e.target.value);
                            setIsModified(true);
                            setShowError(false);
                            if (!open) setOpen(true);
                        }}
                        onFocus={(e) => {
                            e.target.select();
                            setIsModified(false);
                            setShowError(false);
                            setOpen(true);
                        }}
                        onClick={() => {
                            if (!open) setOpen(true);
                        }}
                        onBlur={() => {
                            // Delay to allow clicking on suggestions before enforcing/closing
                            setTimeout(() => {
                                if (skipBlurRef.current) {
                                    skipBlurRef.current = false;
                                    return;
                                }

                                const trimmedValue = value.trim();

                                if (trimmedValue === "") {
                                    onChange("Unsorted");
                                } else {
                                    const match = sortedCategories.find(
                                        c => c.name.toLowerCase() === trimmedValue.toLowerCase()
                                    );

                                    if (match) {
                                        onChange(match.name);
                                        setIsModified(false);
                                    } else if (isModified) {
                                        setShowError(true);
                                    }
                                }

                                setOpen(false);
                                onBlur?.();
                            }, 250);
                        }}
                        className={cn(
                            "w-full",
                            showError && !hasExactMatch && value.trim() !== "" && "border-destructive focus-visible:ring-destructive/50"
                        )}
                    />
                    {showError && !hasExactMatch && value.trim() !== "" && (
                        <p className="text-[10px] text-destructive font-medium pl-1">
                            New category not created. Record will be saved as "Unsorted".
                        </p>
                    )}
                </div>
            </PopoverAnchor>
            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0 pointer-events-auto"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onMouseDown={() => {
                    // Prevent blur logic from running when we are clicking suggestions
                    skipBlurRef.current = true;
                }}
                onInteractOutside={(e) => {
                    // Prevent closing when clicking inside the input
                    const target = e.target as HTMLElement;
                    if (target?.closest('[data-slot="popover-anchor"]')) {
                        e.preventDefault();
                    }
                }}
            >
                <Command shouldFilter={false}>
                    <CommandList className="max-h-[200px] overflow-y-auto">
                        {!hasExactMatch && value.trim() !== "" && (
                            <CommandGroup heading="New Category">
                                <CommandItem
                                    value={value}
                                    onSelect={handleCreateNew}
                                    className="cursor-pointer"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create "{value.trim().charAt(0).toUpperCase() + value.trim().slice(1)}"
                                </CommandItem>
                            </CommandGroup>
                        )}
                        <CommandGroup heading="Suggestions">
                            {filteredCategories.map((category) => (
                                <CommandItem
                                    key={category.id}
                                    value={category.name}
                                    onSelect={() => {
                                        onChange(category.name);
                                        setIsModified(false);
                                        setShowError(false);
                                        setOpen(false);
                                        // Trigger save immediately after selection
                                        onBlur?.();
                                    }}
                                    className="cursor-pointer"
                                    onMouseDown={(e) => e.preventDefault()}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value.toLowerCase() === category.name.toLowerCase() ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {category.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

