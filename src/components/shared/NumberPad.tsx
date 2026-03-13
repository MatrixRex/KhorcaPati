import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Delete, Check, Equal, X } from 'lucide-react';
import { useCloseWatcher } from '@/hooks/use-close-watcher';

interface NumberPadProps {
    value: string;
    label?: string;
    onChange: (value: string) => void;
    onDone: () => void;
    onClose: () => void;
}

export function NumberPad({ value, label, onChange, onDone, onClose }: NumberPadProps) {
    useCloseWatcher(true, onClose);
    const [display, setDisplay] = useState(value || '0');
    const [liveResult, setLiveResult] = useState<string>(value || '0');

    useEffect(() => {
        // Only sync if the external value is meaningfully different from our current result
        // This prevents the formula from being overwritten by its own live evaluation
        const currentNum = parseFloat(liveResult) || 0;
        const incomingNum = parseFloat(value) || 0;
        
        if (incomingNum !== currentNum || (value === '0' && display !== '0')) {
            setDisplay(value || '0');
            setLiveResult(value || '0');
        }
    }, [value]);

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
        <div className="fixed inset-x-0 bottom-0 z-[100] animate-in slide-in-from-bottom duration-300">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm -z-10" onClick={onClose} />
            <div className="bg-card border-t rounded-t-[40px] p-6 pb-12 shadow-2xl max-w-md mx-auto ring-1 ring-border/50">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 px-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                        {label || 'Input Amount'}
                    </span>
                    <Button type="button" variant="ghost" size="icon-xs" onClick={onClose} className="rounded-full opacity-40 hover:opacity-100">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Display Rows */}
                <div className="bg-muted/30 rounded-3xl p-5 mb-6 flex flex-col items-end gap-1 border border-border/20 shadow-inner">
                    <div className="w-full overflow-x-auto whitespace-nowrap scrollbar-none text-right">
                        <span className="text-sm font-bold text-muted-foreground font-mono opacity-60">
                            {display}
                        </span>
                    </div>
                    <div className="w-full overflow-x-auto whitespace-nowrap scrollbar-none text-right">
                        <span className="text-4xl font-black tracking-tight text-primary flex items-center justify-end">
                            <span className="text-xl mr-1 font-bold opacity-40">৳</span>
                            {liveResult}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                    {/* AC and Delete Row */}
                    <Button
                        type="button"
                        variant="secondary"
                        className="col-span-2 h-14 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-none"
                        onClick={() => handlePress('AC')}
                    >
                        Clear All
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        className="col-span-2 h-14 rounded-2xl bg-muted/50 hover:bg-muted border-none"
                        onClick={() => handlePress('DEL')}
                    >
                        <Delete className="w-5 h-5 opacity-60" />
                    </Button>

                    {/* Main Keys */}
                    {keys.flat().map((key) => {
                        const isOperator = ['/', '*', '-', '+', '='].includes(key);
                        return (
                            <Button
                                type="button"
                                key={key}
                                variant={isOperator ? "default" : "outline"}
                                className={cn(
                                    "h-14 rounded-2xl text-lg font-bold transition-all active:scale-95 shadow-sm",
                                    key === '=' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" :
                                        isOperator ? "bg-primary/10 text-primary border-none hover:bg-primary/20" :
                                            "bg-card border-border/50 hover:bg-muted/50"
                                )}
                                onClick={() => handlePress(key)}
                            >
                                {key === '=' ? <Equal className="w-5 h-5" /> : key}
                            </Button>
                        );
                    })}

                    {/* Done Button */}
                    <Button
                        type="button"
                        className="col-span-4 h-16 rounded-[24px] mt-2 bg-primary text-primary-foreground font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
                        onClick={handleDone}
                    >
                        <Check className="w-5 h-5 mr-3" />
                        Confirm Amount
                    </Button>
                </div>
            </div>
        </div>
    );
}
