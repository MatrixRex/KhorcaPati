/** Kept dependency-free so the Node build script can import it directly. */

export interface SeedFile {
    version: number;
    categories: Record<string, string[]>;
}

export interface SeedEntry {
    text: string;
    category: string;
}

export const normalizeSeedText = (text: string) => text.toLowerCase().trim().replace(/\s+/g, ' ');

export function flattenSeeds(seeds: SeedFile): SeedEntry[] {
    return Object.entries(seeds.categories).flatMap(([category, words]) => words.map(text => ({ text, category })));
}

/** Verbs, particles and connectors that say nothing about the category ("kinlam", "e", "theke", ...). */
const FILLER_WORDS = new Set([
    'the', 'and', 'for', 'with', 'from', 'paid', 'bought', 'got', 'to', 'at',
    'e', 'te', 'er', 'r', 'ke',
    'kinlam', 'dilam', 'korlam', 'pelam', 'gelam', 'khelam', 'dise', 'dilo', 'theke', 'sathe', 'kora', 'korte', 'holo', 'ache',
    'দিলাম', 'কিনলাম', 'করলাম', 'পেলাম', 'গেলাম', 'খেলাম', 'থেকে', 'সাথে', 'জন্য', 'বাবদ', 'হলো',
]);

/**
 * Text actually embedded for both seeds and user items: filler removed so "salon e gelam" matches
 * "salon" rather than "bus e gelam". Falls back to the normalized text if nothing would remain.
 */
export function prepareItemText(text: string): string {
    const normalized = normalizeSeedText(text);
    const kept = normalized.split(' ').filter(w => !FILLER_WORDS.has(w));
    return kept.length > 0 ? kept.join(' ') : normalized;
}

/** Category-bearing words: normalized, at least 3 characters, filler removed. */
export function contentTokens(text: string): string[] {
    return normalizeSeedText(text)
        .split(' ')
        .filter(t => [...t].length >= 3 && !FILLER_WORDS.has(t));
}

export function seedTokenSet(entries: SeedEntry[]): Set<string> {
    return new Set(entries.flatMap(e => contentTokens(e.text)));
}

/** Novel = has content words and none of them appear in any seed, so a correct answer means real generalization. */
export function isNovelItem(text: string, seedTokens: Set<string>): boolean {
    const tokens = contentTokens(text);
    return tokens.length > 0 && tokens.every(t => !seedTokens.has(t));
}

/** FNV-1a hash of the entries + model id; detects a stale prebuilt vector file. */
export function hashSeeds(entries: SeedEntry[], modelId: string): string {
    // Hash the prepared text, so changing prepareItemText also marks the vector file stale.
    const input = `${modelId}\n${entries.map(e => `${e.category}\t${prepareItemText(e.text)}`).join('\n')}`;
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}
