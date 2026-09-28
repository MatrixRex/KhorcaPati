export type AIProviderType = 'gemini' | 'groq' | 'openrouter' | 'custom';

export interface AIProviderConfig {
    id: string;
    name: string;
    type: AIProviderType;
    apiKey: string;
    model: string;
    baseUrl?: string;
    enabled: boolean;
}

export interface ModelOption {
    id: string;
    label: string;
    description?: string;
    isFree?: boolean;
}

export const DEFAULT_PROVIDER_MODELS: Record<AIProviderType, string[]> = {
    gemini: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-lite-latest'],
    groq: ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b'],
    openrouter: ['meta-llama/llama-3.3-70b-instruct:free', 'deepseek/deepseek-r1:free', 'qwen/qwen-2.5-72b-instruct:free'],
    custom: ['gpt-3.5-turbo', 'llama3']
};

/**
 * Fetches available free / active models directly from the respective provider.
 */
export async function fetchProviderModels(type: AIProviderType, apiKey: string, baseUrl?: string): Promise<ModelOption[]> {
    const key = apiKey.trim();
    if (!key && type !== 'custom') {
        return [];
    }

    try {
        if (type === 'groq') {
            const res = await fetch('https://api.groq.com/openai/v1/models', {
                headers: {
                    Authorization: `Bearer ${key}`
                }
            });
            if (!res.ok) throw new Error(`Groq API returned ${res.status}`);
            const data = await res.json();
            const list: any[] = data.data || [];
            
            // Filter chat completion capable models, exclude whisper and prompt guards
            return list
                .filter(m => m.active !== false && !m.id.includes('whisper') && !m.id.includes('guard'))
                .map(m => {
                    const isRecommended = m.id === 'openai/gpt-oss-20b' || m.id === 'openai/gpt-oss-120b';
                    return {
                        id: m.id,
                        label: m.id,
                        description: isRecommended ? 'Recommended (Ultra-fast & accurate)' : undefined,
                        isFree: true
                    };
                })
                .sort((a, b) => {
                    // Put recommended gpt-oss models first
                    if (a.id.includes('gpt-oss-20b')) return -1;
                    if (b.id.includes('gpt-oss-20b')) return 1;
                    if (a.id.includes('gpt-oss-120b')) return -1;
                    if (b.id.includes('gpt-oss-120b')) return 1;
                    return a.id.localeCompare(b.id);
                });
        }

        if (type === 'openrouter') {
            const res = await fetch('https://openrouter.ai/api/v1/models', {
                headers: {
                    Authorization: `Bearer ${key}`
                }
            });
            if (!res.ok) throw new Error(`OpenRouter API returned ${res.status}`);
            const data = await res.json();
            const list: any[] = data.data || [];

            // Find free models
            const freeModels = list.filter(m => {
                const promptCost = parseFloat(m.pricing?.prompt || '0');
                const completionCost = parseFloat(m.pricing?.completion || '0');
                return promptCost === 0 && completionCost === 0;
            });

            return freeModels.map(m => ({
                id: m.id,
                label: m.name || m.id,
                description: 'Free tier',
                isFree: true
            }));
        }

        if (type === 'gemini') {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            if (!res.ok) throw new Error(`Gemini API returned ${res.status}`);
            const data = await res.json();
            const list: any[] = data.models || [];

            return list
                .filter(m => (m.supportedGenerationMethods || []).includes('generateContent') && !m.name.includes('embedding') && !m.name.includes('aqa'))
                .map(m => {
                    const cleanId = m.name.replace(/^models\//, '');
                    return {
                        id: cleanId,
                        label: m.displayName || cleanId,
                        isFree: true
                    };
                });
        }

        if (type === 'custom') {
            const endpoint = (baseUrl?.replace(/\/$/, '') || 'http://localhost:11434/v1') + '/models';
            const headers: Record<string, string> = {};
            if (key) headers['Authorization'] = `Bearer ${key}`;

            const res = await fetch(endpoint, { headers });
            if (!res.ok) throw new Error(`Custom endpoint returned ${res.status}`);
            const data = await res.json();
            const list: any[] = data.data || [];
            return list.map(m => ({
                id: m.id,
                label: m.id,
                isFree: true
            }));
        }
    } catch (e) {
        console.warn(`Failed to fetch models for ${type}:`, e);
    }

    // Fallback to static defaults
    return (DEFAULT_PROVIDER_MODELS[type] || []).map(id => ({
        id,
        label: id,
        isFree: true
    }));
}
