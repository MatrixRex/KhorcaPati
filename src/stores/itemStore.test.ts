import { describe, it, expect } from 'vitest';
import { db } from '@/db/schema';
import { useItemStore } from './itemStore';
import { createMockItem } from '@/test/factories';

describe('Item Store Business Logic', () => {
    it('supports full item CRUD lifecycle', async () => {
        const store = useItemStore.getState();

        // 1. Create
        const id = await store.addItem(createMockItem({
            name: 'rice',
            qty: 5,
            unit: 'kg'
        }));
        expect(id).toBeDefined();

        let inDb = await db.items.get(id);
        expect(inDb?.name).toBe('rice');
        expect(inDb?.qty).toBe(5);

        // 2. Update
        await store.updateItem(id, { qty: 10 });
        inDb = await db.items.get(id);
        expect(inDb?.qty).toBe(10);

        // 3. Delete
        await store.deleteItem(id);
        expect(await db.items.get(id)).toBeUndefined();
    });
});
