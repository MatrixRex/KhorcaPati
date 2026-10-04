import { env, pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { EMBED_DTYPE, EMBED_MODEL_ID } from './model';

// Fetch models from the Hugging Face hub only; the dev server would answer /models/... with index.html.
env.allowLocalModels = false;

export type EmbedWorkerRequest =
    | { type: 'load'; device: 'webgpu' | 'wasm' }
    | { type: 'embed'; id: number; texts: string[] };

export type EmbedWorkerResponse =
    | { type: 'progress'; progress: number }
    | { type: 'ready' }
    | { type: 'result'; id: number; vectors: number[][] }
    | { type: 'error'; id?: number; message: string };

let extractor: FeatureExtractionPipeline | null = null;
const reply = (msg: EmbedWorkerResponse) => self.postMessage(msg);

self.onmessage = async (event: MessageEvent<EmbedWorkerRequest>) => {
    const msg = event.data;
    try {
        if (msg.type === 'load') {
            extractor = await pipeline('feature-extraction', EMBED_MODEL_ID, {
                dtype: EMBED_DTYPE,
                device: msg.device,
                progress_callback: info => {
                    if (info.status === 'progress_total') reply({ type: 'progress', progress: info.progress / 100 });
                },
            });
            reply({ type: 'ready' });
        } else {
            if (!extractor) throw new Error('Embedding model not loaded');
            const output = await extractor(msg.texts, { pooling: 'mean', normalize: true });
            reply({ type: 'result', id: msg.id, vectors: output.tolist() as number[][] });
        }
    } catch (err) {
        reply({ type: 'error', id: msg.type === 'embed' ? msg.id : undefined, message: err instanceof Error ? err.message : String(err) });
    }
};
