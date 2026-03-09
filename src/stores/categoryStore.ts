import { create } from 'zustand';
import { db, type Category } from '@/db/schema';

interface CategoryState {
    categories: Category[];
    isLoading: boolean;
    loadCategories: () => Promise<void>;
    addCategory: (name: string, color?: string, icon?: string) => Promise<number>;
    updateCategory: (id: number, updates: Partial<Category>) => Promise<number>;
    deleteCategory: (id: number, migrateToId?: number) => Promise<void>;
    ensureDefaultCategory: () => Promise<void>;
}

let isEnsuringDefault = false;

export const useCategoryStore = create<CategoryState>((set, get) => ({
    categories: [],
    isLoading: false,

    loadCategories: async () => {
        set({ isLoading: true });
        try {
            const data = await db.categories.toArray();
            console.log('Loaded categories from DB:', data.length);
            // De-duplicate in memory just in case of weird sync issues
            const unique = Array.from(new Map(data.map(c => [c.name.toLowerCase().trim(), c])).values());
            set({ categories: unique, isLoading: false });
        } catch (e) {
            console.error(e);
            set({ isLoading: false });
        }
    },

    ensureDefaultCategory: async () => {
        if (isEnsuringDefault) return;
        isEnsuringDefault = true;

        try {
            console.log('Checking for default category...');
            // Find any category with isDefault property set to true (handles both true and 1)
            const allCats = await db.categories.toArray();
            const defaultCat = allCats.find(c => c.isDefault === true || (c.isDefault as any) === 1);

            if (!defaultCat) {
                console.log('No default found, creating "Unlisted"...');
                // If no default exists, create 'Unlisted' as the new default
                await db.categories.add({
                    name: 'Unlisted',
                    color: '#6b7280',
                    icon: 'Tag',
                    isDefault: true
                });
            } else {
                console.log('Default category exists:', defaultCat.name);
            }
        } catch (e) {
            console.warn('Category initialization conflict or error:', e);
        } finally {
            await get().loadCategories();
            isEnsuringDefault = false;
        }
    },

    addCategory: async (name, color = '#3b82f6', icon = 'Tag') => {
        const trimmedName = name.trim();
        if (!trimmedName) return 0;

        // Auto-capitalize first letter
        const capitalizedName = trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1);

        const existing = await db.categories.where('name').equalsIgnoreCase(capitalizedName).first();
        if (existing) return existing.id!;

        const id = await db.categories.add({
            name: capitalizedName,
            color,
            icon,
            isDefault: false
        });
        await get().loadCategories();
        return id as number;
    },

    updateCategory: async (id, updates) => {
        if (updates.name) {
            const trimmedName = updates.name.trim();
            if (!trimmedName) return id;

            const existing = await db.categories.where('name').equalsIgnoreCase(trimmedName).first();
            if (existing && existing.id !== id) {
                // Name already exists for another category
                // We could merge them, but for now just return
                return id;
            }

            const category = await db.categories.get(id);
            if (category && category.name !== trimmedName) {
                // Update all expenses with this category name
                await db.transaction('rw', [db.categories, db.expenses, db.budgets], async () => {
                    await db.expenses.where('category').equals(category.name).modify({ category: trimmedName });
                    await db.budgets.where('category').equals(category.name).modify({ category: trimmedName });
                    await db.categories.update(id, { ...updates, name: trimmedName });
                });
            } else {
                await db.categories.update(id, { ...updates, name: trimmedName });
            }
        } else {
            await db.categories.update(id, updates);
        }
        await get().loadCategories();
        return id;
    },

    deleteCategory: async (id, migrateToId) => {
        const category = await db.categories.get(id);
        if (!category) return;
        if (category.isDefault) return;

        await db.transaction('rw', [db.categories, db.expenses, db.budgets], async () => {
            let targetName = 'Unlisted';
            if (migrateToId) {
                const targetCategory = await db.categories.get(migrateToId);
                if (targetCategory) {
                    targetName = targetCategory.name;
                }
            } else {
                const defaultCat = await db.categories.where('isDefault').equals(1).first();
                if (defaultCat) {
                    targetName = defaultCat.name;
                }
            }

            await db.expenses.where('category').equals(category.name).modify({ category: targetName });
            await db.budgets.where('category').equals(category.name).modify({ category: targetName });
            await db.categories.delete(id);
        });
        await get().loadCategories();
    }
}));
