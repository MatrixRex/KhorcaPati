import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { db } from '@/db/schema';
import { useLiveQuery } from 'dexie-react-hooks';
import { Input } from '@/components/ui/input';
import { Tag, Package, Target } from 'lucide-react';

interface SuggestionInputProps {
    value: string;
    onChange: (val: string) => void;
    onBlur?: () => void;
    onEnter?: () => void;
    id?: string;
    placeholder?: string;
    className?: string;
    type?: 'note' | 'category' | 'goal';
    customSuggestions?: string[];
    isMulti?: boolean;
    disableSuggestions?: boolean;
    onSelectSuggestion?: (suggestion: string) => void;
    action?: {
        label: string;
        onClick: () => void;
    };
    disabled?: boolean;
    getItemIcon?: (suggestion: string) => React.ReactNode;
}


const STRIP_HEIGHT = 44; // px — height of the chip row

export const SuggestionInput = React.forwardRef<HTMLInputElement, SuggestionInputProps>(
    ({ value, onChange, onBlur, onEnter, id, placeholder, className, type = 'note', customSuggestions, isMulti = true, disableSuggestions = false, onSelectSuggestion, action, disabled, getItemIcon }, ref) => {

        const [isFocused, setIsFocused] = useState(false);
        const [cursorPos, setCursorPos] = useState(0);
        const internalRef = useRef<HTMLInputElement>(null);
        const inputRef = (ref as React.RefObject<HTMLInputElement>) || internalRef;

        // wrapperRef wraps ONLY the input — so top:100% on the strip = directly below input
        const wrapperRef = useRef<HTMLDivElement>(null);
        const [stripStyle, setStripStyle] = useState<React.CSSProperties>({});

        // Get unique item names sorted by frequency (only if no custom suggestions and suggestions not disabled)
        const dbSuggestions = useLiveQuery(async () => {
            if (customSuggestions || disableSuggestions) return [];
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
        }, [customSuggestions, disableSuggestions]);

        // Gate on disableSuggestions as a final guard regardless of cached query state
        const suggestionsList = useMemo(() => {
            return disableSuggestions ? [] : (customSuggestions || dbSuggestions || []);
        }, [disableSuggestions, customSuggestions, dbSuggestions]);

        const currentPart = useMemo(() => {
            const safeValue = value || '';
            if (!isMulti) return safeValue.trim();
            const parts = safeValue.slice(0, cursorPos).split(/[,\n]/);
            return parts[parts.length - 1].trim();
        }, [value, cursorPos, isMulti]);

        const filteredSuggestions = useMemo(() => {
            const safeSuggestions = suggestionsList || [];
            if (!currentPart || currentPart.length < 1) return safeSuggestions.slice(0, 10);
            
            const lowerPart = currentPart.toLowerCase();
            const searchPattern = lowerPart.replace(/\s+/g, '');

            const exactMatches: string[] = [];
            const fuzzyMatches: string[] = [];

            safeSuggestions.forEach(s => {
                if (!s) return;
                const lowerS = s.toLowerCase();
                
                if (lowerS.trim() === lowerPart) {
                    exactMatches.unshift(s);
                    return;
                }

                if (lowerS.includes(lowerPart)) {
                    exactMatches.push(s);
                } else if (searchPattern.length > 0) {
                    let pIdx = 0;
                    for (let i = 0; i < lowerS.length && pIdx < searchPattern.length; i++) {
                        if (lowerS[i] === searchPattern[pIdx]) {
                            pIdx++;
                        }
                    }
                    if (pIdx === searchPattern.length) {
                        fuzzyMatches.push(s);
                    }
                }
            });

            return [...new Set([...exactMatches, ...fuzzyMatches])].slice(0, 10);
        }, [currentPart, suggestionsList]);

        const showStrip = isFocused && (filteredSuggestions.length > 0 || !!action);

        // Compute strip position: break out of any grid-column constraint by measuring
        // vs the viewport, then anchoring to the sheet's inner edges.
        const computeStripStyle = useCallback(() => {
            if (!wrapperRef.current) return;
            const rect = wrapperRef.current.getBoundingClientRect();
            const sheetPadding = rect.left; // input's left == sheet/form left padding
            const stripLeft = -rect.left + sheetPadding; // = 0 → aligns to sheet left edge
            const stripWidth = window.innerWidth - sheetPadding * 2;
            setStripStyle({ left: stripLeft, width: stripWidth });
        }, []);

        useEffect(() => {
            if (showStrip) {
                computeStripStyle();
                setTimeout(() => {
                    wrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 120);
            }
        }, [showStrip, computeStripStyle]);

        useEffect(() => {
            if (!window.visualViewport) return;
            const handleResize = () => {
                if (document.activeElement === inputRef.current && window.visualViewport) {
                    const isKeyboardOpen = window.visualViewport.height < window.innerHeight * 0.8;
                    if (isKeyboardOpen) {
                        computeStripStyle();
                        setTimeout(() => {
                            wrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }, 150);
                    }
                }
            };
            window.visualViewport.addEventListener('resize', handleResize);
            return () => window.visualViewport?.removeEventListener('resize', handleResize);
        }, [computeStripStyle, inputRef]);

        const handleSelect = (suggestion: string) => {
            if (onSelectSuggestion) {
                onSelectSuggestion(suggestion);
                return;
            }
            if (!isMulti) {
                onChange(suggestion);
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
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
                }
            }, 0);
        };

        const icon = (() => {
            switch (type) {
                case 'category': return <Tag className="w-3.5 h-3.5" />;
                case 'goal': return <Target className="w-3.5 h-3.5" />;
                default: return <Package className="w-3.5 h-3.5" />;
            }
        })();

        return (
            // Outer div: full-width column flow — input wrapper + spacer stacked vertically
            <div className="w-full">

                {/* Inner wrapper: ONLY wraps the input so top:100% on the strip
                    anchors to the bottom of the input with zero extra gap */}
                <div ref={wrapperRef} className="relative">
                    <Input
                        ref={inputRef}
                        id={id}
                        value={value}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                        enterKeyHint={isMulti ? 'enter' : 'next'}
                        placeholder={placeholder}
                        className={cn(
                            className,
                            disabled && "bg-muted/50 border-dashed opacity-70 cursor-not-allowed grayscale-[0.5] font-medium"
                        )}
                        disabled={disabled}

                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {

                            setCursorPos(e.target.selectionStart || 0);
                            onChange(e.target.value);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                setIsFocused(false);
                            }
                            if (e.key === 'Enter') {
                                if (filteredSuggestions.length > 0) {
                                    e.preventDefault();
                                    handleSelect(filteredSuggestions[0]);
                                } else if (action) {
                                    e.preventDefault();
                                    action.onClick();
                                } else {
                                    const exactMatch = (suggestionsList || []).find(s =>
                                        s && s.toLowerCase().trim() === currentPart.toLowerCase().trim()
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
                            setIsFocused(true);
                            if (!isMulti && value) inputRef.current?.select();
                            setTimeout(() => {
                                inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 300);
                        }}
                        onBlur={() => {
                            // Delay so onMouseDown on a chip fires before we hide the strip
                            setTimeout(() => {
                                setIsFocused(false);
                                onBlur?.();
                            }, 200);
                        }}
                        onClick={(e) => {
                            if (!isMulti && value) (e.target as HTMLInputElement).select();
                            setCursorPos((e.target as HTMLInputElement).selectionStart || 0);
                            setTimeout(() => {
                                inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 100);
                        }}
                    />

                    {/* Strip: absolute below the input, width escapes the grid column */}
                    <div
                        className={cn(
                            'absolute top-full z-[150] transition-all duration-200 ease-out',
                            showStrip
                                ? 'opacity-100 translate-y-0 pointer-events-auto'
                                : 'opacity-0 -translate-y-1 pointer-events-none'
                        )}
                        style={stripStyle}
                    >
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1">
                            {action && (
                                <button
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); action.onClick(); }}
                                    className="whitespace-nowrap flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20 transition-all active:scale-95 shrink-0"
                                >
                                    <span className="text-xs font-bold">{action.label}</span>
                                </button>
                            )}
                            {filteredSuggestions.map((suggestion: string, index: number) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); handleSelect(suggestion); }}
                                    className={cn(
                                        'whitespace-nowrap flex items-center gap-2 px-3 py-2 rounded-xl transition-all active:scale-95 group shrink-0 border',
                                        index === 0
                                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                            : 'bg-muted/50 text-foreground border-transparent hover:bg-primary/10 hover:text-primary hover:border-primary/20'
                                    )}
                                >
                                     <span className="flex items-center justify-center">
                                        {getItemIcon ? getItemIcon(suggestion) : icon}
                                    </span>
                                    <span className="text-xs font-bold capitalize">{suggestion}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Spacer: sibling to the input wrapper — pushes the next form row down
                    by the strip height so the absolute strip never overlaps content below.
                    Must be OUTSIDE the positioned wrapper to avoid inflating wrapper height
                    (which would shift top:100% further down and create a gap). */}
                <div
                    className="transition-all duration-200 ease-out"
                    style={{ height: showStrip ? STRIP_HEIGHT + 8 : 0 }}
                />
            </div>
        );
    }
);
