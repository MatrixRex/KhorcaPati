import type { Embedder } from './categorizer';
import type { EmbedWorkerRequest, EmbedWorkerResponse } from './embed.worker';

export type EmbedDevice = 'webgpu' | 'wasm';

export interface LoadedEmbedder {
    embedder: Embedder;
    device: EmbedDevice;
    unload(): void;
}

/** Starts the embedding model in a Web Worker (downloads ~120 MB on first use, then served from browser cache). */
export function loadBrowserEmbedder(device: EmbedDevice, onProgress: (progress: number) => void): Promise<LoadedEmbedder> {
    const worker = new Worker(new URL('./embed.worker.ts', import.meta.url), { type: 'module' });
    const pending = new Map<number, { resolve: (v: number[][]) => void; reject: (e: Error) => void }>();
    let nextId = 0;

    return new Promise((resolveLoad, rejectLoad) => {
        worker.onmessage = (event: MessageEvent<EmbedWorkerResponse>) => {
            const msg = event.data;
            if (msg.type === 'progress') onProgress(msg.progress);
            else if (msg.type === 'ready') {
                resolveLoad({
                    device,
                    unload: () => worker.terminate(),
                    embedder: {
                        embed: texts => new Promise((resolve, reject) => {
                            const id = nextId++;
                            pending.set(id, { resolve, reject });
                            worker.postMessage({ type: 'embed', id, texts } satisfies EmbedWorkerRequest);
                        }),
                    },
                });
            } else if (msg.type === 'result') {
                pending.get(msg.id)?.resolve(msg.vectors);
                pending.delete(msg.id);
            } else if (msg.id !== undefined) {
                pending.get(msg.id)?.reject(new Error(msg.message));
                pending.delete(msg.id);
            } else {
                worker.terminate();
                rejectLoad(new Error(msg.message));
            }
        };
        worker.onerror = e => {
            worker.terminate();
            rejectLoad(new Error(e.message || 'Embedding worker failed to start'));
        };
        worker.postMessage({ type: 'load', device } satisfies EmbedWorkerRequest);
    });
}
