import { useCategoryStore } from '@/stores/categoryStore';

export interface PresetCategory {
    /** Standard name used by the offline category model's seed words. */
    standard: string;
    en: string;
    bn: string;
    color: string;
}

/** Starter categories offered during onboarding; the user can remove any of them or add their own. */
export const PRESET_CATEGORIES: PresetCategory[] = [
    { standard: 'Food & Dining', en: 'Food & Dining', bn: 'খাবার', color: '#f97316' },
    { standard: 'Groceries', en: 'Groceries', bn: 'বাজার', color: '#22c55e' },
    { standard: 'Transport', en: 'Transport', bn: 'যাতায়াত', color: '#3b82f6' },
    { standard: 'Bills & Utilities', en: 'Bills & Utilities', bn: 'বিল', color: '#eab308' },
    { standard: 'Shopping', en: 'Shopping', bn: 'কেনাকাটা', color: '#ec4899' },
    { standard: 'Healthcare', en: 'Healthcare', bn: 'চিকিৎসা', color: '#ef4444' },
    { standard: 'Entertainment', en: 'Entertainment', bn: 'বিনোদন', color: '#8b5cf6' },
    { standard: 'Education', en: 'Education', bn: 'শিক্ষা', color: '#6366f1' },
    { standard: 'Personal Care', en: 'Personal Care', bn: 'ব্যক্তিগত যত্ন', color: '#06b6d4' },
    { standard: 'Salary', en: 'Salary', bn: 'বেতন', color: '#10b981' },
];

export const presetCategoryNames = (lang: string): string[] =>
    PRESET_CATEGORIES.map(p => (lang === 'bn' ? p.bn : p.en));

const norm = (s: string) => s.normalize('NFC').trim().toLowerCase();

/** Creates the categories picked during onboarding, skipping blanks, duplicates and existing ones. */
export async function createOnboardingCategories(names: string[]): Promise<void> {
    const { addCategory } = useCategoryStore.getState();
    const seen = new Set<string>();
    for (const raw of names) {
        const name = raw.trim();
        if (!name || seen.has(norm(name))) continue;
        seen.add(norm(name));
        const preset = PRESET_CATEGORIES.find(p => norm(p.en) === norm(name) || norm(p.bn) === norm(name));
        await addCategory(name, preset?.color); // addCategory already ignores names that exist
    }
}
