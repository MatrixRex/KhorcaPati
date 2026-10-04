import { useEffect, useMemo, useRef, useState } from 'react';
import { PageContainer } from '@/components/shared/PageContainer';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settingsStore';
import type { AIProviderConfig } from '@/lib/aiProviders';
import { buildParseContext, postProcessAIResponse } from '@/lib/geminiParser';
import { EVAL_CASES, EVAL_CATEGORIES } from '@/lib/aiEval/dataset';
import { buildPrompt, type PromptVariant } from '@/lib/aiEval/prompts';
import { runEval, type EvalReport } from '@/lib/aiEval/runner';
import { summarize, type CaseResult } from '@/lib/aiEval/scoring';
import { probeDevice, type DeviceReport } from '@/lib/aiEval/deviceInfo';
import { createCloudEngine, type LoadedEngine } from '@/lib/aiEval/engines';
import { WEBLLM_MODELS, deleteWebLLMModel, isWebLLMModelCached, loadWebLLMEngine } from '@/lib/aiEval/engines/webllm';
import { loadPromptApiEngine } from '@/lib/aiEval/engines/promptApi';
import { loadOfflineRulesEngine } from '@/lib/aiEval/engines/offlineRules';
import type { CategoryOverride } from '@/lib/aiEval/runner';
import { createCategorizer, evaluateCategorizer, examplesFromSeedFile, DEFAULT_INCOME_CATEGORIES, type CategoryEvalReport, type ItemCategorizer, type SeedVectorFile } from '@/lib/categoryEmbed/categorizer';
import { loadBrowserEmbedder, type EmbedDevice } from '@/lib/categoryEmbed/browserEmbedder';
import { HELDOUT_ITEMS } from '@/lib/categoryEmbed/heldout';

const REPORTS_KEY = 'khorcapati-ai-lab-reports';
const MAX_SAVED_REPORTS = 20;
const CASE_FILTERS = ['all', 'en', 'banglish', 'bangla', 'mixed', 'multi', 'items', 'income', 'date', 'arithmetic'];
const BTN = 'active:scale-95 transition-all duration-200';

type SavedReport = EvalReport & { device?: Pick<DeviceReport, 'userAgent' | 'deviceMemoryGB'> & { gpu?: string }; loadMs?: number };

function readSavedReports(): SavedReport[] {
    try {
        return JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]');
    } catch {
        return [];
    }
}

function writeSavedReports(reports: SavedReport[]) {
    try {
        localStorage.setItem(REPORTS_KEY, JSON.stringify(reports.slice(0, MAX_SAVED_REPORTS)));
    } catch {
        // Storage full or blocked; reports stay in memory for this session.
    }
}

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);
const sec = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const num = (v: number | null | undefined, digits = 1) => (v === null || v === undefined ? '—' : v.toFixed(digits));

async function copyText(text: string) {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        window.prompt('Copy this:', text);
    }
}

function downloadJson(name: string, data: unknown) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
    return (
        <section className="rounded-2xl border border-foreground/10 bg-card/60 backdrop-blur p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">{title}</h2>
                {action}
            </div>
            {children}
        </section>
    );
}

function Row({ label, value, warn }: { label: string; value: React.ReactNode; warn?: boolean }) {
    return (
        <div className="flex justify-between gap-3 text-sm py-0.5">
            <span className="text-muted-foreground shrink-0">{label}</span>
            <span className={cn('text-right break-all', warn && 'text-amber-500 font-medium')}>{value}</span>
        </div>
    );
}

