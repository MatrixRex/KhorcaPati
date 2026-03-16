import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Button } from '@/components/ui/button';
import { cn, formatNumber } from '@/lib/utils';
import { Delete, Check } from 'lucide-react';
import { useCloseWatcher } from '@/hooks/use-close-watcher';
import { useTranslation } from 'react-i18next';

interface NumberPadProps {
    value: string;
    label?: string;
    inputId?: string;
    onChange: (value: string) => void;
    onDone: () => void;
    onClose: () => void;
}

export function NumberPad({ value, label, inputId = 'amount', onChange, onDone, onClose }: NumberPadProps) {
    const { t } = useTranslation();
    useCloseWatcher(true, onClose);
    const [display, setDisplay] = useState(value || '0');
    const [liveResult, setLiveResult] = useState<string>(value || '0');

    useEffect(() => {
        // Sync with external value
        const currentNum = parseFloat(liveResult) || 0;
        const incomingNum = parseFloat(value) || 0;

        if (incomingNum !== currentNum || (value === '0' && display !== '0')) {
            setDisplay(value || '0');
            setLiveResult(value || '0');
        }
    }, [value]);

    const rootRef = useRef<HTMLDivElement>(null);

    // Scroll into view on mount when pad opens
    useEffect(() => {
        const rootNode = rootRef.current;
        if (!rootNode) return;

        // Since NumberPad is rendered via portal to document.body, rootNode has no sheet ancestors.
        // So we look for the active input element directly to find the scrollable container.
        const inputEl = document.getElementById(inputId);
        if (!inputEl) return;

        const container = inputEl.closest('.overflow-y-auto') as HTMLElement;
        if (!container) return;

        const originalPadding = container.style.paddingBottom;

        // Add robust padding equal to approx key pad height, so we actually have scroll room
        const timer = setTimeout(() => {
            // The pad panel is the actual floating UI (last child of root)
            const padPanel = rootNode.lastElementChild as HTMLElement;
            // Get measured height or fallback to around 420px
            const padHeight = padPanel?.offsetHeight || 420;
            const extraPadding = `${padHeight + 40}px`;

            container.style.paddingBottom = extraPadding;

            // Give the browser layout engine a moment before calculating coordinates
            requestAnimationFrame(() => {
                const inputRect = inputEl.getBoundingClientRect();
                const padTop = window.innerHeight - padHeight;
                const idealMargin = 20;

                // How much does the input's bottom dip below our ideal Y-coordinate?
                const overdrawn = inputRect.bottom - (padTop - idealMargin);

                if (overdrawn > 0) {
                    // Input is covered by pad (or too close), scroll it up by exact overlap
                    container.scrollBy({ top: overdrawn, behavior: 'smooth' });
                } else if (inputRect.top < idealMargin) {
                    // It's scrolled too far up past the visible top of the drawer!
                    container.scrollBy({ top: inputRect.top - idealMargin, behavior: 'smooth' });
                }
            });
        }, 50); // very small delay letting layout init happen

        return () => {
            clearTimeout(timer);
            // Restore padding with a slight delay when closing to prevent abrupt jumps out
            setTimeout(() => {
                if (container) container.style.paddingBottom = originalPadding;
            }, 300); // 300ms matches exit animation
        };
    }, []);

    const calculateLive = (expr: string) => {
        try {
            const sanitized = expr.replace(/[^-+*/.0-9]/g, '');
            if (!sanitized) return '0';

            // Tokenize: group numbers (including decimals) and operators
            const tokens = sanitized.match(/(\d+\.?\d*|[-+*/])/g);
            if (!tokens || tokens.length === 0) return '0';

            // Handle starting with an operator or a single number
            let result = 0;
            let i = 0;

            if (tokens[0] === '-') {
                result = -parseFloat(tokens[1] || '0');
                i = 2;
            } else if (['+', '*', '/'].includes(tokens[0])) {
                result = 0; // Ignore leading non-minus operators or start at 0
                i = 1;
            } else {
                result = parseFloat(tokens[0]);
                i = 1;
            }

            // Process remaining tokens sequentially (Left-to-Right)
            while (i < tokens.length) {
                const operator = tokens[i];
                const nextValStr = tokens[i + 1];

                // If there's no next number (trailing operator), we stop and return what we have
                if (nextValStr === undefined || nextValStr === '' || ['+', '-', '*', '/'].includes(nextValStr)) {
                    break;
                }

                const nextVal = parseFloat(nextValStr);
                if (!isNaN(nextVal)) {
                    switch (operator) {
                        case '+': result += nextVal; break;
                        case '-': result -= nextVal; break;
                        case '*': result *= nextVal; break;
                        case '/': result = nextVal !== 0 ? result / nextVal : result; break;
                    }
                }
                i += 2;
            }

            if (isNaN(result) || !isFinite(result)) return liveResult;
            return String(Number(result.toFixed(2)));
        } catch (e) {
            console.error("Calculator Error:", e);
            return liveResult;
        }
    };

    const handlePress = (key: string) => {
        if (key === 'AC') {
            setDisplay('0');
            setLiveResult('0');
            onChange('0');
        } else if (key === 'DEL') {
            const newDisplay = display.length > 1 ? display.slice(0, -1) : '0';
            setDisplay(newDisplay);
            const live = calculateLive(newDisplay);
            setLiveResult(live);
            onChange(live);
        } else {
            let newDisplay = display;
            if (display === '0' && !['+', '-', '*', '/', '.'].includes(key)) {
                newDisplay = key;
            } else {
                newDisplay = display + key;
            }
            setDisplay(newDisplay);
            const live = calculateLive(newDisplay);
            setLiveResult(live);
            // We only notify parent of the evaluated result if it's a valid number
            if (!['+', '-', '*', '/'].includes(key)) {
                onChange(live);
            }
        }
    };

    const handleDone = () => {
        const final = calculateLive(display);
        onChange(final);
        onDone();
    };

    const padLayout = [
        { key: 'AC', span: 2 }, { key: 'DEL', span: 1 }, { key: '/', span: 1 },
        { key: '7', span: 1 }, { key: '8', span: 1 }, { key: '9', span: 1 }, { key: '*', span: 1 },
        { key: '4', span: 1 }, { key: '5', span: 1 }, { key: '6', span: 1 }, { key: '-', span: 1 },
        { key: '1', span: 1 }, { key: '2', span: 1 }, { key: '3', span: 1 }, { key: '+', span: 1 },
        { key: '0', span: 1 }, { key: '.', span: 1 }, { key: 'DONE', span: 2 }
    ];

    return ReactDOM.createPortal(
        <div ref={rootRef} className="fixed inset-x-0 bottom-0 z-[100] animate-in slide-in-from-bottom duration-300 pointer-events-none">
            {/* Click-away area - transparent, blur is scoped to the panel below */}
            <div className="fixed inset-0 pointer-events-auto" onClick={onClose} />
            
            <div className="bg-background/80 backdrop-blur-md border-t border-border/40 rounded-t-[32px] p-4 pb-8 shadow-[0_-15px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-15px_40px_rgba(0,0,0,0.3)] max-w-md mx-auto pointer-events-auto relative ring-1 ring-border/20">
                {/* Compact Indicator */}
                <div className="w-12 h-1 bg-muted/40 rounded-full mx-auto mb-3" />
                
                {/* Compact Header (Formula Only) */}
                <div className="mb-4 px-2">
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">
                            {label || t('inputAmount')}
                        </span>
                        <div className="text-2xl font-bold text-foreground overflow-hidden whitespace-nowrap overflow-ellipsis">
                            {display.split('').map(char => /[0-9]/.test(char) ? formatNumber(char) : char).join('')}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    {padLayout.map(({ key, span }) => {
                        const colSpanClass = span === 2 ? "col-span-2" : "col-span-1";

                        if (key === 'AC') {
                            return (
                                <Button
                                    key={key}
                                    type="button"
                                    variant="secondary"
                                    className={`${colSpanClass} h-12 rounded-xl text-[11px] font-black bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-none uppercase tracking-widest`}
                                    onClick={() => handlePress('AC')}
                                >
                                    {t('clearAll')}
                                </Button>
                            );
                        }
                        if (key === 'DEL') {
                            return (
                                <Button
                                    key={key}
                                    type="button"
                                    variant="secondary"
                                    className={`${colSpanClass} h-12 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border-none text-orange-600`}
                                    onClick={() => handlePress('DEL')}
                                >
                                    <Delete className="w-5 h-5 opacity-80" />
                                </Button>
                            );
                        }
                        if (key === 'DONE') {
                            return (
                                <Button
                                    key={key}
                                    type="button"
                                    className={`${colSpanClass} h-12 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.15em] shadow-lg shadow-primary/20 active:scale-[0.98] transition-all`}
                                    onClick={handleDone}
                                >
                                    <Check className="w-4 h-4 mr-2" />
                                    {t('confirm')}
                                </Button>
                            );
                        }

                        const isOperator = ['/', '*', '-', '+'].includes(key);
                        const isNumber = /[0-9]/.test(key);

                        return (
                            <Button
                                type="button"
                                key={key}
                                variant={isOperator ? "default" : "outline"}
                                className={cn(
                                    `${colSpanClass} h-12 rounded-xl text-lg font-bold transition-all active:scale-95 shadow-sm`,
                                    isOperator ? "bg-primary/20 text-primary border-none hover:bg-primary/30" :
                                        "bg-card border-border border hover:bg-muted"
                                )}
                                onClick={() => handlePress(key)}
                            >
                                {isNumber ? formatNumber(key) : key}
                            </Button>
                        );
                    })}
                </div>
            </div>
        </div>,
        document.body
    );
}
