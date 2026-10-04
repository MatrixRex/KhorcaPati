import {
    CreateWebWorkerMLCEngine,
    deleteModelAllInfoInCache,
    hasModelInCache,
    prebuiltAppConfig,
} from '@mlc-ai/web-llm';
import type { AIEngine } from '../types';
import type { LoadProgress, LoadedEngine } from './index';

export interface WebLLMModelOption {
    id: string;
    label: string;
    vramMB: number;
    /** f16 builds need the WebGPU `shader-f16` feature; f32 builds are the fallback. */
    needsF16: boolean;
}

/** Small instruct models worth trying on a mid-range phone, best Bangla candidates first. */
const CANDIDATES: Array<[id: string, label: string]> = [
    ['Qwen3.5-0.8B-q4f16_1-MLC', 'Qwen3.5 0.8B'],
    ['Qwen3.5-2B-q4f16_1-MLC', 'Qwen3.5 2B'],
    ['Qwen2.5-1.5B-Instruct-q4f16_1-MLC', 'Qwen2.5 1.5B'],
    ['Qwen3-1.7B-q4f16_1-MLC', 'Qwen3 1.7B'],
    ['gemma3-1b-it-q4f16_1-MLC', 'Gemma 3 1B'],
    ['Llama-3.2-1B-Instruct-q4f16_1-MLC', 'Llama 3.2 1B'],
    ['Qwen2.5-0.5B-Instruct-q4f16_1-MLC', 'Qwen2.5 0.5B'],
    ['Qwen3.5-0.8B-q4f32_1-MLC', 'Qwen3.5 0.8B (f32)'],
    ['Qwen2.5-1.5B-Instruct-q4f32_1-MLC', 'Qwen2.5 1.5B (f32)'],
    ['Llama-3.2-1B-Instruct-q4f32_1-MLC', 'Llama 3.2 1B (f32)'],
];

export const WEBLLM_MODELS: WebLLMModelOption[] = CANDIDATES.flatMap(([id, label]) => {
    const record = prebuiltAppConfig.model_list.find(m => m.model_id === id);
    if (!record) return [];
    return [{ id, label, vramMB: Math.round(record.vram_required_MB ?? 0), needsF16: /q\d+f16/.test(id) }];
});

/** Qwen3-family models think before answering unless told not to, which wastes phone time. */
const hasThinkingMode = (modelId: string) => /^Qwen3/i.test(modelId);

export const isWebLLMModelCached = (modelId: string) => hasModelInCache(modelId);
export const deleteWebLLMModel = (modelId: string) => deleteModelAllInfoInCache(modelId);

export async function loadWebLLMEngine(model: WebLLMModelOption, onProgress: (p: LoadProgress) => void): Promise<LoadedEngine> {
    const worker = new Worker(new URL('./webllm.worker.ts', import.meta.url), { type: 'module' });
    let mlc;
    try {
        mlc = await CreateWebWorkerMLCEngine(worker, model.id, {
            initProgressCallback: report => onProgress({ progress: report.progress, text: report.text }),
        });
    } catch (err) {
        worker.terminate();
        throw err;
    }

    const engine: AIEngine = {
        id: `webllm:${model.id}`,
        label: `WebLLM · ${model.label}`,
        async generate({ systemPrompt, userMessage, jsonSchema, signal }) {
            const onAbort = () => mlc.interruptGenerate();
            signal?.addEventListener('abort', onAbort, { once: true });
            try {
                const reply = await mlc.chat.completions.create({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMessage },
                    ],
                    temperature: 0,
                    // Largest eval note needs ~300 tokens; a low cap stops runaway repetition early.
                    max_tokens: 512,
                    response_format: { type: 'json_object', schema: JSON.stringify(jsonSchema) },
                    ...(hasThinkingMode(model.id) && { extra_body: { enable_thinking: false } }),
                });
                const usage = reply.usage;
                return {
                    text: reply.choices[0]?.message?.content ?? '',
                    stats: usage && {
                        promptTokens: usage.prompt_tokens,
                        completionTokens: usage.completion_tokens,
                        prefillTokPerSec: usage.extra?.prefill_tokens_per_s,
                        decodeTokPerSec: usage.extra?.decode_tokens_per_s,
                        timeToFirstTokenMs: usage.extra?.time_to_first_token_s !== undefined
                            ? usage.extra.time_to_first_token_s * 1000
                            : undefined,
                    },
                };
            } finally {
                signal?.removeEventListener('abort', onAbort);
            }
        },
    };

    return {
        engine,
        async unload() {
            await mlc.unload();
            worker.terminate();
        },
    };
}
