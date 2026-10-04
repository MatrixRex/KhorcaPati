import { describe, it, expect } from 'vitest';
import { packVectors, unpackVectors } from './vectorPack';
import { cosine } from './classifier';

describe('packVectors / unpackVectors', () => {
    it('round-trips vectors as int8 with small error', () => {
        const vectors = [
            [0.12, -0.5, 0.33, 0.9],
            [-0.01, 0.02, -0.03, 0.04],
        ];
        const packed = packVectors(vectors);
        expect(packed.dims).toBe(4);
        expect(packed.count).toBe(2);
        expect(typeof packed.data).toBe('string');

        const out = unpackVectors(packed);
        expect(out).toHaveLength(2);
        vectors.forEach((v, i) => {
            v.forEach((x, j) => expect(out[i][j]).toBeCloseTo(x, 2));
            expect(cosine(v, Array.from(out[i]))).toBeGreaterThan(0.999);
        });
    });

    it('keeps zero vectors as zeros', () => {
        const out = unpackVectors(packVectors([[0, 0, 0]]));
        expect(Array.from(out[0])).toEqual([0, 0, 0]);
    });

    it('rejects vectors of mixed length', () => {
        expect(() => packVectors([[1, 2], [1, 2, 3]])).toThrow(/dimension/i);
    });
});
