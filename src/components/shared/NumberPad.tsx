import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Delete, Check, Equal, X } from 'lucide-react';

interface NumberPadProps {
    value: string;
    onChange: (value: string) => void;
    onDone: () => void;
    onClose: () => void;
}

export function NumberPad({ value, onChange, onDone, onClose }: NumberPadProps) {
    const [display, setDisplay] = useState(value || '0');

    useEffect(() => {
        setDisplay(value || '0');
    }, [value]);

    const evaluateExpression = () => {
        try {
            const sanitized = display.replace(/[^-+*/.0-9]/g, '');
            if (!sanitized) return '0';
            const result = new Function(`return ${sanitized}`)();
            const finalResult = String(Number((result || 0).toFixed(2)));
            setDisplay(finalResult);
            onChange(finalResult);
            return finalResult;
        } catch (e) {
            return display;
        }
    };

    const handlePress = (key: string) => {
        if (key === 'AC') {
            setDisplay('0');
            onChange('0');
        } else if (key === 'DEL') {
            const newDisplay = display.length > 1 ? display.slice(0, -1) : '0';
            setDisplay(newDisplay);
            onChange(newDisplay);
        } else if (key === '=') {
            evaluateExpression();
        } else {
            let newDisplay = display;
            if (display === '0' && !['+', '-', '*', '/', '.'].includes(key)) {
                newDisplay = key;
            } else {
                newDisplay = display + key;
            }
            setDisplay(newDisplay);
            onChange(newDisplay);
        }
    };

    const handleDone = () => {
        evaluateExpression();
        onDone();
    };

    const keys = [
        ['7', '8', '9', '/'],
        ['4', '5', '6', '*'],
        ['1', '2', '3', '-'],
        ['0', '.', '=', '+']
    ];

    return (
        <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm -z-10" onClick={onClose} />
            <div className="bg-card border-t rounded-t-[32px] p-6 pb-10 shadow-2xl max-w-md mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="overflow-x-auto whitespace-nowrap scrollbar-none flex-1 mr-4">
                        <span className="text-3xl font-black tracking-tight text-primary">
                            {display}
                        </span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-10 w-10">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="grid grid-cols-4 gap-3">
                    {/* AC and Delete Row */}
                    <Button
                        variant="secondary"
                        className="col-span-2 h-14 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
                        onClick={() => handlePress('AC')}
                    >
                        Clear
                    </Button>
                    <Button
                        variant="secondary"
                        className="col-span-2 h-14 rounded-2xl bg-muted/50 hover:bg-muted"
                        onClick={() => handlePress('DEL')}
                    >
                        <Delete className="w-5 h-5" />
                    </Button>

                    {/* Main Keys */}
                    {keys.flat().map((key) => {
                        const isOperator = ['/', '*', '-', '+', '='].includes(key);
                        return (
                            <Button
                                key={key}
                                variant={isOperator ? "default" : "outline"}
                                className={cn(
                                    "h-14 rounded-2xl text-lg font-bold transition-all active:scale-95 shadow-sm",
                                    key === '=' ? "bg-primary text-primary-foreground" :
                                        isOperator ? "bg-primary/10 text-primary border-none hover:bg-primary/20" :
                                            "bg-card border-border/50"
                                )}
                                onClick={() => handlePress(key)}
                            >
                                {key === '=' ? <Equal className="w-5 h-5" /> : key}
                            </Button>
                        );
                    })}

                    {/* Done Button */}
                    <Button
                        className="col-span-4 h-16 rounded-2xl mt-2 bg-primary text-primary-foreground font-black text-sm uppercase tracking-[0.2em] shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                        onClick={handleDone}
                    >
                        <Check className="w-5 h-5 mr-3" />
                        Confirm
                    </Button>
                </div>
            </div>
        </div>
    );
}
