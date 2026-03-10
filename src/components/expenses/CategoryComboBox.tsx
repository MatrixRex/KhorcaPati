import React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useCategoryStore } from "@/stores/categoryStore";

interface CategoryComboBoxProps {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    onEnter?: () => void;
}

export const CategoryComboBox = React.forwardRef<HTMLInputElement, CategoryComboBoxProps>(
    ({ value, onChange, onBlur, onEnter }, ref) => {
        const [isModified, setIsModified] = React.useState(false);
        const [showError, setShowError] = React.useState(false);
        const { categories, addCategory } = useCategoryStore();

        const sortedCategories = React.useMemo(() => {
            return [...categories].sort((a, b) => a.name.localeCompare(b.name));
        }, [categories]);

        const hasExactMatch = React.useMemo(() => {
            return categories.some(c => c.name.toLowerCase() === value.toLowerCase());
        }, [categories, value]);

        const handleCreateNew = async () => {
            if (!value) return;
            const capitalizedValue = value.trim().charAt(0).toUpperCase() + value.trim().slice(1);
            await addCategory(capitalizedValue);
            onChange(capitalizedValue);
            setIsModified(false);
            setShowError(false);
            onBlur?.();
        };

        const handleSelect = (categoryName: string) => {
            onChange(categoryName);
            setIsModified(false);
            setShowError(false);
        };

        return (
            <div className="flex flex-col gap-1 w-full relative group">
                <div className="relative flex items-center">
                    <Input
                        ref={ref}
                        list="category-suggestions"
                        placeholder="Search or enter category..."
                        value={value}
                        autoComplete="on"
                        onChange={(e) => {
                            const newVal = e.target.value;
                            onChange(newVal);
                            setIsModified(true);
                            setShowError(false);

                            // Detect if the change came from a datalist selection
                            const match = categories.find(c => c.name === newVal);
                            if (match) {
                                handleSelect(match.name);
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                if (hasExactMatch) {
                                    const match = categories.find(c => c.name.toLowerCase() === value.toLowerCase());
                                    if (match) handleSelect(match.name);
                                    onEnter?.();
                                } else if (!isModified) {
                                    onEnter?.();
                                }
                            }
                        }}
                        onBlur={() => {
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
                            onBlur?.();
                        }}
                        className={cn(
                            "w-full pr-10 h-12 rounded-xl border-primary/20",
                            showError && !hasExactMatch && value.trim() !== "" && "border-destructive focus-visible:ring-destructive/50"
                        )}
                    />
                    {!hasExactMatch && value.trim() !== "" && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCreateNew();
                            }}
                            className="absolute right-2 p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <datalist id="category-suggestions">
                    {sortedCategories.map((category) => (
                        <option key={category.id} value={category.name} />
                    ))}
                </datalist>
                {showError && !hasExactMatch && value.trim() !== "" && (
                    <p className="text-[10px] text-destructive font-bold pl-2 animate-in fade-in slide-in-from-top-1">
                        New category will be saved as "Unsorted" unless created.
                    </p>
                )}
            </div>
        );
    }
);


