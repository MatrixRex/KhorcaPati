import { db } from '@/db/schema';
import { useSettingsStore } from '@/stores/settingsStore';
import type { UserCategoryContext } from './userCategorizer';

/** Reads what the offline categorizer learns from: the user's categories, recent history and corrections. */
export async function loadUserCategoryContext({ historyLimit = 300 }: { historyLimit?: number } = {}): Promise<UserCategoryContext> {
    const [categories, recent] = await Promise.all([
        db.categories.toArray(),
        db.expenses.orderBy('id').reverse().limit(historyLimit).toArray(),
    ]);
    const { categoryPreferences, deletedCategories } = useSettingsStore.getState();

    return {
        userCategories: categories.map(c => c.name),
        deletedCategories: deletedCategories ?? [],
        preferences: categoryPreferences ?? {},
        history: recent
            .map(e => ({ text: (e.title || e.note || '').trim(), category: e.category, type: e.type }))
            .filter(h => h.text && h.category),
    };
}
