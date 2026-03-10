import React, { useState, useRef } from 'react';
import { db } from '@/db/schema';
import { useLiveQuery } from 'dexie-react-hooks';
import { Input } from '@/components/ui/input';

interface ItemSuggestionsProps {
    value: string;
    onChange: (val: string) => void;
    onBlur?: () => void;
    onEnter?: () => void;
    id?: string;
    placeholder?: string;
    className?: string;
}

export const ItemSuggestions = React.forwardRef<HTMLInputElement, ItemSuggestionsProps>(
    ({ value, onChange, onBlur, onEnter, id, placeholder, className }, ref) => {
        const [cursorPos, setCursorPos] = useState(0);
        const internalRef = useRef<HTMLInputElement>(null);
        const inputRef = (ref as React.RefObject<HTMLInputElement>) || internalRef;

        // Get unique item names sorted by frequency
        const suggestions = useLiveQuery(async () => {
            const items = await db.items.toArray();
            const counts: Record<string, number> = {};
            items.forEach(item => {
                const name = item.name.toLowerCase().trim();
                if (name) {
                    counts[name] = (counts[name] || 0) + 1;
                }
            });
            return Object.entries(counts)
                .sort((a, b) => b[1] - a[1])
                .map(([name]) => name);
        }, []);


        const handleSelect = (suggestion: string) => {
            const before = value.slice(0, cursorPos);
            const after = value.slice(cursorPos);

            // Find the start of the current part
            const lastSeparator = Math.max(before.lastIndexOf(','), before.lastIndexOf('\n'));
            const start = lastSeparator === -1 ? 0 : lastSeparator + 1;

            // Check if there's already a quantity/unit (e.g. "5kg lum...")
            const textToReplace = before.slice(start);
            const qtyMatch = textToReplace.match(/^(\s*\d+\s*[a-zA-Z]*\s*)/);
            const prefix = qtyMatch ? qtyMatch[1] : (textToReplace.startsWith(' ') ? ' ' : '');

            const newPart = prefix + suggestion + ' ';
            const newValue = value.slice(0, start) + newPart + after;
            const newCursorPos = start + newPart.length;

            onChange(newValue);

            // Restore focus and set selection
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
                }
            }, 0);
        };

        return (
            <div className="relative w-full">
                <Input
                    ref={inputRef}
                    id={id}
                    list={id + "-suggestions"}
                    value={value}
                    autoComplete="on"
                    placeholder={placeholder}
                    className={className}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const newValue = e.target.value;
                        const newCursorPos = e.target.selectionStart || 0;

                        // Detect if the entire value was replaced by a suggestion (native selection)
                        // or if it matches exactly one of our suggestions and is significantly different from previous value
                        const isMatch = suggestions?.some(s => s.toLowerCase() === newValue.toLowerCase());

                        if (isMatch && newValue.length < value.length && !newValue.includes(',')) {
                            // Find the exact casing from suggestions
                            const suggestion = suggestions?.find(s => s.toLowerCase() === newValue.toLowerCase()) || newValue;
                            handleSelect(suggestion);
                        } else {
                            setCursorPos(newCursorPos);
                            onChange(newValue);
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            onEnter?.();
                        }
                    }}
                    onFocus={() => {
                        // Ensure input is visible when keyboard pops up
                        setTimeout(() => {
                            inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 300);
                    }}
                    onBlur={() => {
                        onBlur?.();
                    }}
                    onClick={(e) => {
                        setCursorPos((e.target as HTMLInputElement).selectionStart || 0);
                        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                />
                <datalist id={id + "-suggestions"}>
                    {suggestions?.slice(0, 10).map((suggestion: string) => (
                        <option key={suggestion} value={suggestion} />
                    ))}
                </datalist>
            </div>
        );
    }
);

