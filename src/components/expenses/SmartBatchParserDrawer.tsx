import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
    Sparkles, 
    Trash2, 
    Plus, 
    KeyRound,
    ArrowUpRight, 
    ArrowDownLeft, 
    Check, 
    Package, 
    CheckSquare, 
    Square, 
    RotateCcw,
    AlertCircle,
    Loader2,
    Settings,
    WifiOff,
    Clock,
    CheckCircle2,
    RefreshCw,
    X
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
import { useSmartNoteQueueStore, type QueuedSmartNote } from '@/stores/smartNoteQueueStore';
import { db } from '@/db/schema';
import { parseTransactionsWithGemini, isNetworkConnectionError, type ParsedGeminiTransaction } from '@/lib/geminiParser';
import { importParsedTransactions, processNextQueuedNote } from '@/services/smartNoteQueueProcessor';

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
    const navigate = useNavigate();
    const { isSmartBatchParserOpen, closeSmartBatchParser, initialSmartBatchText } = useUIStore();
    const { geminiApiKey, geminiModel } = useSettingsStore();
    const { categories } = useCategoryStore();

    const { queue, enqueueNote, removeNote, clearCompleted } = useSmartNoteQueueStore();

    const [noteText, setNoteText] = useState('');
    const [parsedList, setParsedList] = useState<ParsedGeminiTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [offlineNotice, setOfflineNotice] = useState<string | null>(null);

    const hasKey = Boolean(geminiApiKey && geminiApiKey.trim());

    useEffect(() => {
        if (isSmartBatchParserOpen) {
            setNoteText(initialSmartBatchText || '');
            setParsedList([]);
            setErrorMessage(null);
            setOfflineNotice(null);
        }
    }, [isSmartBatchParserOpen, initialSmartBatchText]);

    const handleParse = async () => {
        if (!noteText.trim()) {
            setErrorMessage(t('pleaseEnterNotes', { defaultValue: 'Please enter or paste your transaction notes.' }));
            return;
        }

        if (!hasKey) {
            setErrorMessage(t('geminiKeyRequiredDesc', { defaultValue: 'To use the AI Smart Note Parser, please configure your Google Gemini API key in Settings first.' }));
            return;
        }

        // Check if device is offline upfront
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            enqueueNote(noteText, format(new Date(), 'yyyy-MM-dd'));
            setOfflineNotice(t('noteSavedOffline', { defaultValue: 'You are currently offline. Your note has been saved offline and will automatically process in the background when connection is restored.' }));
            setNoteText('');
            setErrorMessage(null);
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);
        setOfflineNotice(null);

        try {
            const dbCategories = await db.categories.toArray();
            const effectiveCategories = dbCategories.length > 0 ? dbCategories : categories;

            const { categoryPreferences } = useSettingsStore.getState();

            const recentExpenses = await db.expenses
                .orderBy('id')
                .reverse()
                .limit(100)
                .toArray();

            const historyExamples = recentExpenses
                .filter(e => e.note && e.category && e.category !== 'Unlisted')
                .map(e => ({ item: e.note, category: e.category }));

            const results = await parseTransactionsWithGemini({
                noteText,
                categories: effectiveCategories,
                categoryPreferences,
                historyExamples,
                referenceDate: format(new Date(), 'yyyy-MM-dd'),
                apiKey: geminiApiKey,
                model: geminiModel || 'gemini-flash-lite-latest'
            });

            if (results.length === 0) {
                setErrorMessage(t('noTransactionsFound', { defaultValue: 'No transactions could be detected in this text. Try another note format.' }));
            } else {
                setParsedList(results);
            }
        } catch (err: unknown) {
            console.error('Gemini parse error:', err);
            if (isNetworkConnectionError(err)) {
                enqueueNote(noteText, format(new Date(), 'yyyy-MM-dd'));
                setOfflineNotice(t('noteSavedOffline', { defaultValue: 'Connection lost. Your note has been saved offline and will automatically process in the background when connection is restored.' }));
                setNoteText('');
                setErrorMessage(null);
            } else {
                const msg = err instanceof Error ? err.message : 'Failed to parse transactions with Gemini.';
                setErrorMessage(msg);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickImportQueuedNote = async (item: QueuedSmartNote) => {
        if (!item.parsedTransactions || item.parsedTransactions.length === 0) return;
        setIsSaving(true);
        try {
            await importParsedTransactions(item.parsedTransactions);
            removeNote(item.id);
            setOfflineNotice(null);
        } catch (err) {
            console.error('Failed to quick import queued note:', err);
            setErrorMessage('Failed to import offline note transactions.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLoadQueuedNoteToReview = (item: QueuedSmartNote) => {
        if (!item.parsedTransactions || item.parsedTransactions.length === 0) return;
        setParsedList(item.parsedTransactions);
        removeNote(item.id);
        setOfflineNotice(null);
    };

    const handleToggleSelectAll = () => {
        const allSelected = parsedList.every(tx => tx.selected);
        setParsedList(prev => prev.map(tx => ({ ...tx, selected: !allSelected })));
    };

    const handleToggleItemSelect = (id: string) => {
        setParsedList(prev => prev.map(tx => tx.id === id ? { ...tx, selected: !tx.selected } : tx));
    };

    const handleUpdateItem = (id: string, updates: Partial<ParsedGeminiTransaction>) => {
        const { learnCategoryPreference } = useSettingsStore.getState();
        setParsedList(prev => prev.map(tx => {
            if (tx.id === id) {
                const updated = { ...tx, ...updates };
                if (updates.category && updates.category !== tx.category) {
                    learnCategoryPreference(updated.title || updated.note, updates.category);
                }
                return updated;
            }
            return tx;
        }));
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
            await importParsedTransactions(selectedTransactions);
            setParsedList([]);
            setNoteText('');
            setErrorMessage(null);
            setOfflineNotice(null);
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

                {!hasKey ? (
                    /* Key Required Screen - direct to Settings */
                    <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 text-foreground overscroll-contain flex flex-col items-center justify-center text-center" data-scroll-container>
                        <div className="max-w-md w-full mx-auto space-y-6">
                            <div className="p-6 rounded-3xl bg-primary/10 border border-primary/20 space-y-4 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/15 mx-auto">
                                    <KeyRound className="w-7 h-7" />
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="text-base font-black tracking-tight">
                                        {t('geminiKeyRequiredTitle', { defaultValue: 'Google Gemini API Key Required' })}
                                    </h3>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {t('geminiKeyRequiredDesc', { defaultValue: 'To use the AI Smart Note Parser, please configure your Google Gemini API key in Settings first.' })}
                                    </p>
                                </div>

                                <Button
                                    type="button"
                                    onClick={() => {
                                        closeSmartBatchParser();
                                        navigate('/settings');
                                    }}
                                    className="w-full h-11 rounded-xl text-xs font-black uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 active:scale-[0.98] transition-all duration-200"
                                >
                                    <Settings className="w-4 h-4 mr-2" />
                                    {t('goToSettings', { defaultValue: 'Open Settings' })}
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Main Parser View */
                    <div className="flex-1 overflow-y-auto px-6 py-4 pb-44 space-y-4 text-foreground overscroll-contain" data-scroll-container>

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
                        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium flex items-start justify-between gap-2.5">
                            <div className="flex items-start gap-2.5 flex-1">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span className="leading-snug">{errorMessage}</span>
                            </div>
                            {(errorMessage.toLowerCase().includes('api key') || errorMessage.toLowerCase().includes('apikey')) && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        closeSmartBatchParser();
                                        navigate('/settings');
                                    }}
                                    className="h-7 px-2 text-[11px] font-bold border-destructive/30 hover:bg-destructive/10 shrink-0 active:scale-95 transition-all duration-200"
                                >
                                    <Settings className="w-3 h-3 mr-1" />
                                    {t('goToSettings', { defaultValue: 'Settings' })}
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Offline Notice Banner */}
                    {offlineNotice && (
                        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-medium flex items-start justify-between gap-2.5 shadow-sm">
                            <div className="flex items-start gap-2.5 flex-1">
                                <WifiOff className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                                <span className="leading-snug">{offlineNotice}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setOfflineNotice(null)}
                                className="p-1 rounded-lg text-amber-500 hover:bg-amber-500/20 active:scale-95 transition-all duration-200"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Offline Notes Queue Card / List */}
                    {queue.length > 0 && (
                        <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-black uppercase tracking-wider text-foreground">
                                        {t('offlineQueueTitle', { defaultValue: 'Offline Notes Queue' })}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary">
                                        {queue.length}
                                    </span>
                                </div>
                                {queue.some(n => n.status === 'ready') && (
                                    <button
                                        type="button"
                                        onClick={clearCompleted}
                                        className="text-[11px] font-semibold text-muted-foreground hover:text-foreground active:scale-95 transition-all duration-200"
                                    >
                                        {t('clearCompleted', { defaultValue: 'Clear Finished' })}
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2">
                                {queue.map((item) => (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            "p-3 rounded-xl border text-xs space-y-2 transition-all duration-200",
                                            item.status === 'ready'
                                                ? "bg-emerald-500/10 border-emerald-500/30"
                                                : item.status === 'processing'
                                                ? "bg-primary/10 border-primary/30"
                                                : item.status === 'failed'
                                                ? "bg-destructive/10 border-destructive/30"
                                                : "bg-background/60 border-border/40"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-foreground truncate">
                                                    "{item.noteText.slice(0, 45)}{item.noteText.length > 45 ? '...' : ''}"
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                                                    {item.status === 'ready' && (
                                                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            {t('offlineReadyToReview', { defaultValue: 'Ready to review' })} ({item.parsedTransactions?.length || 0} items)
                                                        </span>
                                                    )}
                                                    {item.status === 'processing' && (
                                                        <span className="flex items-center gap-1 text-primary font-bold">
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            {t('retryingInBackground', { defaultValue: 'Processing with Gemini...' })}
                                                        </span>
                                                    )}
                                                    {item.status === 'pending' && (
                                                        <span className="flex items-center gap-1">
                                                            <WifiOff className="w-3 h-3 text-amber-500" />
                                                            {t('waitingForConnection', { defaultValue: 'Waiting for connection...' })}
                                                            {item.retryCount > 0 && ` (${item.retryCount}x)`}
                                                        </span>
                                                    )}
                                                    {item.status === 'failed' && (
                                                        <span className="text-destructive font-medium truncate">
                                                            {item.errorMessage || t('parseFailed', { defaultValue: 'Parse failed' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => removeNote(item.id)}
                                                className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all duration-200 shrink-0"
                                                title={t('delete', { defaultValue: 'Delete' })}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {/* Action buttons per queued note */}
                                        {item.status === 'ready' && item.parsedTransactions && (
                                            <div className="flex items-center gap-2 pt-1 border-t border-emerald-500/20">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => handleLoadQueuedNoteToReview(item)}
                                                    className="h-7 px-2.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg active:scale-95 transition-all duration-200"
                                                >
                                                    <Sparkles className="w-3 h-3 mr-1" />
                                                    {t('reviewAndEdit', { defaultValue: 'Review & Edit' })}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={isSaving}
                                                    onClick={() => handleQuickImportQueuedNote(item)}
                                                    className="h-7 px-2.5 text-[11px] font-bold border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 rounded-lg active:scale-95 transition-all duration-200"
                                                >
                                                    <Check className="w-3 h-3 mr-1" />
                                                    {t('quickImport', { defaultValue: 'Quick Import' })}
                                                </Button>
                                            </div>
                                        )}

                                        {(item.status === 'pending' || item.status === 'failed') && (
                                            <div className="flex items-center justify-end pt-1">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => processNextQueuedNote()}
                                                    className="h-6 px-2 text-[11px] font-bold text-primary hover:bg-primary/10 active:scale-95 transition-all duration-200"
                                                >
                                                    <RefreshCw className="w-3 h-3 mr-1" />
                                                    {t('retryNow', { defaultValue: 'Retry Now' })}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
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
                                                    onChange={(e) => handleUpdateItem(tx.id, { title: e.target.value, note: e.target.value })}
                                                    placeholder={t('note', { defaultValue: 'Note' })}
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
            )}

            {/* Bottom Fixed Import Bar */}
            {hasKey && parsedList.length > 0 && (
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
