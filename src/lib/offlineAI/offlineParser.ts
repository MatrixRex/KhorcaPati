import { buildParseContext, postProcessAIResponse, type ParseContextInput, type ParsedGeminiTransaction } from '@/lib/geminiParser';
import type { ItemCategorizer } from '@/lib/categoryEmbed/categorizer';
import type { UnitClass } from '@/parsers/itemListParser';
import { extractTransactionsWithRules } from './ruleParser';

export interface OfflineParseInput extends Omit<ParseContextInput, 'referenceDate'> {
    noteText: string;
    referenceDate: string;
    /** Learned item → unit class, used to repair misplaced commas in item lists. */
    unitHints?: Record<string, UnitClass>;
}

/**
 * Offline equivalent of parseTransactionsWithGemini: rules find the transactions, the on-device
 * categorizer picks categories, and the shared post-processing applies the same cleanup, preference
 * overrides and deleted-category rules as the online path.
 */
export async function parseNoteOffline(input: OfflineParseInput, categorizer: Pick<ItemCategorizer, 'categorize'>): Promise<ParsedGeminiTransaction[]> {
    const found = extractTransactionsWithRules(input.noteText, input.referenceDate, input.unitHints);
    if (found.length === 0) return [];

    const picked = await categorizer.categorize(found.map(t => t.title), found.map(t => t.type));
    const transactions = found.map((t, i) => ({ ...t, category: picked[i]?.category ?? 'Unlisted', items: t.items ?? [] }));

    return postProcessAIResponse(JSON.stringify({ transactions }), buildParseContext(input));
}
