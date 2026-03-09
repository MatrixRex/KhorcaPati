import React, { useState, useMemo, useRef, useEffect } from 'react';
import { db } from '@/db/schema';
import { useLiveQuery } from 'dexie-react-hooks';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';

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
        const [isOpen, setIsOpen] = useState(false);
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

        // Find the current part being typed (separated by commas or newlines)
        const currentPart = useMemo(() => {
            const parts = value.slice(0, cursorPos).split(/[,\n]/);
            return parts[parts.length - 1].trim();
        }, [value, cursorPos]);

        const filteredSuggestions = useMemo(() => {
            if (!currentPart || currentPart.length < 1) return [];
            return suggestions?.filter(s =>
                s.toLowerCase().includes(currentPart.toLowerCase()) &&
                s.toLowerCase() !== currentPart.toLowerCase()
            ).slice(0, 5) || [];
        }, [currentPart, suggestions]);

        useEffect(() => {
            if (filteredSuggestions.length > 0) {
                setIsOpen(true);
            } else {
                setIsOpen(false);
            }
        }, [filteredSuggestions]);

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
            setIsOpen(false);

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
                <Popover open={isOpen} onOpenChange={setIsOpen}>
                    <PopoverAnchor asChild>
                        <Input
                            ref={inputRef}
                            id={id}
                            value={value}
                            autoComplete="off"
                            placeholder={placeholder}
                            className={className}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setCursorPos(e.target.selectionStart || 0);
                                onChange(e.target.value);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') setIsOpen(false);
                                if (e.key === 'Enter' && !isOpen) {
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
                                setTimeout(() => {
                                    setIsOpen(false);
                                    onBlur?.();
                                }, 200);
                            }}
                            onClick={(e) => {
                                setCursorPos((e.target as HTMLInputElement).selectionStart || 0);
                                inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                        />
                    </PopoverAnchor>
                    <PopoverContent
                        className="p-0 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-xl border-primary/20 shadow-xl z-[100]"
                        align="start"
                        side="top"
                        sideOffset={8}
                        avoidCollisions={true}
                        onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                        <Command className="bg-background">
                            <CommandList>
                                <CommandGroup heading="Inventory Suggestions" className="p-1">
                                    {filteredSuggestions.map((suggestion: string) => (
                                        <CommandItem
                                            key={suggestion}
                                            value={suggestion}
                                            onSelect={() => handleSelect(suggestion)}
                                            className="rounded-lg py-2 cursor-pointer capitalize font-medium flex items-center gap-2 group"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] group-aria-selected:bg-primary group-aria-selected:text-white transition-colors">
                                                📦
                                            </div>
                                            {suggestion}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        );
    }
);
