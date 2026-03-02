import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useCategoryStore } from "@/stores/categoryStore";

interface CategoryComboBoxProps {
    value: string;
    onChange: (value: string) => void;
}

export function CategoryComboBox({ value, onChange }: CategoryComboBoxProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const { categories, addCategory } = useCategoryStore();

    const filteredCategories = React.useMemo(() => {
        if (!search) return categories;
        const s = search.toLowerCase();
        return categories.filter(c =>
            c.name.toLowerCase().includes(s) ||
            // Simple fuzzy match: all characters in search exist in name in order
            isFuzzyMatch(s, c.name.toLowerCase())
        );
    }, [categories, search]);

    function isFuzzyMatch(search: string, name: string) {
        let i = 0;
        let j = 0;
        while (i < search.length && j < name.length) {
            if (search[i] === name[j]) i++;
            j++;
        }
        return i === search.length;
    }

    const handleCreateNew = async () => {
        if (!search) return;
        const id = await addCategory(search);
        onChange(search);
        setOpen(false);
        setSearch("");
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {value || "Select category..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Search category..."
                        value={search}
                        onValueChange={setSearch}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && filteredCategories.length === 0 && search) {
                                handleCreateNew();
                            }
                        }}
                    />
                    <CommandList>
                        {filteredCategories.length === 0 && search && (
                            <CommandEmpty className="p-0">
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start rounded-none border-b py-6"
                                    onClick={handleCreateNew}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create "{search}"
                                </Button>
                            </CommandEmpty>
                        )}
                        <CommandGroup>
                            {filteredCategories.map((category) => (
                                <CommandItem
                                    key={category.id}
                                    value={category.name}
                                    onSelect={(currentValue) => {
                                        onChange(currentValue);
                                        setOpen(false);
                                        setSearch("");
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === category.name ? "opacity-100" : "opacity-0"
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
