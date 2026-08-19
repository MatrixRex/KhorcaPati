import { PageContainer } from '@/components/shared/PageContainer';
import { useUIStore, type Theme } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useState } from 'react';
import { Moon, Sun, Monitor, Check, Trash2, Bell, Target, Wallet, Languages, Download, Upload, TrendingUp, Archive, Sparkles, Key, ExternalLink, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { exportData, importData } from '@/lib/data-management';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Settings() {
    const { t } = useTranslation();
    const { theme, setTheme, fontScale, setFontScale } = useUIStore();
    const { language, setLanguage, resetDate, setResetDate, geminiApiKey, geminiModel, setGeminiApiKey, setGeminiModel } = useSettingsStore();
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [isImportSuccessOpen, setIsImportSuccessOpen] = useState(false);
    const [isImportErrorOpen, setIsImportErrorOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);

    const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey || '');
    const [showApiKey, setShowApiKey] = useState(false);
    const [keySaved, setKeySaved] = useState(false);
    const [isTestingKey, setIsTestingKey] = useState(false);
    const [testKeyStatus, setTestKeyStatus] = useState<{ ok: boolean; msg: string } | null>(null);

    const handleSaveGeminiKey = () => {
        setGeminiApiKey(apiKeyInput.trim());
        setKeySaved(true);
        setTestKeyStatus(null);
        setTimeout(() => setKeySaved(false), 2000);
    };

    const handleTestGeminiKey = async () => {
        const keyToTest = apiKeyInput.trim() || geminiApiKey;
        if (!keyToTest) {
            setTestKeyStatus({ ok: false, msg: t('apiKeyRequired', { defaultValue: 'Please enter an API key' }) });
            return;
        }
        setIsTestingKey(true);
        setTestKeyStatus(null);
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel || 'gemini-flash-lite-latest'}:generateContent?key=${keyToTest}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: 'Respond with OK' }] }]
                })
            });
            if (res.ok) {
                setTestKeyStatus({ ok: true, msg: t('apiKeyValid', { defaultValue: 'API Key is valid & connected!' }) });
                setGeminiApiKey(keyToTest);
            } else {
                const errJson = await res.json().catch(() => ({}));
                setTestKeyStatus({ ok: false, msg: errJson?.error?.message || `Error ${res.status}: ${res.statusText}` });
            }
        } catch (e: any) {
            setTestKeyStatus({ ok: false, msg: e?.message || 'Connection failed' });
        } finally {
            setIsTestingKey(false);
        }
    };

    const handleReset = async () => {
        const { db } = await import('@/db/schema');
        await db.delete();
        // Explicitly clear persisted settings so balance resets and welcome screen shows again
        useSettingsStore.setState({ initialBalance: 0, hasSeenWelcome: false });
        localStorage.clear();
        // Navigate to dashboard before reload so settings page isn't re-opened
        window.location.hash = '/';
        window.location.reload();
    };

    const handleExport = async () => {
        try {
            await exportData();
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImportFile(e.target.files[0]);
            setIsImportDialogOpen(true);
        }
    };

    const handleImport = async () => {
        if (!importFile) return;

        try {
            const text = await importFile.text();
            await importData(text);
            setIsImportSuccessOpen(true);
        } catch (error) {
            console.error('Import failed:', error);
            setIsImportErrorOpen(true);
        } finally {
            setIsImportDialogOpen(false);
            setImportFile(null);
        }
    };

    const languages = [
        { id: 'en', label: t('english') },
        { id: 'bn', label: t('bangla') },
    ];

    const themes: { id: Theme; label: string; icon: any }[] = [
        { id: 'light', label: t('light'), icon: Sun },
        { id: 'dark', label: t('dark'), icon: Moon },
        { id: 'system', label: t('system'), icon: Monitor },
    ];

    return (
        <PageContainer title={t('settings')}>
            <div className="space-y-6 pt-2 pb-10">
                <section>
                    <h2 className="label-header mb-3 px-1">{t('language')}</h2>
                    <div className="grid grid-cols-2 gap-2">
                        {languages.map((l) => {
                            const isActive = language === l.id;
                            return (
                                <Button
                                    key={l.id}
                                    variant={isActive ? 'default' : 'outline'}
                                    className={cn(
                                        "flex flex-col items-center justify-center h-16 gap-1 border-2 relative overflow-hidden transition-all duration-300",
                                        isActive
                                            ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/20"
                                            : "border-muted hover:border-primary/50"
                                    )}
                                    onClick={() => setLanguage(l.id)}
                                >
                                    <Languages className={cn("w-4 h-4 transition-transform duration-300", isActive ? "text-primary scale-110" : "text-muted-foreground")} />
                                    <span className="text-xs font-medium">{l.label}</span>
                                    {isActive && (
                                        <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5 shadow-sm">
                                            <Check className="w-2.5 h-2.5 text-primary-foreground" />
                                        </div>
                                    )}
                                </Button>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <h2 className="label-header mb-3 px-1">{t('appearance')}</h2>
                    <div className="grid grid-cols-3 gap-2">
                        {themes.map((t) => {
                            const Icon = t.icon;
                            const isActive = theme === t.id;
                            return (
                                <Button
                                    key={t.id}
                                    variant={isActive ? 'default' : 'outline'}
                                    className={cn(
                                        "flex flex-col items-center justify-center h-20 gap-2 border-2 relative overflow-hidden transition-all duration-300",
                                        isActive
                                            ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/20"
                                            : "border-muted hover:border-primary/50"
                                    )}
                                    onClick={() => setTheme(t.id)}
                                >
                                    <Icon className={cn("w-5 h-5 transition-transform duration-300", isActive ? "text-primary scale-110" : "text-muted-foreground")} />
                                    <span className="text-xs font-medium">{t.label}</span>
                                    {isActive && (
                                        <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5 shadow-sm">
                                            <Check className="w-2.5 h-2.5 text-primary-foreground" />
                                        </div>
                                    )}
                                </Button>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <h2 className="label-header mb-3 px-1">{t('billingCycle')}</h2>
                    <div className="report-card-container p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold uppercase tracking-wider opacity-60">{t('resetDate')}</span>
                            <span className="text-lg font-black text-primary">{resetDate}</span>
                        </div>
                        
                        <div className="px-2">
                            <input
                                type="range"
                                min="1"
                                max="31"
                                step="1"
                                value={resetDate}
                                onChange={(e) => setResetDate(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary transition-all active:scale-[1.01]"
                            />
                            <div className="flex justify-between mt-2 px-1">
                                <span className="text-[10px] font-bold text-muted-foreground/40">1</span>
                                <span className="text-[10px] font-bold text-muted-foreground/40">15</span>
                                <span className="text-[10px] font-bold text-muted-foreground/40">31</span>
                            </div>
                        </div>

                        <p className="text-[10px] text-muted-foreground mt-4 text-center font-medium italic opacity-60">
                            {t('resetDateDescription')}
                        </p>
                    </div>
                </section>

                <section>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h2 className="text-sm font-medium text-muted-foreground">{t('textSize')}</h2>
                        <button
                            onClick={() => setFontScale(1.1)}
                            className="text-[10px] font-bold uppercase tracking-widest text-primary/60 hover:text-primary transition-colors"
                        >
                            {t('reset')}
                        </button>
                    </div>
                    <div className="report-card-container p-6">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-xs font-bold uppercase tracking-wider opacity-60">{t('scaleMultiplier')}</span>
                            <span className="text-lg font-black text-primary">{(fontScale * 100).toFixed(0)}%</span>
                        </div>

                        <div className="px-2">
                            <input
                                type="range"
                                min="90"
                                max="120"
                                step="5"
                                value={Math.round(fontScale * 100)}
                                onChange={(e) => setFontScale(parseInt(e.target.value) / 100)}
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary transition-all active:scale-[1.01]"
                            />
                            <div className="flex justify-between mt-4 px-1">
                                <span className="text-[10px] font-bold text-muted-foreground/40">90%</span>
                                <span className="text-[10px] font-bold text-muted-foreground/40">105%</span>
                                <span className="text-[10px] font-bold text-muted-foreground/40">120%</span>
                            </div>
                        </div>

                        <p className="text-[10px] text-muted-foreground mt-6 text-center font-medium italic opacity-60">
                            {t('dragSlider')}
                        </p>
                    </div>
                </section>

                <section>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h2 className="label-header flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                            {t('aiAssistant', { defaultValue: 'Gemini AI Assistant' })}
                        </h2>
                        <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                        >
                            <span>{t('getFreeKey', { defaultValue: 'Get Free Key' })}</span>
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>

                    <div className="p-5 rounded-3xl bg-card/60 glass border border-primary/20 space-y-4 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                                    <Key className="w-3.5 h-3.5 text-primary" />
                                    {t('geminiApiKey', { defaultValue: 'Google Gemini API Key' })}
                                </span>
                                {geminiApiKey && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                                        {t('keyConfigured', { defaultValue: 'Configured' })}
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                                {t('geminiSettingsDesc', { defaultValue: 'Powers AI batch note parsing and smart transaction categorization. Free API key from Google AI Studio.' })}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        type={showApiKey ? 'text' : 'password'}
                                        placeholder="AIzaSy..."
                                        value={apiKeyInput}
                                        onChange={(e) => setApiKeyInput(e.target.value)}
                                        className="h-10 text-xs rounded-xl bg-background/80 pr-10 font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <Button
                                    type="button"
                                    onClick={handleSaveGeminiKey}
                                    className="h-10 px-4 rounded-xl font-bold text-xs shrink-0 active:scale-95 transition-all duration-200"
                                >
                                    {keySaved ? <Check className="w-4 h-4 text-emerald-400 mr-1" /> : null}
                                    {keySaved ? t('saved', { defaultValue: 'Saved' }) : t('save', { defaultValue: 'Save' })}
                                </Button>
                            </div>

                            {/* Model Selector & Test Key Button */}
                            <div className="flex items-center justify-between gap-2 pt-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Model:</span>
                                    {[
                                        { id: 'gemini-flash-lite-latest', label: 'gemini-flash-lite-latest' },
                                        { id: 'gemini-flash-latest', label: 'gemini-flash-latest' },
                                    ].map((m) => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => setGeminiModel(m.id)}
                                            className={cn(
                                                "text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-all duration-200 active:scale-95",
                                                (geminiModel || 'gemini-flash-lite-latest') === m.id
                                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                    : "bg-background/60 hover:bg-muted text-muted-foreground border-border/40"
                                            )}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleTestGeminiKey}
                                    disabled={isTestingKey}
                                    className="h-7 px-2.5 text-[11px] font-bold rounded-lg border-primary/30 text-primary hover:bg-primary/10 active:scale-95 transition-all duration-200"
                                >
                                    {isTestingKey ? (
                                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                    ) : (
                                        <Sparkles className="w-3 h-3 mr-1" />
                                    )}
                                    {t('testConnection', { defaultValue: 'Test Key' })}
                                </Button>
                            </div>

                            {testKeyStatus && (
                                <p className={cn(
                                    "text-[11px] font-semibold pt-1",
                                    testKeyStatus.ok ? "text-emerald-500" : "text-destructive"
                                )}>
                                    {testKeyStatus.msg}
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="label-header mb-3 px-1">{t('management')}</h2>
                    <div className="grid grid-cols-1 gap-2">
                        <button
                            onClick={() => useUIStore.getState().openCategoryManagement()}
                            className="setting-item-glass group"
                        >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="p-3 rounded-xl bg-primary/20 text-primary shadow-sm group-hover:scale-110 group-hover:shadow-primary/20 transition-all duration-300 shrink-0 border border-primary/10">
                                    <Check className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col items-start min-w-0">
                                    <span className="text-sm font-bold">{t('categories')}</span>
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight leading-tight">{t('manageNames')}</span>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                <Monitor className="w-4 h-4 rotate-[-90deg]" />
                            </div>
                        </button>

                        <button
                            onClick={() => useUIStore.getState().openRecurringPaymentsList()}
                            className="setting-item-glass group"
                        >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="p-3 rounded-xl bg-orange-500/20 text-orange-600 shadow-sm group-hover:scale-110 group-hover:shadow-orange-500/20 transition-all duration-300 shrink-0 border border-orange-500/10">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col items-start min-w-0">
                                    <span className="text-sm font-bold">{t('recurringPayments')}</span>
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight leading-tight">{t('editSchedules')}</span>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                <Monitor className="w-4 h-4 rotate-[-90deg]" />
                            </div>
                        </button>

                        <button
                            onClick={() => useUIStore.getState().openBudgetsList()}
                            className="setting-item-glass group"
                        >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="p-3 rounded-xl bg-blue-500/20 text-blue-600 shadow-sm group-hover:scale-110 group-hover:shadow-blue-500/20 transition-all duration-300 shrink-0 border border-blue-500/10">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col items-start min-w-0">
                                    <span className="text-sm font-bold">{t('budgets')}</span>
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight leading-tight">{t('setLimits')}</span>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                <Monitor className="w-4 h-4 rotate-[-90deg]" />
                            </div>
                        </button>

                        <button
                            onClick={() => useUIStore.getState().openGoalsList()}
                            className="setting-item-glass group"
                        >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="p-3 rounded-xl bg-primary/20 text-primary shadow-sm group-hover:scale-110 group-hover:shadow-primary/20 transition-all duration-300 shrink-0 border border-primary/10">
                                    <Target className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col items-start min-w-0">
                                    <span className="text-sm font-bold">{t('savingsGoals')}</span>
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight leading-tight">{t('manageTargets')}</span>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                <Monitor className="w-4 h-4 rotate-[-90deg]" />
                            </div>
                        </button>

                        <button
                            onClick={() => useUIStore.getState().openLoansList()}
                            className="setting-item-glass group"
                        >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="p-3 rounded-xl bg-destructive/20 text-destructive shadow-sm group-hover:scale-110 group-hover:shadow-destructive/20 transition-all duration-300 shrink-0 border border-destructive/10">
                                    <TrendingUp className="w-5 h-5 rotate-[-45deg]" />
                                </div>
                                <div className="flex flex-col items-start min-w-0">
                                    <span className="text-sm font-bold">{t('loans')}</span>
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight leading-tight">{t('manageLoans')}</span>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                <Monitor className="w-4 h-4 rotate-[-90deg]" />
                            </div>
                        </button>
                    </div>
                </section>

                <section>
                    <h2 className="label-header mb-3 px-1">{t('archivedItems')}</h2>
                    <div className="grid grid-cols-1 gap-2">
                        <button
                            onClick={() => useUIStore.getState().openArchivedGoalsList()}
                            className="setting-item-glass group"
                        >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="p-3 rounded-xl bg-primary/20 text-primary shadow-sm group-hover:scale-110 group-hover:shadow-primary/20 transition-all duration-300 shrink-0 border border-primary/10">
                                    <Archive className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col items-start min-w-0">
                                    <span className="text-sm font-bold">{t('archivedGoals')}</span>
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight leading-tight">{t('manageTargets')}</span>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                <Monitor className="w-4 h-4 rotate-[-90deg]" />
                            </div>
                        </button>

                        <button
                            onClick={() => useUIStore.getState().openArchivedLoansList()}
                            className="setting-item-glass group"
                        >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="p-3 rounded-xl bg-destructive/20 text-destructive shadow-sm group-hover:scale-110 group-hover:shadow-destructive/20 transition-all duration-300 shrink-0 border border-destructive/10">
                                    <Archive className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col items-start min-w-0">
                                    <span className="text-sm font-bold">{t('archivedLoans')}</span>
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight leading-tight">{t('manageLoans')}</span>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                <Monitor className="w-4 h-4 rotate-[-90deg]" />
                            </div>
                        </button>
                    </div>
                </section>

                <section>
                    <h2 className="label-header mb-3 px-1">{t('dataManagement')}</h2>
                    <div className="grid grid-cols-1 gap-2">
                        <button
                            onClick={handleExport}
                            className="setting-item-glass group"
                        >
                            <div className="flex items-center gap-4 w-full">
                                <div className="p-3 rounded-xl bg-green-500/20 text-green-600 shadow-sm group-hover:scale-110 group-hover:shadow-green-500/20 transition-all duration-300 shrink-0 border border-green-500/10">
                                    <Download className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col items-start flex-1 min-w-0">
                                    <span className="text-sm font-bold">{t('exportData')}</span>
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight leading-tight">{t('exportDescription')}</span>
                                </div>
                            </div>
                        </button>

                        <div className="relative">
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <button
                                className="setting-item-glass group w-full"
                            >
                                <div className="flex items-center gap-4 w-full">
                                    <div className="p-3 rounded-xl bg-purple-500/20 text-purple-600 shadow-sm group-hover:scale-110 group-hover:shadow-purple-500/20 transition-all duration-300 shrink-0 border border-purple-500/10">
                                        <Upload className="w-5 h-5" />
                                    </div>
                                    <div className="flex flex-col items-start flex-1 min-w-0">
                                        <span className="text-sm font-bold">{t('importData')}</span>
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight leading-tight">{t('importDescription')}</span>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                </section>

                <AlertDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                    <AlertDialogContent className="w-[90%] rounded-[32px] p-8 border-none bg-background shadow-2xl">
                        <AlertDialogHeader className="space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-2">
                                <Upload size={32} />
                            </div>
                            <AlertDialogTitle className="text-xl font-black text-center">{t('importData')}</AlertDialogTitle>
                            <AlertDialogDescription className="text-center text-xs font-medium text-muted-foreground leading-relaxed">
                                {t('overwriteWarning')}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col gap-3 mt-8">
                            <AlertDialogAction
                                onClick={handleImport}
                                className="h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all w-full"
                            >
                                {t('import')}
                            </AlertDialogAction>
                            <AlertDialogCancel className="h-12 rounded-2xl border-none bg-secondary/50 font-bold text-sm active:scale-95 transition-all w-full mt-0">
                                {t('cancel')}
                            </AlertDialogCancel>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={isImportSuccessOpen} onOpenChange={setIsImportSuccessOpen}>
                    <AlertDialogContent className="w-[90%] rounded-[32px] p-8 border-none bg-background shadow-2xl">
                        <AlertDialogHeader className="space-y-4">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-2 animate-in zoom-in duration-500">
                                <Check size={32} strokeWidth={3} />
                            </div>
                            <AlertDialogTitle className="text-xl font-black text-center">{t('importSuccessTitle') || 'Import Successful'}</AlertDialogTitle>
                            <AlertDialogDescription className="text-center text-xs font-medium text-muted-foreground leading-relaxed">
                                {t('importSuccessMessage') || 'Your data has been restored. The app needs to reload to apply changes.'}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-8">
                            <AlertDialogAction
                                onClick={() => window.location.reload()}
                                className="h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all w-full"
                            >
                                {t('reloadNow') || 'Reload Now'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={isImportErrorOpen} onOpenChange={setIsImportErrorOpen}>
                    <AlertDialogContent className="w-[90%] rounded-[32px] p-8 border-none bg-background shadow-2xl">
                        <AlertDialogHeader className="space-y-4">
                            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mx-auto mb-2">
                                <Trash2 size={32} />
                            </div>
                            <AlertDialogTitle className="text-xl font-black text-center text-destructive">{t('importErrorTitle') || 'Import Failed'}</AlertDialogTitle>
                            <AlertDialogDescription className="text-center text-xs font-medium text-muted-foreground leading-relaxed">
                                {t('importErrorMessage') || 'There was an error importing your data. Please make sure the file is valid.'}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-8">
                            <AlertDialogAction
                                onClick={() => setIsImportErrorOpen(false)}
                                className="h-12 rounded-2xl bg-destructive text-destructive-foreground font-bold text-sm shadow-lg shadow-destructive/20 active:scale-95 transition-all w-full"
                            >
                                {t('close') || 'Close'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <section className="pt-6 border-t">
                    <h2 className="text-sm font-black text-destructive mb-3 px-1 uppercase tracking-widest">{t('dangerZone')}</h2>
                    <div className="bg-destructive/10 p-6 rounded-3xl border border-destructive/30 space-y-4">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-sm font-bold text-destructive">{t('resetApp')}</h3>
                            <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                                {t('deleteCheck')}
                            </p>
                        </div>

                        <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="destructive"
                                    className="w-full btn-destructive-premium"
                                >
                                    {t('deleteAllData')}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="w-[90%] rounded-[32px] p-8 border-none bg-background shadow-2xl">
                                <AlertDialogHeader className="space-y-4">
                                    <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mx-auto mb-2">
                                        <Trash2 size={32} />
                                    </div>
                                    <AlertDialogTitle className="text-xl font-black text-center">{t('deleteEverything')}</AlertDialogTitle>
                                    <AlertDialogDescription className="text-center text-xs font-medium text-muted-foreground leading-relaxed">
                                        {t('wipeDatabase')}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-col gap-3 mt-8">
                                        <AlertDialogAction
                                            onClick={handleReset}
                                            className="h-12 w-full btn-destructive-premium"
                                        >
                                            {t('yesDelete')}
                                        </AlertDialogAction>
                                    <AlertDialogCancel className="w-full mt-0 btn-secondary-premium">
                                        {t('waitGoBack')}
                                    </AlertDialogCancel>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </section>

                <div className="flex flex-col items-center justify-center gap-1 opacity-20 py-8">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">KhorcaPati</span>
                    <span className="text-[10px] font-medium font-mono">{__APP_VERSION__}</span>
                </div>

                <div className="h-20" />
            </div>
        </PageContainer >
    );
}
