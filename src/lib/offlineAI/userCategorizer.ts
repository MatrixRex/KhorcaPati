import {
    createCategorizer, examplesFromSeedFile, DEFAULT_INCOME_CATEGORIES,
    type Embedder, type ItemCategorizer, type SeedVectorFile, type TransactionType,
} from '@/lib/categoryEmbed/categorizer';
import type { LabelledVector } from '@/lib/categoryEmbed/classifier';
import { prepareItemText } from '@/lib/categoryEmbed/seedData';
import { EMBED_PREFIX } from '@/lib/categoryEmbed/model';

export interface UserCategoryContext {
    /** Category names that exist in the user's database. */
    userCategories: string[];
    deletedCategories: string[];
    /** Past transactions, newest first. */
    history: Array<{ text: string; category: string; type: TransactionType }>;
    /** Learned keyword → category corrections (settings `categoryPreferences`). */
    preferences: Record<string, string>;
}

/** Common names users give the standard categories, so seeds land in the user's own category. */
const STANDARD_CATEGORY_ALIASES: Record<string, string[]> = {
    'Food & Dining': ['food', 'food and dining', 'dining', 'eating out', 'restaurant', 'meals', 'snacks', 'khabar', 'khawa', 'খাবার'],
    'Groceries': ['grocery', 'bazar', 'bajar', 'market', 'kacha bazar', 'বাজার'],
    'Transport': ['transportation', 'travel', 'commute', 'conveyance', 'vara', 'যাতায়াত'],
    'Bills & Utilities': ['bills', 'bill', 'utilities', 'utility', 'rent', 'house rent', 'বিল'],
    'Shopping': ['shop', 'কেনাকাটা'],
    'Healthcare': ['health', 'medical', 'medicine', 'doctor', 'চিকিৎসা', 'ওষুধ'],
    'Entertainment': ['fun', 'leisure', 'বিনোদন'],
    'Education': ['study', 'studies', 'school', 'tuition', 'শিক্ষা', 'পড়াশোনা'],
    'Personal Care': ['personal', 'grooming', 'self care', 'beauty', 'ব্যক্তিগত যত্ন', 'রূপচর্চা'],
    'Salary': ['income', 'earnings', 'wages', 'বেতন', 'আয়'],
};

// NFC: the same Bangla word can arrive in differently composed Unicode forms.
const norm = (s: string) => s.normalize('NFC').trim().toLowerCase();

/** standard category → the name to use for this user (their own category if one matches, else the standard name). */
export function mapStandardCategories(standard: string[], userCategories: string[]): Map<string, string> {
    const byNorm = new Map(userCategories.map(c => [norm(c), c]));
    return new Map(standard.map(std => {
        const candidates = [std, ...(STANDARD_CATEGORY_ALIASES[std] ?? [])].map(norm);
        const match = candidates.map(c => byNorm.get(c)).find(Boolean);
        return [std, match ?? std];
    }));
}

/**
 * Builds a categorizer from the built-in seeds plus this user's history and corrections.
 * `cache` maps prepared text → vector and is reused across calls so each text is embedded once.
 */
export async function createUserCategorizer(
    embedder: Embedder,
    seedFile: SeedVectorFile,
    context: UserCategoryContext,
    cache: Map<string, ArrayLike<number>>,
): Promise<ItemCategorizer> {
    const deleted = new Set(context.deletedCategories.map(norm));
    const usable = (category: string) => Boolean(category) && norm(category) !== 'unlisted' && !deleted.has(norm(category));

    const mapping = mapStandardCategories([...new Set(seedFile.entries.map(e => e.category))], context.userCategories);
    const seeds = examplesFromSeedFile(seedFile)
        .map(e => ({ ...e, category: mapping.get(e.category) ?? e.category }))
        .filter(e => usable(e.category));

    // Newest history wins when the same text was filed under different categories.
    const seenHistory = new Set<string>();
    const history = context.history.filter(h => {
        const key = prepareItemText(h.text);
        if (!key || !usable(h.category) || seenHistory.has(key)) return false;
        seenHistory.add(key);
        return true;
    });
    const corrections = Object.entries(context.preferences)
        .filter(([text, category]) => text.trim() && usable(category))
        .map(([text, category]) => ({ text, category }));

    const missing = [...new Set([...history, ...corrections].map(x => prepareItemText(x.text)))].filter(t => !cache.has(t));
    if (missing.length > 0) {
        const vectors = await embedder.embed(missing.map(t => EMBED_PREFIX + t));
        missing.forEach((t, i) => cache.set(t, vectors[i]));
    }

    const userExamples: LabelledVector[] = [
        ...history.map(h => ({ text: h.text, category: h.category, source: 'history' as const, vector: cache.get(prepareItemText(h.text))! })),
        ...corrections.map(c => ({ text: c.text, category: c.category, source: 'correction' as const, vector: cache.get(prepareItemText(c.text))! })),
    ];

    const incomeCategories = [...new Set([
        ...DEFAULT_INCOME_CATEGORIES.map(c => mapping.get(c) ?? c),
        ...history.filter(h => h.type === 'income').map(h => h.category),
    ])];

    return createCategorizer(embedder, [...seeds, ...userExamples], { incomeCategories });
}