function DevicePanel({ device }: { device: DeviceReport | null }) {
    if (!device) return <Section title="Device"><p className="text-sm text-muted-foreground">Probing…</p></Section>;
    const gpu = device.webgpu;
    return (
        <Section
            title="Device"
            action={<Button size="sm" variant="ghost" className={BTN} onClick={() => copyText(JSON.stringify(device, null, 2))}>Copy</Button>}
        >
            <Row label="WebGPU" value={gpu.supported ? 'Yes' : `No (${gpu.error})`} warn={!gpu.supported} />
            {gpu.supported && <>
                <Row label="GPU" value={[gpu.vendor, gpu.architecture, gpu.description].filter(Boolean).join(' · ') || 'unknown'} />
                <Row label="shader-f16" value={gpu.shaderF16 ? 'Yes' : 'No: use f32 models'} warn={!gpu.shaderF16} />
                <Row label="Max buffer" value={`${gpu.maxBufferSizeMB} MB`} />
                {gpu.isFallbackAdapter && <Row label="Adapter" value="Software fallback (slow)" warn />}
            </>}
            <Row label="Chrome built-in AI" value={device.promptApi} warn={device.promptApi !== 'available'} />
            <Row label="RAM (reported)" value={device.deviceMemoryGB ? `${device.deviceMemoryGB} GB` : '—'} />
            <Row label="CPU cores" value={device.cpuCores ?? '—'} />
            <Row label="Storage" value={`${device.storage.usageMB ?? '?'} / ${device.storage.quotaMB ?? '?'} MB${device.storage.persisted ? ' (persisted)' : ''}`} />
            <Row label="Secure context" value={device.secureContext ? 'Yes' : 'No: WebGPU needs HTTPS'} warn={!device.secureContext} />
        </Section>
    );
}

function SummaryView({ report, loadMs }: { report: Pick<EvalReport, 'summary'>; loadMs?: number }) {
    const s = report.summary;
    return (
        <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
                {[
                    ['Perfect', `${s.perfect}/${s.cases}`],
                    ['Amount F1', pct(s.amountF1)],
                    ['Category', pct(s.categoryAccuracy)],
                    ['Type', pct(s.typeAccuracy)],
                    ['Date', pct(s.dateAccuracy)],
                    ['Items', pct(s.itemAccuracy)],
                    ['Mean', sec(s.latency.meanMs)],
                    ['p50', sec(s.latency.p50Ms)],
                    ['p95', sec(s.latency.p95Ms)],
                ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-foreground/5 py-2">
                        <div className="text-base font-semibold tabular-nums">{value}</div>
                        <div className="text-[11px] text-muted-foreground">{label}</div>
                    </div>
                ))}
            </div>
            <Row label="Prefill / decode" value={`${num(s.throughput.prefillTokPerSec, 0)} / ${num(s.throughput.decodeTokPerSec)} tok/s`} />
            {loadMs !== undefined && <Row label="Model load" value={sec(loadMs)} />}
            {s.errors > 0 && <Row label="Errors" value={s.errors} warn />}
            <div className="flex flex-wrap gap-1.5 pt-1">
                {Object.entries(s.byTag).map(([tag, t]) => (
                    <span key={tag} className="text-[11px] rounded-full bg-foreground/5 px-2 py-0.5 tabular-nums">
                        {tag} {t.perfect}/{t.cases}
                    </span>
                ))}
            </div>
        </div>
    );
}

