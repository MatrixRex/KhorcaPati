import { bengaliToEnglishDigits } from '@/parsers/itemParser';
import type { Expense, Item } from '@/db/schema';

export interface SearchField {
    text: string;
    weight: number;
}

export interface Ranked<T> {
    item: T;
    score: number;
}

const TYPE_SYNONYMS: Record<Expense['type'], string> = {
    expense: 'expense expenses spent spend paid pay cost bought',
    income: 'income earned earn received salary gain',
};

/** Lowercase, Bangla digits → ASCII, punctuation → space, collapsed. */
export function normalizeText(input: string): string {
    return bengaliToEnglishDigits(input ?? '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\p{M}.\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function tokenize(input: string): string[] {
    return normalizeText(input).split(' ').filter(Boolean);
}

/** Damerau-Levenshtein (optimal string alignment) distance. */
export function editDistance(a: string, b: string): number {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 0; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
                d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
            }
        }
    }
    return d[a.length][b.length];
}

const isNumeric = (s: string) => /^\d+(\.\d+)?$/.test(s);

/** Allowed typos: none for very short words, 1 up to 6 chars, 2 beyond. */
function maxTypos(len: number): number {
    if (len <= 3) return 0;
    return len <= 6 ? 1 : 2;
}

/** How well a query token matches one field word: 1 exact … 0 none. */
export function matchWord(token: string, word: string): number {
    if (token === word) return 1;
    if (isNumeric(token) || isNumeric(word)) {
        // Numbers: exact or leading digits only (typing "12" finds "120"), never fuzzy.
        return isNumeric(token) && isNumeric(word) && word.startsWith(token) ? 0.7 : 0;
    }
    if (word.startsWith(token)) return 0.85;
    if (token.length >= 3 && word.includes(token)) return 0.6;
    const allowed = maxTypos(token.length);
    if (allowed === 0) return 0;
    // Compare against the whole word and against a same-length prefix, so a typo
    // still matches while the user is partway through typing.
    const dist = Math.min(editDistance(token, word), editDistance(token, word.slice(0, token.length)));
    if (dist > allowed) return 0;
    return 0.5 * (1 - dist / token.length) + 0.1;
}

/**
 * Scores one document. Every query token must match something (AND), so
 * "oil 1l" narrows rather than widens. Exact beats prefix beats substring
 * beats typo; a whole-phrase hit adds a bonus. Returns 0 for no match.
 */
export function scoreFields(query: string, fields: SearchField[]): number {
    const tokens = tokenize(query);
    if (tokens.length === 0) return 0;
    const prepared = fields
        .map(f => ({ norm: normalizeText(f.text), weight: f.weight }))
        .filter(f => f.norm)
        .map(f => ({ ...f, words: f.norm.split(' ') }));

    let total = 0;
    for (const token of tokens) {
        let best = 0;
        for (const f of prepared) {
            for (const w of f.words) {
                const s = matchWord(token, w) * f.weight;
                if (s > best) best = s;
            }
        }
        if (best === 0) return 0;
        total += best;
    }

    const phrase = tokens.join(' ');
    for (const f of prepared) {
        if (f.norm === phrase) total += 3 * f.weight;
        else if (f.norm.includes(phrase)) total += 1.5 * f.weight;
    }
    return total;
}

export function rankBy<T>(
    items: T[],
    query: string,
    getFields: (item: T) => SearchField[],
): Ranked<T>[] {
    const out: Ranked<T>[] = [];
    for (const item of items) {
        const score = scoreFields(query, getFields(item));
        if (score > 0) out.push({ item, score });
    }
    return out.sort((a, b) => b.score - a.score);
}

export const hasQuery = (query: string) => tokenize(query).length > 0;

export function expenseFields(e: Expense): SearchField[] {
    return [
        { text: e.title ?? '', weight: 3 },
        { text: e.note ?? '', weight: 3 },
        { text: e.category ?? '', weight: 2 },
        { text: String(e.amount), weight: 2 },
        { text: TYPE_SYNONYMS[e.type] ?? e.type, weight: 1 },
    ];
}

export function itemFields(i: Item): SearchField[] {
    return [
        { text: i.name, weight: 3 },
        { text: i.rawInput ?? '', weight: 2 },
        { text: i.unit ?? '', weight: 1 },
        { text: String(i.qty), weight: 1 },
    ];
}

export const searchExpenses = (list: Expense[], query: string) => rankBy(list, query, expenseFields);
export const searchItems = (list: Item[], query: string) => rankBy(list, query, itemFields);
