import type { AIEngine } from '../types';
import type { LoadProgress, LoadedEngine } from './index';

/** Minimal typing for Chrome's built-in Prompt API (Gemini Nano). */
interface LanguageModelSession {
    prompt(input: string, options?: { responseConstraint?: object; signal?: AbortSignal }): Promise<string>;
    clone(): Promise<LanguageModelSession>;
    destroy(): void;
}

interface LanguageModelCreateOptions {
    initialPrompts?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    temperature?: number;
    topK?: number;
    monitor?: (m: EventTarget) => void;
}

interface LanguageModelStatic {
    availability(): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>;
    create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
}

const getLanguageModel = () => (globalThis as { LanguageModel?: LanguageModelStatic }).LanguageModel;

export async function promptApiAvailability(): Promise<string> {
    const lm = getLanguageModel();
    if (!lm) return 'unsupported';
    try {
        return await lm.availability();
    } catch (err) {
        return `error: ${err instanceof Error ? err.message : String(err)}`;
    }
}

export async function loadPromptApiEngine(onProgress: (p: LoadProgress) => void): Promise<LoadedEngine> {
    const lm = getLanguageModel();
    if (!lm) throw new Error('Chrome built-in AI (LanguageModel) is not available in this browser.');

    const monitor = (m: EventTarget) => m.addEventListener('downloadprogress', e => {
        onProgress({ progress: (e as ProgressEvent).loaded, text: 'Downloading Gemini Nano' });
    });

    // Creating a session triggers the model download if needed, so "load" covers it.
    const warmup = await lm.create({ monitor });
    warmup.destroy();
    onProgress({ progress: 1, text: 'Ready' });

    // One base session per system prompt; each call clones it so cases don't see each other.
    const bases = new Map<string, Promise<LanguageModelSession>>();
    const baseFor = (systemPrompt: string) => {
        let base = bases.get(systemPrompt);
        if (!base) {
            base = lm.create({ initialPrompts: [{ role: 'system', content: systemPrompt }], temperature: 0, topK: 1 });
            bases.set(systemPrompt, base);
        }
        return base;
    };

    const engine: AIEngine = {
        id: 'chrome-prompt-api',
        label: 'Chrome built-in AI (Gemini Nano)',
        async generate({ systemPrompt, userMessage, jsonSchema, signal }) {
            const session = await (await baseFor(systemPrompt)).clone();
            try {
                return { text: await session.prompt(userMessage, { responseConstraint: jsonSchema, signal }) };
            } finally {
                session.destroy();
            }
        },
    };

    return {
        engine,
        async unload() {
            for (const base of bases.values()) (await base).destroy();
            bases.clear();
        },
    };
}
