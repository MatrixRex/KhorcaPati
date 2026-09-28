import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import {
    type AIProviderConfig,
    type AIProviderType,
    type ModelOption,
    fetchProviderModels,
    DEFAULT_PROVIDER_MODELS
} from '@/lib/aiProviders';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Sparkles,
    Plus,
    Trash2,
    ArrowUp,
    ArrowDown,
    Eye,
    EyeOff,
    Loader2,
    ExternalLink,
    RefreshCw,
    Server
} from 'lucide-react';

const PROVIDER_INFO: Record<AIProviderType, { name: string; keyUrl: string; placeholder: string; defaultModel: string }> = {
    groq: {
        name: 'Groq',
        keyUrl: 'https://console.groq.com/keys',
        placeholder: 'gsk_...',
        defaultModel: 'openai/gpt-oss-20b'
    },
    gemini: {
        name: 'Google Gemini',
        keyUrl: 'https://aistudio.google.com/app/apikey',
        placeholder: 'AIzaSy...',
        defaultModel: 'gemini-2.0-flash'
    },
    openrouter: {
        name: 'OpenRouter',
        keyUrl: 'https://openrouter.ai/keys',
        placeholder: 'sk-or-v1-...',
        defaultModel: 'meta-llama/llama-3.3-70b-instruct:free'
    },
    custom: {
        name: 'Custom (OpenAI Compatible)',
        keyUrl: '',
        placeholder: 'sk-...',
        defaultModel: 'llama3'
    }
};

