import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Sparkles, 
    Trash2, 
    Plus, 
    Key, 
    ArrowUpRight, 
    ArrowDownLeft, 
    Check, 
    ExternalLink, 
    Package, 
    CheckSquare, 
    Square, 
    RotateCcw,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn, formatAmount } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { DevBadge } from '@/components/shared/DevBadge';
import { CategoryComboBox } from '@/components/expenses/CategoryComboBox';
import { useUIStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { db, recalculateDailySummary, type Expense } from '@/db/schema';
import { parseTransactionsWithGemini, type ParsedGeminiTransaction } from '@/lib/geminiParser';

const SAMPLE_NOTES = [
    {
        label: 'Daily Outing & Food',
        text: `Yesterday:
Uber to office 250
Lunch at Sultan's Dine 850
Coffee with team 140
Evening snacks 120
Rickshaw back home 60`
    },
    {
        label: 'Groceries & Bazar',
        text: `Weekly Bazar 2400 on 2026-08-18:
Bought 2kg rice, 1L soybean oil, 1 dozen eggs, 1kg chicken.
Also paid 80 tk for vegetable market.`
    },
    {
        label: 'Freelance & Bills',
        text: `Received client payment 25000 (freelance income)
Paid electricity bill 1850 DESCO
Broadband internet 1000
Mobile flexiload recharge 300`
    }
];

export function SmartBatchParserDrawer() {
    const { t } = useTranslation();
    const { isSmartBatchParserOpen, closeSmartBatchParser, initialSmartBatchText } = useUIStore();
    const { geminiApiKey, geminiModel, setGeminiApiKey } = useSettingsStore();
    const { categories } = useCategoryStore();
    const { loadExpenses } = useExpenseStore();

    const [noteText, setNoteText] = useState('');
    const [parsedList, setParsedList] = useState<ParsedGeminiTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [tempKey, setTempKey] = useState('');
    const [showKeySetup, setShowKeySetup] = useState(false);

    useEffect(() => {
        if (isSmartBatchParserOpen) {
            setNoteText(initialSmartBatchText || '');
            setParsedList([]);
            setErrorMessage(null);
            setTempKey(geminiApiKey || '');
            setShowKeySetup(!geminiApiKey);
        }
    }, [isSmartBatchParserOpen, initialSmartBatchText, geminiApiKey]);

    const handleSaveKey = () => {
        if (!tempKey.trim()) return;
        setGeminiApiKey(tempKey.trim());
        setShowKeySetup(false);
        setErrorMessage(null);
    };

    const handleParse = async () => {
        if (!noteText.trim()) {
            setErrorMessage(t('pleaseEnterNotes', { defaultValue: 'Please enter or paste your transaction notes.' }));
            return;
        }

        const effectiveKey = geminiApiKey || tempKey.trim();
        if (!effectiveKey) {
            setShowKeySetup(true);
            setErrorMessage(t('apiKeyRequired', { defaultValue: 'Google Gemini API key is required.' }));
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);

        try {
            const dbCategories = await db.categories.toArray();
            const effectiveCategories = dbCategories.length > 0 ? dbCategories : categories;

            const results = await parseTransactionsWithGemini({
                noteText,
                categories: effectiveCategories,
                referenceDate: format(new Date(), 'yyyy-MM-dd'),
                apiKey: effectiveKey,
                model: geminiModel || 'gemini-flash-lite-latest'
            });

            if (results.length === 0) {
                setErrorMessage(t('noTransactionsFound', { defaultValue: 'No transactions could be detected in this text. Try another note format.' }));
            } else {
                setParsedList(results);
            }
        } catch (err: any) {
            console.error('Gemini parse error:', err);
            setErrorMessage(err?.message || 'Failed to parse transactions with Gemini.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleSelectAll = () => {
        const allSelected = parsedList.every(tx => tx.selected);
        setParsedList(prev => prev.map(tx => ({ ...tx, selected: !allSelected })));
    };

    const handleToggleItemSelect = (id: string) => {
        setParsedList(prev => prev.map(tx => tx.id === id ? { ...tx, selected: !tx.selected } : tx));
    };

    const handleUpdateItem = (id: string, updates: Partial<ParsedGeminiTransaction>) => {
        setParsedList(prev => prev.map(tx => tx.id === id ? { ...tx, ...updates } : tx));
    };

    const handleDeleteItem = (id: string) => {
        setParsedList(prev => prev.filter(tx => tx.id !== id));
    };

    const handleAddManualItem = () => {
        const defaultCategory = categories.find(c => !c.isSystem && !c.isDefault)?.name || 'Unlisted';
        const newItem: ParsedGeminiTransaction = {
            id: `manual-tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            title: 'New Transaction',
            amount: 100,
            type: 'expense',
            category: defaultCategory,
            date: format(new Date(), 'yyyy-MM-dd'),
            note: '',
            itemAutoTrack: false,
            items: [],
            selected: true
        };
        setParsedList(prev => [...prev, newItem]);
    };

    const selectedTransactions = useMemo(() => {
        return parsedList.filter(tx => tx.selected);
    }, [parsedList]);

    const totalExpense = useMemo(() => {
        return selectedTransactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    }, [selectedTransactions]);

    const totalIncome = useMemo(() => {
        return selectedTransactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    }, [selectedTransactions]);

    const handleImportAll = async () => {
        if (selectedTransactions.length === 0) return;
        setIsSaving(true);

        try {
            const nowIso = new Date().toISOString();
            const datesToRecalculate = new Set<string>();
            const { addCategory } = useCategoryStore.getState();

            // Auto-create any new categories detected by Gemini
            const currentDbCats = await db.categories.toArray();
            const existingCatNames = new Set(currentDbCats.map(c => c.name.toLowerCase().trim()));

            for (const tx of selectedTransactions) {
                const catName = (tx.category || '').trim();
                if (catName && catName !== 'Unlisted' && !existingCatNames.has(catName.toLowerCase())) {
                    await addCategory(catName);
                    existingCatNames.add(catName.toLowerCase());
                }
            }

            await db.transaction('rw', [db.expenses, db.items, db.dailySummaries], async () => {
                for (const tx of selectedTransactions) {
                    const txDate = tx.date || format(new Date(), 'yyyy-MM-dd');
                    datesToRecalculate.add(txDate);

                    const expensePayload: Omit<Expense, 'id'> = {
                        parentId: null,
                        isNested: false,
                        goalId: null,
                        loanId: null,
                        title: tx.title.trim() || undefined,
                        amount: Number(tx.amount) || 0,
                        type: tx.type,
                        category: tx.category || 'Unlisted',
                        date: txDate,
                        note: tx.note || '',
                        isRecurring: false,
                        recurringInterval: null,
                        recurringNextDue: null,
                        itemAutoTrack: Boolean(tx.itemAutoTrack),
                        tags: [],
                        createdAt: nowIso,
                        updatedAt: nowIso,
                    };

                    const newExpenseId = await db.expenses.add(expensePayload);

                    // If items were extracted and itemAutoTrack is enabled, save items
                    if (tx.itemAutoTrack && tx.items && tx.items.length > 0) {
                        for (const it of tx.items) {
                            await db.items.add({
                                expenseId: newExpenseId as number,
                                name: it.name.trim().toLowerCase(),
                                rawInput: `${it.name} ${it.qty}${it.unit}`,
                                qty: Number(it.qty) || 1,
                                unit: it.unit || 'pcs',
                                date: txDate,
                                note: tx.title,
                                createdAt: nowIso,
                            });
                        }
                    }
                }
            });

            // Recalculate daily summaries
            for (const d of datesToRecalculate) {
                await recalculateDailySummary(d);
            }

            await loadExpenses();

            // Clear local state and close the drawer immediately
            setParsedList([]);
            setNoteText('');
            setErrorMessage(null);
            closeSmartBatchParser();
        } catch (err) {
            console.error('Failed to import batch transactions:', err);
            setErrorMessage('Failed to save transactions. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Sheet open={isSmartBatchParserOpen} onOpenChange={(open) => !open && closeSmartBatchParser()}>
            <SheetContent
                side="bottom"
                className="h-[92dvh] max-h-[92dvh] rounded-t-2xl p-0 glass backdrop-blur-xl z-[85] flex flex-col overflow-hidden border-t border-primary/20 shadow-2xl"
                style={{ background: 'linear-gradient(to bottom, color-mix(in oklch, var(--primary), transparent 96%), transparent)' }}
            >
                <div className="h-1.5 w-12 bg-muted/40 rounded-full mx-auto mt-3 mb-2 shrink-0" />
                
                {/* Header */}
                <SheetHeader className="px-6 pb-3 pt-1 border-b border-border/40 text-left shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-black flex items-center gap-1.5 tracking-tight">
                                    {t('aiSmartNoteParser', { defaultValue: 'AI Smart Note Parser' })}
                                    <DevBadge id="d:smart-batch-parser" />
                                </SheetTitle>
                                <p className="text-[11px] text-muted-foreground font-medium">
                                    {t('aiParserSubtitle', { defaultValue: 'Paste unstructured notes & auto-create categorized records with Gemini' })}
                                </p>
                            </div>
                        </div>
                    </div>
                </SheetHeader>

                {/* Main Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 pb-44 space-y-4 text-foreground overscroll-contain" data-scroll-container>
                    
                    {/* API Key Setup Banner */}
                    {(showKeySetup || !geminiApiKey) && (
                        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                                    <Key className="w-4 h-4" />
                                    <span>{t('geminiApiKeySetup', { defaultValue: 'Google Gemini API Key' })}</span>
                                </div>
                                <a 
                                    href="https://aistudio.google.com/app/apikey" 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-[11px] text-primary/80 hover:text-primary underline flex items-center gap-1 font-medium"
                                >
                                    <span>{t('getFreeKey', { defaultValue: 'Get Free Key' })}</span>
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {t('apiKeyDescription', { defaultValue: 'Enter your free Google Gemini API key to enable AI transaction extraction. Stored securely on your device.' })}
                            </p>
                            <div className="flex gap-2">
                                <Input
                                    type="password"
                                    placeholder="AIzaSy..."
                                    value={tempKey}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTempKey(e.target.value)}
                                    onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                                        setTimeout(() => {
                                            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }, 150);
                                    }}
                                    className="h-10 text-xs rounded-xl bg-background/80"
                                />
                                <Button
                                    type="button"
                                    onClick={handleSaveKey}
                                    disabled={!tempKey.trim()}
                                    className="h-10 px-4 rounded-xl font-bold text-xs shrink-0 active:scale-95 transition-all duration-200"
                                >
                                    <Check className="w-4 h-4 mr-1" />
                                    {t('saveKey', { defaultValue: 'Save' })}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Note Input Area */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-primary" />
                                {t('pasteNoteLabel', { defaultValue: 'Your Transaction Note' })}
                            </label>
                            {noteText && (
                                <button
                                    type="button"
                                    onClick={() => setNoteText('')}
                                    className="text-[11px] text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 transition-colors"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    {t('clear', { defaultValue: 'Clear' })}
                                </button>
                            )}
                        </div>

                        <Textarea
                            rows={4}
                            value={noteText}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNoteText(e.target.value)}
                            onFocus={(e: React.FocusEvent<HTMLTextAreaElement>) => {
                                setTimeout(() => {
                                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }, 150);
                            }}
                            placeholder={t('noteInputPlaceholder', { defaultValue: 'Type or paste anything here...\n\nExample:\nUber to meeting 250\nLunch at Nandos 1200\nGot 15k client payment\nElectric bill 1850 paid yesterday' })}
                            className="text-xs font-medium rounded-2xl resize-none min-h-[110px] bg-background/50 border-white/20 focus-visible:ring-primary leading-relaxed shadow-inner"
                        />

                        {/* Sample Note Chips */}
                        <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                                {t('trySamples', { defaultValue: 'Try sample format:' })}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {SAMPLE_NOTES.map((sample, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setNoteText(sample.text)}
                                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 active:scale-95 transition-all duration-200"
                                    >
                                        {sample.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Parse Action Button */}
                    <Button
                        type="button"
                        onClick={handleParse}
                        disabled={isLoading || !noteText.trim()}
                        className="w-full h-12 rounded-xl text-xs font-black uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 active:scale-[0.98] transition-all duration-200"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {t('geminiParsing', { defaultValue: 'Parsing with Gemini AI...' })}
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                {t('parseWithGemini', { defaultValue: '✨ Extract Transactions with AI' })}
                            </span>
                        )}
                    </Button>

                    {/* Error Alert */}
                    {errorMessage && (
                        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span className="flex-1 leading-snug">{errorMessage}</span>
                        </div>
                    )}

                    {/* Parsed Transactions Section */}
                    {parsedList.length > 0 && (
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between border-b pb-2 border-border/40">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleToggleSelectAll}
                                        className="text-xs font-bold text-primary flex items-center gap-1.5 hover:underline"
                                    >
                                        {parsedList.every(tx => tx.selected) ? (
                                            <CheckSquare className="w-4 h-4" />
                                        ) : (
                                            <Square className="w-4 h-4" />
                                        )}
                                        <span>
                                            {t('parsedCount', { count: parsedList.length, defaultValue: `Detected ${parsedList.length} Transactions` })}
                                        </span>
                                    </button>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleAddManualItem}
                                    className="h-7 px-2 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg active:scale-95 transition-all duration-200"
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                    {t('addRecord', { defaultValue: 'Add Record' })}
                                </Button>
                            </div>

                            {/* Transaction Cards */}
                            <div className="space-y-2.5">
                                {parsedList.map((tx) => {
                                    const parsedDate = tx.date ? parseISO(tx.date) : new Date();

                                    return (
                                        <div
                                            key={tx.id}
                                            className={cn(
                                                "p-3.5 rounded-2xl border transition-all duration-200 space-y-3 bg-card/60 backdrop-blur-sm shadow-sm",
                                                tx.selected ? "border-primary/40 shadow-primary/5" : "border-border/30 opacity-60"
                                            )}
                                        >
                                            {/* Row 1: Checkbox + Title + Amount + Delete */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleItemSelect(tx.id)}
                                                    className="text-primary hover:opacity-80 shrink-0"
                                                >
                                                    {tx.selected ? (
                                                        <CheckSquare className="w-5 h-5" />
                                                    ) : (
                                                        <Square className="w-5 h-5 text-muted-foreground" />
                                                    )}
                                                </button>

                                                <Input
                                                    type="text"
                                                    value={tx.title}
                                                    onChange={(e) => handleUpdateItem(tx.id, { title: e.target.value })}
                                                    placeholder="Title"
                                                    className="h-9 text-xs font-bold rounded-xl flex-1 bg-background/60"
                                                />

                                                <div className="w-28 shrink-0 relative">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={tx.amount}
                                                        onChange={(e) => handleUpdateItem(tx.id, { amount: parseFloat(e.target.value) || 0 })}
                                                        className="h-9 text-xs font-black text-right pr-2 rounded-xl bg-background/60"
                                                    />
                                                </div>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteItem(tx.id)}
                                                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 active:scale-95 transition-all duration-200"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>

                                            {/* Row 2: Type Toggle + Category + Date */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                                                {/* Type Toggle */}
                                                <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/20">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateItem(tx.id, { type: 'expense' })}
                                                        className={cn(
                                                            "flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-black uppercase transition-all duration-200",
                                                            tx.type === 'expense' ? "bg-rose-500/20 text-rose-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        <ArrowDownLeft className="w-3 h-3" />
                                                        {t('expenseLabel', { defaultValue: 'Expense' })}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateItem(tx.id, { type: 'income' })}
                                                        className={cn(
                                                            "flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-black uppercase transition-all duration-200",
                                                            tx.type === 'income' ? "bg-emerald-500/20 text-emerald-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        <ArrowUpRight className="w-3 h-3" />
                                                        {t('incomeLabel', { defaultValue: 'Income' })}
                                                    </button>
                                                </div>

                                                {/* Category Picker */}
                                                <div className="sm:col-span-1">
                                                    <CategoryComboBox
                                                        value={tx.category}
                                                        onChange={(val) => handleUpdateItem(tx.id, { category: val })}
                                                        className="h-9 text-xs rounded-xl"
                                                    />
                                                </div>

                                                {/* Date Picker */}
                                                <div className="sm:col-span-1">
                                                    <DatePicker
                                                        date={parsedDate}
                                                        setDate={(d) => {
                                                            if (d) {
                                                                handleUpdateItem(tx.id, { date: format(d, 'yyyy-MM-dd') });
                                                            }
                                                        }}
                                                        className="h-9 text-xs rounded-xl"
                                                    />
                                                </div>
                                            </div>

                                            {/* Optional Note / Extracted Items Details */}
                                            {tx.items && tx.items.length > 0 && (
                                                <div className="p-2 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
                                                    <div className="flex items-center justify-between text-[10px] font-bold text-primary">
                                                        <span className="flex items-center gap-1">
                                                            <Package className="w-3 h-3" />
                                                            {t('itemsDetected', { count: tx.items.length, defaultValue: `${tx.items.length} items will be auto-tracked` })}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateItem(tx.id, { itemAutoTrack: !tx.itemAutoTrack })}
                                                            className={cn(
                                                                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase",
                                                                tx.itemAutoTrack ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                                                            )}
                                                        >
                                                            {tx.itemAutoTrack ? 'Track ON' : 'Track OFF'}
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {tx.items.map((it, i) => (
                                                            <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-background/80 border border-border/30 text-foreground">
                                                                {it.name} ({it.qty} {it.unit})
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Fixed Import Bar */}
                {parsedList.length > 0 && (
                    <div className="p-4 border-t border-border/40 glass bg-background/80 backdrop-blur-md shrink-0 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-muted-foreground">
                                {t('selectedCount', { count: selectedTransactions.length, defaultValue: `${selectedTransactions.length} of ${parsedList.length} selected` })}
                            </span>
                            <div className="flex items-center gap-3">
                                {totalExpense > 0 && (
                                    <span className="text-rose-500 font-black">
                                        - {formatAmount(totalExpense)}
                                    </span>
                                )}
                                {totalIncome > 0 && (
                                    <span className="text-emerald-500 font-black">
                                        + {formatAmount(totalIncome)}
                                    </span>
                                )}
                            </div>
                        </div>

                        <Button
                            type="button"
                            onClick={handleImportAll}
                            disabled={isSaving || selectedTransactions.length === 0}
                            className="w-full h-12 rounded-xl text-xs font-black uppercase tracking-wider bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-[0.98] transition-all duration-200"
                        >
                            {isSaving ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t('savingRecords', { defaultValue: 'Importing Records...' })}
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Check className="w-4 h-4 stroke-[3]" />
                                    {t('importSelectedCount', { count: selectedTransactions.length, defaultValue: `Import ${selectedTransactions.length} Records to KhorcaPati` })}
                                </span>
                            )}
                        </Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
