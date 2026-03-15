import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn, formatAmount, formatNumber } from '@/lib/utils';
import { Delete, Check, Equal } from 'lucide-react';
import { useCloseWatcher } from '@/hooks/use-close-watcher';
import { useTranslation } from 'react-i18next';

interface NumberPadProps {
    value: string;
    label?: string;
    onChange: (value: string) => void;
    onDone: () => void;
    onClose: () => void;
}

export function NumberPad({ value, label, onChange, onDone, onClose }: NumberPadProps) {
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

        // Find the sheet content since NumberPad is rendered inside it
        const container = rootNode.closest('.overflow-y-auto') as HTMLElement;
        if (!container) return;

        const originalPadding = container.style.paddingBottom;

        // Add aggressive padding to the sheet content
        container.style.paddingBottom = '500px';

        const timer = setTimeout(() => {
            const el = document.getElementById('amount') || rootNode.parentElement;
            if (el) {
                // Scroll the element up so it sits snugly above the keyboard
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Fine tune it: move it down slightly so it's not jammed against the very top edge of the drawer
                container.scrollBy({ top: 30, behavior: 'smooth' });
            }
        }, 150);

        return () => {
            clearTimeout(timer);
            container.style.paddingBottom = originalPadding;
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
        } else if (key === '=') {
            const final = calculateLive(display);
            setDisplay(final);
            setLiveResult(final);
            onChange(final);
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

    const keys = [
        ['7', '8', '9', '/'],
        ['4', '5', '6', '*'],
        ['1', '2', '3', '-'],
        ['0', '.', '=', '+']
    ];

    return (
        <div ref={rootRef} className="fixed inset-x-0 bottom-0 z-[100] animate-in slide-in-from-bottom duration-300 pointer-events-none">
            {/* Click-away area (transparent) */}
            <div className="fixed inset-0 pointer-events-auto" onClick={onClose} />

            <div className="bg-background/95 backdrop-blur-2xl border-t border-white/5 rounded-t-[32px] p-4 pb-8 shadow-[0_-15px_40px_rgba(0,0,0,0.3)] max-w-md mx-auto pointer-events-auto relative ring-1 ring-white/5">
                {/* Compact Indicator */}
                <div className="w-12 h-1 bg-muted/30 rounded-full mx-auto mb-3" />

                {/* Compact Header & Live Preview */}
                <div className="flex items-center justify-between mb-3 px-2">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary mb-0.5">
                            {label || t('inputAmount')}
                        </span>
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="text-[10px] font-bold text-muted-foreground/60 whitespace-nowrap">
                                {display.split('').map(char => /[0-9]/.test(char) ? formatNumber(char) : char).join('')}
                            </span>
                        </div>
                    </div>
                    <div className="text-xl font-black text-primary tabular-nums">
                        <span className="text-sm mr-0.5 opacity-40">৳</span>
                        {formatAmount(liveResult)}
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    {/* AC and Delete Row (Slimmer) */}
                    <Button
                        type="button"
                        variant="secondary"
                        className="col-span-2 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-none"
                        onClick={() => handlePress('AC')}
                    >
                        {t('clearAll')}
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        className="col-span-2 h-11 rounded-xl bg-muted/40 hover:bg-muted/60 border-none"
                        onClick={() => handlePress('DEL')}
                    >
                        <Delete className="w-4 h-4 opacity-60" />
                    </Button>

                    {/* Main Keys (Compacter) */}
                    {keys.flat().map((key) => {
                        const isOperator = ['/', '*', '-', '+', '='].includes(key);
                        const isNumber = /[0-9]/.test(key);
                        return (
                            <Button
                                type="button"
                                key={key}
                                variant={isOperator ? "default" : "outline"}
                                className={cn(
                                    "h-12 rounded-xl text-base font-bold transition-all active:scale-90 shadow-sm",
                                    key === '=' ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" :
                                        isOperator ? "bg-primary/5 text-primary border-none hover:bg-primary/15" :
                                            "bg-card/50 border-white/5 hover:bg-muted/30"
                                )}
                                onClick={() => handlePress(key)}
                            >
                                {key === '=' ? <Equal className="w-5 h-5" /> : (isNumber ? formatNumber(key) : key)}
                            </Button>
                        );
                    })}

                    {/* Done Button (Compact and prominent) */}
                    <Button
                        type="button"
                        className="col-span-4 h-12 rounded-xl mt-1 bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.15em] shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                        onClick={handleDone}
                    >
                        <Check className="w-4 h-4 mr-2" />
                        {t('confirm')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
