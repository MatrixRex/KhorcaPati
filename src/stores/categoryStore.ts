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

export const useCategoryStore = create<CategoryState>((set, get) => ({
    categories: [],
    isLoading: false,

    loadCategories: async () => {
        set({ isLoading: true });
        try {
            const data = await db.categories.toArray();
            set({ categories: data, isLoading: false });
        } catch (e) {
            console.error(e);
            set({ isLoading: false });
        }
    },

    ensureDefaultCategory: async () => {
        const unsorted = await db.categories.where('name').equalsIgnoreCase('Unsorted').first();
        if (!unsorted) {
            await db.categories.add({
                name: 'Unsorted',
                color: '#6b7280',
                icon: 'Tag',
                isDefault: true
            });
            await get().loadCategories();
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
            let targetName = 'Unsorted';
            if (migrateToId) {
                const targetCategory = await db.categories.get(migrateToId);
                if (targetCategory) {
                    targetName = targetCategory.name;
                }
            } else {
                const unsorted = await db.categories.where('isDefault').equals(1).first();
                if (unsorted) {
                    targetName = unsorted.name;
                }
            }

            await db.expenses.where('category').equals(category.name).modify({ category: targetName });
            await db.budgets.where('category').equals(category.name).modify({ category: targetName });
            await db.categories.delete(id);
        });
        await get().loadCategories();
    }
}));
