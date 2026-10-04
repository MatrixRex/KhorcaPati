/** Vectors stored as int8 with one scale per vector: ~4x smaller than float32, error well under 1%. */
export interface PackedVectors {
    dims: number;
    count: number;
    scales: number[];
    /** base64 of count * dims signed bytes */
    data: string;
}

function toBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
}

function fromBase64(data: string): Uint8Array {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

export function packVectors(vectors: ArrayLike<number>[]): PackedVectors {
    const dims = vectors[0]?.length ?? 0;
    const bytes = new Int8Array(vectors.length * dims);
    const scales = vectors.map((v, i) => {
        if (v.length !== dims) throw new Error(`Vector ${i} has dimension ${v.length}, expected ${dims}`);
        let max = 0;
        for (let j = 0; j < dims; j++) max = Math.max(max, Math.abs(v[j]));
        const scale = max / 127;
        for (let j = 0; j < dims; j++) bytes[i * dims + j] = scale === 0 ? 0 : Math.round(v[j] / scale);
        return scale;
    });
    return { dims, count: vectors.length, scales, data: toBase64(new Uint8Array(bytes.buffer)) };
}

export function unpackVectors(packed: PackedVectors): Float32Array[] {
    const bytes = new Int8Array(fromBase64(packed.data).buffer);
    return Array.from({ length: packed.count }, (_, i) => {
        const out = new Float32Array(packed.dims);
        for (let j = 0; j < packed.dims; j++) out[j] = bytes[i * packed.dims + j] * packed.scales[i];
        return out;
    });
}