export function AIProviderManager() {
    const {
        aiProviders,
        setAIProviders,
        addAIProvider,
        updateAIProvider,
        removeAIProvider,
        moveAIProvider,
        geminiApiKey,
        geminiModel
    } = useSettingsStore();

    // Ensure state initialization from legacy if empty
    useEffect(() => {
        if ((!aiProviders || aiProviders.length === 0) && geminiApiKey) {
            setAIProviders([
                {
                    id: 'prov_legacy_gemini',
                    name: 'Google Gemini',
                    type: 'gemini',
                    apiKey: geminiApiKey,
                    model: geminiModel || 'gemini-flash-lite-latest',
                    enabled: true
                }
            ]);
        }
    }, [aiProviders, geminiApiKey, geminiModel, setAIProviders]);

    const [modelsMap, setModelsMap] = useState<Record<string, ModelOption[]>>({});
    const [fetchingModelsMap, setFetchingModelsMap] = useState<Record<string, boolean>>({});
    const [testingMap, setTestingMap] = useState<Record<string, { testing: boolean; result?: { ok: boolean; msg: string } }>>({});
    const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({});

    // Fetch models for a provider
    const loadModelsForProvider = async (provider: AIProviderConfig, force = false) => {
        if (!force && modelsMap[provider.id]?.length > 0) return;
        if (!provider.apiKey && provider.type !== 'custom') return;

        setFetchingModelsMap(prev => ({ ...prev, [provider.id]: true }));
        try {
            const models = await fetchProviderModels(provider.type, provider.apiKey, provider.baseUrl);
            setModelsMap(prev => ({ ...prev, [provider.id]: models }));
        } finally {
            setFetchingModelsMap(prev => ({ ...prev, [provider.id]: false }));
        }
    };

    const handleTestProvider = async (provider: AIProviderConfig) => {
        setTestingMap(prev => ({ ...prev, [provider.id]: { testing: true } }));
        try {
            let res: Response;
            if (provider.type === 'gemini') {
                res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${provider.model || 'gemini-flash-lite-latest'}:generateContent?key=${provider.apiKey.trim()}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Respond with OK' }] }] })
                });
            } else {
                let endpoint = '';
                if (provider.type === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
                else if (provider.type === 'openrouter') endpoint = 'https://openrouter.ai/api/v1/chat/completions';
                else endpoint = (provider.baseUrl?.replace(/\/$/, '') || 'http://localhost:11434/v1') + '/chat/completions';

                res = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(provider.apiKey ? { Authorization: `Bearer ${provider.apiKey.trim()}` } : {})
                    },
                    body: JSON.stringify({
                        model: provider.model,
                        messages: [{ role: 'user', content: 'Say OK' }],
                        max_tokens: 5
                    })
                });
            }

            if (res.ok) {
                setTestingMap(prev => ({
                    ...prev,
                    [provider.id]: { testing: false, result: { ok: true, msg: 'Connected successfully!' } }
                }));
            } else {
                const errJson = await res.json().catch(() => ({}));
                setTestingMap(prev => ({
                    ...prev,
                    [provider.id]: {
                        testing: false,
                        result: { ok: false, msg: errJson?.error?.message || `Error ${res.status}: ${res.statusText}` }
                    }
                }));
            }
        } catch (e: any) {
            setTestingMap(prev => ({
                ...prev,
                [provider.id]: { testing: false, result: { ok: false, msg: e?.message || 'Connection failed' } }
            }));
        }
    };

    const handleAdd = (type: AIProviderType) => {
        const info = PROVIDER_INFO[type];
        addAIProvider({
            name: info.name,
            type,
            apiKey: '',
            model: info.defaultModel,
            enabled: true,
            baseUrl: type === 'custom' ? 'http://localhost:11434/v1' : undefined
        });
    };

    return (
        <div className="space-y-4">
            {/* Header description */}
            <div className="flex items-center justify-between px-1">
                <div>
                    <h3 className="text-sm font-black tracking-tight text-foreground flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        AI Parsing Providers & Fallback Chain
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-medium">
                        Automatic sequential fallback: if Priority #1 hits rate limits or fails, Priority #2 is seamlessly used.
                    </p>
                </div>
            </div>

            {/* Provider List */}
            <div className="space-y-3">
                {aiProviders && aiProviders.length > 0 ? (
                    aiProviders.map((provider, index) => {
                        const info = PROVIDER_INFO[provider.type] || PROVIDER_INFO.gemini;
                        const availableModels = modelsMap[provider.id] || (DEFAULT_PROVIDER_MODELS[provider.type] || []).map(m => ({ id: m, label: m, isFree: true }));
                        const isFetchingModels = fetchingModelsMap[provider.id];
                        const testStatus = testingMap[provider.id];
                        const showKey = showKeyMap[provider.id];

                        return (
                            <div
                                key={provider.id}
                                className={cn(
                                    "p-4 rounded-2xl glass border transition-all duration-200 space-y-3",
                                    provider.enabled
                                        ? "bg-card/70 border-primary/20 shadow-sm"
                                        : "bg-muted/30 border-border/40 opacity-70"
                                )}
                            >
                                {/* Top Bar: Priority Badge, Name, Status, Controls */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                                            #{index + 1} {index === 0 ? 'Primary' : `Fallback ${index}`}
                                        </span>
                                        <span className="text-xs font-bold text-foreground">
                                            {provider.name}
                                        </span>
                                        {info.keyUrl && (
                                            <a
                                                href={info.keyUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                                            >
                                                <span>Get Key</span>
                                                <ExternalLink className="w-2.5 h-2.5" />
                                            </a>
                                        )}
                                    </div>

                                    {/* Action Buttons: Priority order & Delete */}
                                    <div className="flex items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            disabled={index === 0}
                                            onClick={() => moveAIProvider(index, index - 1)}
                                            className="h-7 w-7 text-muted-foreground hover:text-foreground active:scale-95"
                                            title="Move Up in Priority"
                                        >
                                            <ArrowUp className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            disabled={index === aiProviders.length - 1}
                                            onClick={() => moveAIProvider(index, index + 1)}
                                            className="h-7 w-7 text-muted-foreground hover:text-foreground active:scale-95"
                                            title="Move Down in Priority"
                                        >
                                            <ArrowDown className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeAIProvider(provider.id)}
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive active:scale-95"
                                            title="Remove Provider"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                {/* API Key Input */}
                                <div className="space-y-1.5">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                type={showKey ? 'text' : 'password'}
                                                placeholder={info.placeholder}
                                                value={provider.apiKey}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    updateAIProvider(provider.id, { apiKey: val });
                                                }}
                                                onPaste={(e) => {
                                                    const pasted = e.clipboardData.getData('text');
                                                    if (pasted) {
                                                        setTimeout(() => {
                                                            loadModelsForProvider({ ...provider, apiKey: pasted }, true);
                                                        }, 50);
                                                    }
                                                }}
                                                className="h-9 text-xs rounded-xl bg-background/80 pr-10 font-mono"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowKeyMap(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleTestProvider(provider)}
                                            disabled={testStatus?.testing}
                                            className="h-9 px-3 text-xs font-bold rounded-xl border-primary/30 text-primary hover:bg-primary/10 active:scale-95 shrink-0"
                                        >
                                            {testStatus?.testing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                                            Test
                                        </Button>
                                    </div>

                                    {testStatus?.result && (
                                        <p className={cn(
                                            "text-[10px] font-semibold",
                                            testStatus.result.ok ? "text-emerald-500" : "text-destructive"
                                        )}>
                                            {testStatus.result.msg}
                                        </p>
                                    )}
                                </div>

                                {/* Custom Base URL if custom */}
                                {provider.type === 'custom' && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Base URL</label>
                                        <Input
                                            type="text"
                                            placeholder="http://localhost:11434/v1"
                                            value={provider.baseUrl || ''}
                                            onChange={(e) => updateAIProvider(provider.id, { baseUrl: e.target.value })}
                                            className="h-8 text-xs font-mono rounded-lg bg-background/80"
                                        />
                                    </div>
                                )}

                                {/* Model Selector + Auto-detect button */}
                                <div className="space-y-1.5 pt-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                                            Model:
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => loadModelsForProvider(provider, true)}
                                            disabled={isFetchingModels || (!provider.apiKey && provider.type !== 'custom')}
                                            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                                        >
                                            <RefreshCw className={cn("w-2.5 h-2.5", isFetchingModels && "animate-spin")} />
                                            {isFetchingModels ? 'Fetching Models...' : 'Fetch Available Models'}
                                        </button>
                                    </div>

                                    {/* Models Pill Selector */}
                                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                                        {availableModels.map((m) => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => updateAIProvider(provider.id, { model: m.id })}
                                                className={cn(
                                                    "text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border transition-all duration-200 active:scale-95 text-left",
                                                    provider.model === m.id
                                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                        : "bg-background/60 hover:bg-muted text-muted-foreground border-border/40"
                                                )}
                                                title={m.description || m.id}
                                            >
                                                <span>{m.label}</span>
                                                {m.description && (
                                                    <span className="block text-[8px] font-normal opacity-80">{m.description}</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Custom Model Text Override */}
                                    <div className="pt-1 flex items-center gap-2">
                                        <Input
                                            type="text"
                                            placeholder="Or enter custom model ID..."
                                            value={provider.model}
                                            onChange={(e) => updateAIProvider(provider.id, { model: e.target.value })}
                                            className="h-7 text-[11px] font-mono rounded-lg bg-background/50"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="p-6 text-center rounded-2xl border border-dashed border-border/60 bg-muted/20">
                        <Server className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
                        <p className="text-xs font-semibold text-muted-foreground">
                            No AI providers configured yet.
                        </p>
                        <p className="text-[11px] text-muted-foreground/75 mt-0.5">
                            Add Groq, Gemini, or OpenRouter below to enable lightning-fast expense extraction!
                        </p>
                    </div>
                )}
            </div>

            {/* Quick Add Provider Buttons */}
            <div className="pt-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-2 px-1">
                    Add Provider to Chain:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleAdd('groq')}
                        className="h-10 text-xs font-bold rounded-xl border-primary/20 hover:border-primary/50 hover:bg-primary/5 active:scale-95 flex items-center gap-1.5"
                    >
                        <Plus className="w-3.5 h-3.5 text-primary" />
                        + Groq (Free)
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleAdd('gemini')}
                        className="h-10 text-xs font-bold rounded-xl border-primary/20 hover:border-primary/50 hover:bg-primary/5 active:scale-95 flex items-center gap-1.5"
                    >
                        <Plus className="w-3.5 h-3.5 text-primary" />
                        + Google Gemini
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleAdd('openrouter')}
                        className="h-10 text-xs font-bold rounded-xl border-primary/20 hover:border-primary/50 hover:bg-primary/5 active:scale-95 flex items-center gap-1.5"
                    >
                        <Plus className="w-3.5 h-3.5 text-primary" />
                        + OpenRouter
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleAdd('custom')}
                        className="h-10 text-xs font-bold rounded-xl border-primary/20 hover:border-primary/50 hover:bg-primary/5 active:scale-95 flex items-center gap-1.5"
                    >
                        <Plus className="w-3.5 h-3.5 text-primary" />
                        + Custom / Local
                    </Button>
                </div>
            </div>
        </div>
    );
}
