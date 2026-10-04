import { promptApiAvailability } from './engines/promptApi';

export interface DeviceReport {
    userAgent: string;
    deviceMemoryGB: number | null;
    cpuCores: number | null;
    secureContext: boolean;
    webgpu: {
        supported: boolean;
        error?: string;
        vendor?: string;
        architecture?: string;
        description?: string;
        isFallbackAdapter?: boolean;
        shaderF16: boolean;
        maxBufferSizeMB?: number;
        maxStorageBufferBindingSizeMB?: number;
    };
    promptApi: string;
    storage: { quotaMB: number | null; usageMB: number | null; persisted: boolean | null };
}

const toMB = (bytes: number | undefined) => (bytes === undefined ? undefined : Math.round(bytes / 1024 / 1024));

/** Minimal WebGPU typing; the project doesn't ship @webgpu/types. */
interface GPUAdapterLike {
    features: { has(name: string): boolean };
    limits: { maxBufferSize: number; maxStorageBufferBindingSize: number };
    info?: { vendor?: string; architecture?: string; description?: string; isFallbackAdapter?: boolean };
    isFallbackAdapter?: boolean;
}

async function probeWebGPU(): Promise<DeviceReport['webgpu']> {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(o?: object): Promise<GPUAdapterLike | null> } }).gpu;
    if (!gpu) return { supported: false, shaderF16: false, error: 'navigator.gpu is missing' };
    try {
        const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
        if (!adapter) return { supported: false, shaderF16: false, error: 'No WebGPU adapter returned' };
        return {
            supported: true,
            vendor: adapter.info?.vendor,
            architecture: adapter.info?.architecture,
            description: adapter.info?.description,
            isFallbackAdapter: adapter.info?.isFallbackAdapter ?? adapter.isFallbackAdapter,
            shaderF16: adapter.features.has('shader-f16'),
            maxBufferSizeMB: toMB(adapter.limits.maxBufferSize),
            maxStorageBufferBindingSizeMB: toMB(adapter.limits.maxStorageBufferBindingSize),
        };
    } catch (err) {
        return { supported: false, shaderF16: false, error: err instanceof Error ? err.message : String(err) };
    }
}

export async function probeDevice(): Promise<DeviceReport> {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const [webgpu, promptApi, estimate, persisted] = await Promise.all([
        probeWebGPU(),
        promptApiAvailability(),
        navigator.storage?.estimate?.().catch(() => undefined),
        navigator.storage?.persisted?.().catch(() => null) ?? null,
    ]);

    return {
        userAgent: navigator.userAgent,
        deviceMemoryGB: nav.deviceMemory ?? null,
        cpuCores: navigator.hardwareConcurrency ?? null,
        secureContext: window.isSecureContext,
        webgpu,
        promptApi,
        storage: {
            quotaMB: toMB(estimate?.quota) ?? null,
            usageMB: toMB(estimate?.usage) ?? null,
            persisted,
        },
    };
}
