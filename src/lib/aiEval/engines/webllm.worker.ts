import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

// Runs the model off the main thread so the UI stays responsive during generation.
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg: MessageEvent) => handler.onmessage(msg);
