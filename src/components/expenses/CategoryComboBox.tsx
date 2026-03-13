import * as React from "react";
import { SuggestionInput } from "./SuggestionInput";
import { useCategoryStore } from "@/stores/categoryStore";
import { useTranslation } from "react-i18next";

interface CategoryComboBoxProps {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    onEnter?: () => void;
}

export const CategoryComboBox = React.forwardRef<HTMLInputElement, CategoryComboBoxProps>(
    ({ value, onChange, onBlur, onEnter }, ref) => {
        const { categories, addCategory } = useCategoryStore();
        const { t } = useTranslation();

        const sortedNames = React.useMemo(() => {
            return [...categories]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(c => c.name);
        }, [categories]);

        const hasExactMatch = React.useMemo(() => {
            return categories.some(c => c.name.toLowerCase() === value.toLowerCase().trim());
        }, [categories, value]);

        const handleSelect = async (selected: string) => {
            if (selected.startsWith("＋ Create ")) {
                const newName = selected.replace("＋ Create ", "").replace(/"/g, "").trim();
                const capitalized = newName.charAt(0).toUpperCase() + newName.slice(1);
                await addCategory(capitalized);
                onChange(capitalized);
                setTimeout(() => onEnter?.(), 100);
            } else {
                onChange(selected);
                onEnter?.();
            }
        };

        const action = React.useMemo(() => {
            if (!value.trim() || hasExactMatch) return undefined;
            return {
                label: `+ ${value.trim()}`,
                onClick: () => handleSelect(`＋ Create "${value.trim()}"`)
            };
        }, [value, hasExactMatch, handleSelect]);

        return (
            <SuggestionInput
                ref={ref}
                type="category"
                isMulti={false}
                value={value}
                customSuggestions={sortedNames}
                action={action}
                onChange={onChange}
                onBlur={onBlur}
                onSelectSuggestion={handleSelect}
                onEnter={onEnter}
                placeholder={t('categoryPlaceholder')}
                className="h-12 rounded-xl"
            />
        );
    }
);
