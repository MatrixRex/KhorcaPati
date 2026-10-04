import { describe, it, expect } from 'vitest';
import { db } from '@/db/schema';
import { PRESET_CATEGORIES, createOnboardingCategories, presetCategoryNames } from './onboardingCategories';
import { mapStandardCategories } from '@/lib/offlineAI/userCategorizer';
import { createMockCategory } from '@/test/factories';

describe('preset categories', () => {
    it('offers the names in the chosen language', () => {
        expect(presetCategoryNames('en')).toContain('Food & Dining');
        expect(presetCategoryNames('bn')).toContain('খাবার');
        expect(presetCategoryNames('en')).toHaveLength(PRESET_CATEGORIES.length);
    });

    it('maps every preset name, in both languages, to the standard category the offline model knows', () => {
        for (const lang of ['en', 'bn'] as const) {
            const names = presetCategoryNames(lang);
            const mapping = mapStandardCategories(PRESET_CATEGORIES.map(p => p.standard), names);
            PRESET_CATEGORIES.forEach((p, i) => expect(mapping.get(p.standard), `${lang}: ${p.standard}`).toBe(names[i]));
        }
    });
});

describe('createOnboardingCategories', () => {
    it('creates the chosen categories with preset colours, plus custom ones', async () => {
        await createOnboardingCategories(['Food & Dining', 'Transport', '  pets  ']);
        const cats = await db.categories.toArray();
        expect(cats.map(c => c.name).sort()).toEqual(['Food & Dining', 'Pets', 'Transport']);
        const food = PRESET_CATEGORIES.find(p => p.en === 'Food & Dining')!;
        expect(cats.find(c => c.name === 'Food & Dining')?.color).toBe(food.color);
    });

    it('skips blanks, duplicates and categories that already exist', async () => {
        await db.categories.add(createMockCategory({ name: 'Transport' }));
        await createOnboardingCategories(['transport', 'Shopping', 'shopping', '']);
        const names = (await db.categories.toArray()).map(c => c.name).sort();
        expect(names).toEqual(['Shopping', 'Transport']);
    });
});