function CaseRow({ result }: { result: CaseResult }) {
    const [open, setOpen] = useState(false);
    const evalCase = EVAL_CASES.find(c => c.id === result.caseId);
    return (
        <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className={cn('w-full text-left rounded-xl border px-3 py-2 text-sm', BTN,
                result.score.perfect ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5')}
        >
            <div className="flex justify-between gap-2">
                <span className="font-medium">{result.score.perfect ? '✓' : '✗'} {result.caseId}</span>
                <span className="text-muted-foreground tabular-nums">{sec(result.durationMs)}</span>
            </div>
            <div className="text-muted-foreground truncate">{evalCase?.note}</div>
            {result.error && <div className="text-rose-500">{result.error}</div>}
            {!result.score.perfect && result.score.mismatches.map(m => <div key={m} className="text-xs text-amber-600 dark:text-amber-400">{m}</div>)}
            {open && (
                <pre className="mt-2 text-[11px] whitespace-pre-wrap break-all bg-foreground/5 rounded-lg p-2">
                    {result.raw ?? '(no output)'}
                    {result.stats && `\n\n${JSON.stringify(result.stats)}`}
                </pre>
            )}
        </button>
    );
}

type LoadedCategorizer = CategoryOverride & { categorizer: ItemCategorizer; device: EmbedDevice; loadMs: number; seedFile: SeedVectorFile; unload(): void };

const tallyPct = (t: { total: number; correct: number }) => (t.total ? `${Math.round((t.correct / t.total) * 100)}%` : '—');

/** On-device embedding model that picks categories; can be tested alone or plugged into the LLM evaluation. */
function CategoryModelSection({ device, value, onChange }: {
    device: DeviceReport | null;
    value: LoadedCategorizer | null;
    onChange: (c: LoadedCategorizer | null) => void;
}) {
    const [embedDevice, setEmbedDevice] = useState<EmbedDevice>('wasm');
    const [progress, setProgress] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [running, setRunning] = useState(false);
    const [report, setReport] = useState<(CategoryEvalReport & { device: EmbedDevice }) | null>(null);
    const [showMistakes, setShowMistakes] = useState(false);

    async function load() {
        setError(null);
        value?.unload();
        onChange(null);
        setProgress(0);
        const start = performance.now();
        try {
            const [{ default: seedFile }, loaded] = await Promise.all([
                import('@/lib/categoryEmbed/seedVectors.json'),
                loadBrowserEmbedder(embedDevice, setProgress),
            ]);
            const categorizer = createCategorizer(loaded.embedder, examplesFromSeedFile(seedFile as SeedVectorFile));
            await categorizer.categorize(['bazar']); // warm-up so the first real item isn't slow
            onChange({
                label: `Embedding (${loaded.device})`,
                categorize: categorizer.categorize,
                categorizer,
                device: loaded.device,
                loadMs: performance.now() - start,
                seedFile: seedFile as SeedVectorFile,
                unload: loaded.unload,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setProgress(null);
        }
    }

    async function runCategoryTest() {
        if (!value) return;
        setRunning(true);
        try {
            // Batch size 1 measures what a user waits for when saving a single note. The app always knows
            // whether an item is income or expense, so the test passes that along too.
            const result = await evaluateCategorizer(value.categorizer, HELDOUT_ITEMS, value.seedFile.entries, {
                batchSize: 1,
                typeOf: item => (DEFAULT_INCOME_CATEGORIES.includes(item.category) ? 'income' : 'expense'),
            });
            setReport({ ...result, device: value.device });
            (window as unknown as { __aiLabCategoryReport?: unknown }).__aiLabCategoryReport = { ...result, device: value.device };
        } finally {
            setRunning(false);
        }
    }

    const selectClass = 'rounded-xl border border-foreground/10 bg-background px-3 py-2 text-sm';

    return (
        <Section title="Category model (embedding)">
            <p className="text-xs text-muted-foreground">
                multilingual-e5-small (~120 MB download on first load) plus the built-in seed words.
            </p>
            <div className="flex gap-2">
                <select className={selectClass} value={embedDevice} onChange={e => setEmbedDevice(e.target.value as EmbedDevice)} disabled={progress !== null || running}>
                    <option value="wasm">CPU (WASM)</option>
                    <option value="webgpu" disabled={!device?.webgpu.supported}>GPU (WebGPU)</option>
                </select>
                <Button className={cn('flex-1', BTN)} onClick={load} disabled={progress !== null || running}>
                    {value ? 'Reload' : 'Load'}
                </Button>
            </div>
            {progress !== null && <Progress value={progress * 100} />}
            {error && <p className="text-sm text-rose-500 break-all">{error}</p>}
            {value && <Row label="Loaded" value={`${value.device} in ${sec(value.loadMs)}`} />}

            <Button variant="outline" className={cn('w-full', BTN)} onClick={runCategoryTest} disabled={!value || running}>
                {running ? 'Testing…' : `Run category test (${HELDOUT_ITEMS.length} items)`}
            </Button>

            {report && (
                <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                            ['Accuracy', tallyPct(report)],
                            ['Novel', tallyPct(report.novel)],
                            ['Variant', tallyPct(report.variant)],
                            ...Object.entries(report.byLang).map(([lang, t]) => [lang, tallyPct(t)]),
                            ['Per item', `${report.msPerItem.toFixed(1)} ms`],
                        ].map(([label, v]) => (
                            <div key={label} className="rounded-xl bg-foreground/5 py-2">
                                <div className="text-base font-semibold tabular-nums">{v}</div>
                                <div className="text-[11px] text-muted-foreground">{label}</div>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" className={cn('flex-1', BTN)} onClick={() => setShowMistakes(s => !s)}>
                            {showMistakes ? 'Hide' : 'Show'} {report.mistakes.length} mistakes
                        </Button>
                        <Button size="sm" variant="outline" className={cn('flex-1', BTN)} onClick={() => copyText(JSON.stringify(report, null, 2))}>Copy JSON</Button>
                    </div>
                    {showMistakes && report.mistakes.map(m => (
                        <div key={m.text} className="text-xs rounded-lg bg-rose-500/5 px-2 py-1">
                            <span className="font-medium">{m.text}</span>: {m.expected} → {m.got ?? '—'}
                            <span className="text-muted-foreground"> (near {m.nearest.join(', ')})</span>
                        </div>
                    ))}
                </div>
            )}
        </Section>
    );
}

export default function AILab() {
    const aiProviders = useSettingsStore(s => s.aiProviders);
    const geminiApiKey = useSettingsStore(s => s.geminiApiKey);
    const geminiModel = useSettingsStore(s => s.geminiModel);

    const cloudProviders = useMemo<AIProviderConfig[]>(() => {
        const configured = aiProviders.filter(p => p.enabled && p.apiKey?.trim());
        if (configured.length > 0 || !geminiApiKey?.trim()) return configured;
        return [{ id: 'legacy-gemini', name: 'Google Gemini', type: 'gemini', apiKey: geminiApiKey, model: geminiModel, enabled: true }];
    }, [aiProviders, geminiApiKey, geminiModel]);

    const [device, setDevice] = useState<DeviceReport | null>(null);
    const [engineChoice, setEngineChoice] = useState(`webllm:${WEBLLM_MODELS[0]?.id}`);
    const [cached, setCached] = useState<Record<string, boolean>>({});
    const [loaded, setLoaded] = useState<(LoadedEngine & { choice: string; loadMs: number }) | null>(null);
    const [loading, setLoading] = useState<{ progress: number; text: string } | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [variant, setVariant] = useState<PromptVariant>('compact');
    const [constrain, setConstrain] = useState(true);
    const [embedCategorizer, setEmbedCategorizer] = useState<LoadedCategorizer | null>(null);
    const [useEmbedCategories, setUseEmbedCategories] = useState(false);
    const activeCategorizer = useEmbedCategories && embedCategorizer ? embedCategorizer : undefined;
    const [caseFilter, setCaseFilter] = useState('all');
    const [running, setRunning] = useState(false);
    const [liveResults, setLiveResults] = useState<CaseResult[]>([]);
    const [report, setReport] = useState<SavedReport | null>(null);
    const [saved, setSaved] = useState<SavedReport[]>(readSavedReports);
    const abortRef = useRef<AbortController | null>(null);

    const [playNote, setPlayNote] = useState('aaj bazar 1200, rickshaw 60\nবেতন পেলাম ৩৫০০০');
    const [playOut, setPlayOut] = useState<string>('');

    useEffect(() => {
        probeDevice().then(setDevice);
        Promise.all(WEBLLM_MODELS.map(async m => [m.id, await isWebLLMModelCached(m.id).catch(() => false)] as const))
            .then(entries => setCached(Object.fromEntries(entries)));
    }, []);

    // Free GPU memory when leaving the page.
    const loadedRef = useRef(loaded);
    loadedRef.current = loaded;
    const embedRef = useRef(embedCategorizer);
    embedRef.current = embedCategorizer;
    useEffect(() => () => {
        loadedRef.current?.unload();
        embedRef.current?.unload();
    }, []);

    const cases = useMemo(
        () => (caseFilter === 'all' ? EVAL_CASES : EVAL_CASES.filter(c => c.tags.includes(caseFilter))),
        [caseFilter],
    );

    const selectedModel = WEBLLM_MODELS.find(m => `webllm:${m.id}` === engineChoice);

    async function loadEngine() {
        setLoadError(null);
        if (loaded) {
            await loaded.unload();
            setLoaded(null);
        }
        setLoading({ progress: 0, text: 'Starting…' });
        const start = performance.now();
        try {
            let engine: LoadedEngine;
            if (engineChoice === 'prompt-api') {
                engine = await loadPromptApiEngine(setLoading);
            } else if (engineChoice === 'offline-rules') {
                engine = await loadOfflineRulesEngine(setLoading);
            } else if (engineChoice.startsWith('cloud:')) {
                const provider = cloudProviders.find(p => `cloud:${p.id}` === engineChoice);
                if (!provider) throw new Error('Provider not found');
                engine = createCloudEngine(provider);
            } else {
                if (!selectedModel) throw new Error('Model not found');
                engine = await loadWebLLMEngine(selectedModel, setLoading);
                setCached(c => ({ ...c, [selectedModel.id]: true }));
            }
            setLoaded({ ...engine, choice: engineChoice, loadMs: performance.now() - start });
        } catch (err) {
            setLoadError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(null);
        }
    }

    async function unloadEngine() {
        await loaded?.unload();
        setLoaded(null);
    }

    async function deleteCachedModel() {
        if (!selectedModel) return;
        if (loaded?.choice === engineChoice) await unloadEngine();
        await deleteWebLLMModel(selectedModel.id);
        setCached(c => ({ ...c, [selectedModel.id]: false }));
    }

    async function startRun() {
        if (!loaded) return;
        const controller = new AbortController();
        abortRef.current = controller;
        setRunning(true);
        setLiveResults([]);
        setReport(null);
        try {
            const result = await runEval({
                engine: loaded.engine,
                cases,
                categories: EVAL_CATEGORIES,
                promptVariant: variant,
                constrainCategories: constrain,
                categorizer: activeCategorizer,
                signal: controller.signal,
                onCaseDone: r => setLiveResults(prev => [...prev, r]),
            });
            const full: SavedReport = {
                ...result,
                loadMs: loaded.loadMs,
                device: device ? {
                    userAgent: device.userAgent,
                    deviceMemoryGB: device.deviceMemoryGB,
                    gpu: [device.webgpu.vendor, device.webgpu.architecture].filter(Boolean).join(' '),
                } : undefined,
            };
            setReport(full);
            (window as unknown as { __aiLabLastReport?: SavedReport }).__aiLabLastReport = full;
            const next = [full, ...saved].slice(0, MAX_SAVED_REPORTS);
            setSaved(next);
            writeSavedReports(next);
        } finally {
            setRunning(false);
            abortRef.current = null;
        }
    }

    async function runPlayground() {
        if (!loaded) return;
        setPlayOut('Running…');
        const ctx = buildParseContext({ categories: EVAL_CATEGORIES.map(name => ({ name })) });
        const prompt = buildPrompt(ctx, playNote, { variant, constrainCategories: constrain });
        const start = performance.now();
        try {
            const reply = await loaded.engine.generate({ ...prompt, note: playNote, referenceDate: ctx.referenceDate });
            const transactions = postProcessAIResponse(reply.text, ctx);
            const embedStart = performance.now();
            const override = activeCategorizer ? await activeCategorizer.categorize(transactions.map(tx => tx.title || tx.note)) : [];
            const embedNote = activeCategorizer ? ` · categories ${(performance.now() - embedStart).toFixed(0)} ms` : '';
            const parsed = transactions.map(({ title, amount, type, category, date, items }, i) =>
                ({ title, amount, type, category: override[i]?.category ?? category, date, items }));
            setPlayOut(`${sec(performance.now() - start)}${embedNote}${reply.stats ? ` · ${JSON.stringify(reply.stats)}` : ''}\n\n${JSON.stringify(parsed, null, 2)}`);
        } catch (err) {
            setPlayOut(`Error: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    const liveSummary = useMemo(() => (liveResults.length ? summarize(liveResults) : null), [liveResults]);
    const selectClass = 'w-full rounded-xl border border-foreground/10 bg-background px-3 py-2 text-sm';

    return (
        <PageContainer title="AI Lab" showBackButton devId="p:ai-lab">
            <div className="space-y-4 pb-28">
                <DevicePanel device={device} />

                <Section title="Engine">
                    <select className={selectClass} value={engineChoice} onChange={e => setEngineChoice(e.target.value)} disabled={!!loading || running}>
                        <optgroup label="On-device (WebLLM · WebGPU)">
                            {WEBLLM_MODELS.map(m => (
                                <option key={m.id} value={`webllm:${m.id}`}>
                                    {m.label} · ~{m.vramMB} MB{cached[m.id] ? ' · cached' : ''}{m.needsF16 && device && !device.webgpu.shaderF16 ? ' · needs f16!' : ''}
                                </option>
                            ))}
                        </optgroup>
                        <optgroup label="On-device (browser)">
                            <option value="offline-rules">Offline mode: rules + embedding (app)</option>
                            <option value="prompt-api">Chrome built-in AI (Gemini Nano)</option>
                        </optgroup>
                        {cloudProviders.length > 0 && (
                            <optgroup label="Cloud baseline">
                                {cloudProviders.map(p => <option key={p.id} value={`cloud:${p.id}`}>{p.name} · {p.model}</option>)}
                            </optgroup>
                        )}
                    </select>

                    <div className="flex gap-2">
                        <Button className={cn('flex-1', BTN)} onClick={loadEngine} disabled={!!loading || running}>
                            {loaded?.choice === engineChoice ? 'Reload' : 'Load'}
                        </Button>
                        {loaded && <Button variant="outline" className={BTN} onClick={unloadEngine} disabled={running}>Unload</Button>}
                        {selectedModel && cached[selectedModel.id] && (
                            <Button variant="ghost" className={BTN} onClick={deleteCachedModel} disabled={!!loading || running}>Delete download</Button>
                        )}
                    </div>

                    {loading && (
                        <div className="space-y-1">
                            <Progress value={loading.progress * 100} />
                            <p className="text-xs text-muted-foreground break-all">{loading.text}</p>
                        </div>
                    )}
                    {loadError && <p className="text-sm text-rose-500 break-all">{loadError}</p>}
                    {loaded && <Row label="Loaded" value={`${loaded.engine.label} in ${sec(loaded.loadMs)}`} />}
                </Section>

                <CategoryModelSection device={device} value={embedCategorizer} onChange={c => {
                    setEmbedCategorizer(c);
                    if (!c) setUseEmbedCategories(false);
                }} />

                <Section title="Evaluation">
                    <div className="grid grid-cols-2 gap-2">
                        <select className={selectClass} value={variant} onChange={e => setVariant(e.target.value as PromptVariant)} disabled={running}>
                            <option value="compact">Compact prompt</option>
                            <option value="full">Production prompt</option>
                        </select>
                        <select className={selectClass} value={caseFilter} onChange={e => setCaseFilter(e.target.value)} disabled={running}>
                            {CASE_FILTERS.map(f => (
                                <option key={f} value={f}>
                                    {f} ({f === 'all' ? EVAL_CASES.length : EVAL_CASES.filter(c => c.tags.includes(f)).length})
                                </option>
                            ))}
                        </select>
                    </div>
                    <label className="flex items-center justify-between text-sm">
                        <span>Force category to the list (JSON schema)</span>
                        <Switch checked={constrain} onCheckedChange={setConstrain} disabled={running} />
                    </label>
                    <label className="flex items-center justify-between text-sm">
                        <span>Categories from embedding model{embedCategorizer ? '' : ' (load it above)'}</span>
                        <Switch checked={useEmbedCategories} onCheckedChange={setUseEmbedCategories} disabled={running || !embedCategorizer} />
                    </label>
                    {running ? (
                        <Button variant="destructive" className={cn('w-full', BTN)} onClick={() => abortRef.current?.abort()}>
                            Stop ({liveResults.length}/{cases.length})
                        </Button>
                    ) : (
                        <Button className={cn('w-full', BTN)} onClick={startRun} disabled={!loaded}>
                            {loaded ? `Run ${cases.length} cases` : 'Load an engine first'}
                        </Button>
                    )}
                    {running && <Progress value={(liveResults.length / cases.length) * 100} />}

                    {(report || liveSummary) && <SummaryView report={report ?? { summary: liveSummary! }} loadMs={report?.loadMs} />}

                    {report && (
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" className={cn('flex-1', BTN)} onClick={() => copyText(JSON.stringify(report, null, 2))}>Copy JSON</Button>
                            <Button size="sm" variant="outline" className={cn('flex-1', BTN)} onClick={() => downloadJson(`ai-lab-${report.engineId.replace(/[^\w.-]+/g, '_')}-${report.startedAt.slice(0, 19)}.json`, report)}>Download</Button>
                        </div>
                    )}

                    <div className="space-y-2">
                        {(report?.results ?? liveResults).map(r => <CaseRow key={r.caseId} result={r} />)}
                    </div>
                </Section>

                <Section title="Playground">
                    <Textarea value={playNote} onChange={e => setPlayNote(e.target.value)} rows={3} />
                    <Button className={cn('w-full', BTN)} onClick={runPlayground} disabled={!loaded || running}>Parse note</Button>
                    {playOut && <pre className="text-[11px] whitespace-pre-wrap break-all bg-foreground/5 rounded-lg p-2">{playOut}</pre>}
                </Section>

                <Section
                    title={`Saved runs (${saved.length})`}
                    action={saved.length > 0 && (
                        <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className={BTN} onClick={() => downloadJson('ai-lab-runs.json', saved)}>Export</Button>
                            <Button size="sm" variant="ghost" className={BTN} onClick={() => { setSaved([]); writeSavedReports([]); }}>Clear</Button>
                        </div>
                    )}
                >
                    {saved.length === 0 && <p className="text-sm text-muted-foreground">Runs are kept on this device so you can compare them.</p>}
                    {saved.map(r => (
                        <button
                            key={r.startedAt + r.engineId}
                            type="button"
                            onClick={() => setReport(r)}
                            className={cn('w-full text-left rounded-xl bg-foreground/5 px-3 py-2 text-sm', BTN)}
                        >
                            <div className="font-medium truncate">{r.engineLabel}</div>
                            <div className="text-xs text-muted-foreground tabular-nums">
                                {r.promptVariant}{r.constrainCategories ? ' + enum' : ''}{r.categorizerLabel ? ` + ${r.categorizerLabel}` : ''} · {r.summary.perfect}/{r.summary.cases} perfect · cat {pct(r.summary.categoryAccuracy)} · p50 {sec(r.summary.latency.p50Ms)} · {new Date(r.startedAt).toLocaleString()}
                            </div>
                        </button>
                    ))}
                </Section>
            </div>
        </PageContainer>
    );
}
