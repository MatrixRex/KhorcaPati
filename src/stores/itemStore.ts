import { create } from 'zustand';
import { db, type Item } from '@/db/schema';

interface ItemState {
    addItem: (item: Omit<Item, 'id'>) => Promise<number>;
    updateItem: (id: number, item: Partial<Item>) => Promise<number>;
    deleteItem: (id: number) => Promise<void>;
}

export const useItemStore = create<ItemState>(() => ({
    addItem: async (item) => {
        try {
            return (await db.items.add(item)) as number;
        } catch (error) {
            console.error("Failed to add item", error);
            throw error;
        }
    },

    updateItem: async (id, item) => {
        try {
            return await db.items.update(id, item);
        } catch (error) {
            console.error("Failed to update item", error);
            throw error;
        }
    },

    deleteItem: async (id) => {
        try {
            await db.items.delete(id);
        } catch (error) {
            console.error("Failed to delete item", error);
            throw error;
        }
    }
}));
