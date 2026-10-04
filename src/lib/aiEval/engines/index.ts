import { callAIProvider } from '@/lib/geminiParser';
import type { AIProviderConfig } from '@/lib/aiProviders';
import type { AIEngine } from '../types';

export interface LoadProgress {
    /** 0..1 */
    progress: number;
    text: string;
}

export interface LoadedEngine {
    engine: AIEngine;
    unload(): Promise<void>;
}

/** Baseline: the user's configured cloud provider, called exactly as production does (its own schema, JSON mode). */
export function createCloudEngine(provider: AIProviderConfig): LoadedEngine {
    return {
        engine: {
            id: `cloud:${provider.type}:${provider.model}`,
            label: `Cloud · ${provider.name || provider.type} · ${provider.model}`,
            generate: async ({ systemPrompt, userMessage }) => ({
                text: await callAIProvider(provider, systemPrompt, userMessage),
            }),
        },
        unload: async () => {},
    };
}
