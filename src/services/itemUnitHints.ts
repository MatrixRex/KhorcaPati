import { db } from '@/db/schema';
import { buildUnitHints, type UnitClass } from '@/parsers/itemListParser';

/** How many recent saved items the item-list parser learns units from. */
export const UNIT_HINT_HISTORY = 1000;

/** Unit classes learned from the user's recent items, including the ones they corrected by hand. */
export async function loadUnitHints(): Promise<Record<string, UnitClass>> {
    const recent = await db.items.orderBy('id').reverse().limit(UNIT_HINT_HISTORY).toArray();
    return buildUnitHints(recent);
}
