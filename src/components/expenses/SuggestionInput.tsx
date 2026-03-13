import React, { useState, useMemo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { db } from '@/db/schema';
import { useLiveQuery } from 'dexie-react-hooks';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Command, CommandList } from '@/components/ui/command';

interface SuggestionInputProps {
    value: string;
    onChange: (val: string) => void;
    onBlur?: () => void;
    onEnter?: () => void;
    id?: string;
    placeholder?: string;
    className?: string;
    type?: 'note' | 'category';
    customSuggestions?: string[];
    isMulti?: boolean;
    onSelectSuggestion?: (suggestion: string) => void;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export const SuggestionInput = React.forwardRef<HTMLInputElement, SuggestionInputProps>(
    ({ value, onChange, onBlur, onEnter, id, placeholder, className, type = 'note', customSuggestions, isMulti = true, onSelectSuggestion, action }, ref) => {
        const [isOpen, setIsOpen] = useState(false);
        const [cursorPos, setCursorPos] = useState(0);
        const internalRef = useRef<HTMLInputElement>(null);
        const inputRef = (ref as React.RefObject<HTMLInputElement>) || internalRef;

        // Get unique item names sorted by frequency (only if no custom suggestions)
        const dbSuggestions = useLiveQuery(async () => {
            if (customSuggestions) return [];
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
        }, [customSuggestions]);

        const suggestionsList = customSuggestions || dbSuggestions || [];

        // Find the current part being typed
        const currentPart = useMemo(() => {
            if (!isMulti) return value.trim();
            const parts = value.slice(0, cursorPos).split(/[,\n]/);
            return parts[parts.length - 1].trim();
        }, [value, cursorPos, isMulti]);

        const filteredSuggestions = useMemo(() => {
            if (!currentPart || currentPart.length < 1) return suggestionsList.slice(0, 10);
            return suggestionsList?.filter(s =>
                s.toLowerCase().includes(currentPart.toLowerCase()) &&
                s.toLowerCase().trim() !== currentPart.toLowerCase().trim()
            ).slice(0, 10) || [];
        }, [currentPart, suggestionsList]);

        useEffect(() => {
            if ((filteredSuggestions.length > 0 || action) && document.activeElement === inputRef.current) {
                setIsOpen(true);
            } else {
                setIsOpen(false);
            }
        }, [filteredSuggestions, action]);

        useEffect(() => {
            if (!window.visualViewport) return;

            const handleResize = () => {
                if (document.activeElement === inputRef.current && window.visualViewport) {
                    const isKeyboardOpen = window.visualViewport.height < window.innerHeight * 0.8;
                    if (isKeyboardOpen) {
                        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            };

            window.visualViewport.addEventListener('resize', handleResize);
            return () => window.visualViewport?.removeEventListener('resize', handleResize);
        }, []);

        const handleSelect = (suggestion: string) => {
            if (onSelectSuggestion) {
                onSelectSuggestion(suggestion);
                setIsOpen(false);
                return;
            }

            if (!isMulti) {
                onChange(suggestion);
                setIsOpen(false);
                setTimeout(() => onEnter?.(), 50);
                return;
            }

            const before = value.slice(0, cursorPos);
            const after = value.slice(cursorPos);

            const lastSeparator = Math.max(before.lastIndexOf(','), before.lastIndexOf('\n'));
            const start = lastSeparator === -1 ? 0 : lastSeparator + 1;

            const textToReplace = before.slice(start);
            const qtyMatch = textToReplace.match(/^(\s*\d+\s*[a-zA-Z]*\s*)/);
            const prefix = qtyMatch ? qtyMatch[1] : (textToReplace.startsWith(' ') ? ' ' : '');

            const newPart = prefix + suggestion + ' ';
            const newValue = value.slice(0, start) + newPart + after;
            const newCursorPos = start + newPart.length;

            onChange(newValue);
            setIsOpen(false);

            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
                }
            }, 0);
        };

        const icon = type === 'category' ? '🏷️' : '📦';

        return (
            <div className="relative w-full">
                <Popover open={isOpen} onOpenChange={setIsOpen} modal={false}>
                    <PopoverAnchor asChild>
                        <Input
                            ref={inputRef}
                            id={id}
                            value={value}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck="false"
                            enterKeyHint={isMulti ? "enter" : "next"}
                            placeholder={placeholder}
                            className={cn(className)}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setCursorPos(e.target.selectionStart || 0);
                                onChange(e.target.value);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setIsOpen(false);
                                }
                                if (e.key === 'Enter') {
                                    // If there are suggestions visible, pick the first one
                                    if (filteredSuggestions.length > 0) {
                                        e.preventDefault();
                                        handleSelect(filteredSuggestions[0]);
                                    } 
                                    // Otherwise if there is a pending action (like creating a category), trigger it
                                    else if (action) {
                                        e.preventDefault();
                                        action.onClick();
                                    } 
                                    // If no suggestions, check if we typed an exact match (even if it's hidden from the dropdown)
                                    // This handles the case where you type "food" and it should match "Food" (official category)
                                    else {
                                        const exactMatch = suggestionsList.find(s => 
                                            s.toLowerCase().trim() === currentPart.toLowerCase().trim()
                                        );
                                        if (exactMatch && !isMulti) {
                                            e.preventDefault();
                                            handleSelect(exactMatch);
                                        } else {
                                            onEnter?.();
                                        }
                                    }
                                }
                            }}
                            onFocus={() => {
                                if (!isMulti && value) {
                                    inputRef.current?.select();
                                }
                                if (filteredSuggestions.length > 0 || action) setIsOpen(true);
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
                                if (!isMulti && value) {
                                    (e.target as HTMLInputElement).select();
                                }
                                setCursorPos((e.target as HTMLInputElement).selectionStart || 0);
                                if (filteredSuggestions.length > 0 || action) setIsOpen(true);
                                setTimeout(() => {
                                    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }, 100);
                            }}
                        />
                    </PopoverAnchor>
                    <PopoverContent
                        className="p-1 w-[calc(100vw-48px)] max-w-md overflow-hidden rounded-2xl border-primary/20 shadow-2xl z-[100] bg-background/95 backdrop-blur-md"
                        align="center"
                        side="top"
                        sideOffset={8}
                        avoidCollisions={true}
                        collisionPadding={24}
                        onOpenAutoFocus={(e) => e.preventDefault()}
                        onInteractOutside={(e) => {
                            const target = e.target as HTMLElement;
                            if (target?.closest('[data-slot="popover-anchor"]')) {
                                e.preventDefault();
                            }
                        }}
                    >
                        <Command className="bg-transparent">
                            <CommandList className="max-h-none overflow-visible">
                                <div className="flex items-center gap-1.5 p-1 overflow-x-auto no-scrollbar scroll-smooth">
                                    {action && (
                                        <button
                                            key="action"
                                            type="button"
                                            onClick={action.onClick}
                                            className="whitespace-nowrap flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20 transition-all active:scale-95 shrink-0"
                                        >
                                            <span className="text-xs font-bold">{action.label}</span>
                                        </button>
                                    )}
                                    {filteredSuggestions.map((suggestion: string, index: number) => (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            onClick={() => handleSelect(suggestion)}
                                            className={cn(
                                                "whitespace-nowrap flex items-center gap-2 px-3 py-2 rounded-xl transition-all active:scale-95 group shrink-0 border",
                                                index === 0 
                                                    ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                                                    : "bg-muted/50 text-foreground border-transparent hover:bg-primary/10 hover:text-primary hover:border-primary/20"
                                            )}
                                        >
                                            <span className="text-xs">{icon}</span>
                                            <span className="text-xs font-bold capitalize">{suggestion}</span>
                                        </button>
                                    ))}
                                </div>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        );
    }
);
