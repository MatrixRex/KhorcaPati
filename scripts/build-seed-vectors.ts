/**
 * Embeds src/lib/categoryEmbed/seeds.json and writes seedVectors.json next to it.
 * Run after editing the seed list: `pnpm seeds:build` (downloads the model on first run).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pipeline, env } from '@huggingface/transformers';
import { flattenSeeds, hashSeeds, prepareItemText, type SeedFile } from '../src/lib/categoryEmbed/seedData.ts';
import { packVectors } from '../src/lib/categoryEmbed/vectorPack.ts';
import { EMBED_DTYPE, EMBED_MODEL_ID, EMBED_PREFIX } from '../src/lib/categoryEmbed/model.ts';

const dir = new URL('../src/lib/categoryEmbed/', import.meta.url);
env.cacheDir = fileURLToPath(new URL('../.cache/transformers/', import.meta.url));

const seeds: SeedFile = JSON.parse(readFileSync(new URL('seeds.json', dir), 'utf8'));
const entries = flattenSeeds(seeds);

console.log(`Embedding ${entries.length} seed entries with ${EMBED_MODEL_ID} (${EMBED_DTYPE})…`);
const extractor = await pipeline('feature-extraction', EMBED_MODEL_ID, { dtype: EMBED_DTYPE });
const output = await extractor(entries.map(e => EMBED_PREFIX + prepareItemText(e.text)), { pooling: 'mean', normalize: true });
const vectors = output.tolist() as number[][];

const file = {
    model: EMBED_MODEL_ID,
    dtype: EMBED_DTYPE,
    hash: hashSeeds(entries, EMBED_MODEL_ID),
    entries,
    vectors: packVectors(vectors),
};
writeFileSync(new URL('seedVectors.json', dir), JSON.stringify(file));
console.log(`Wrote seedVectors.json: ${entries.length} vectors × ${vectors[0].length} dims, hash ${file.hash}`);
