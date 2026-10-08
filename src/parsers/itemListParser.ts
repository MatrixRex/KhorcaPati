import { KNOWN_UNITS, parseItemDetailed, type ParsedItem } from './itemParser';

export interface ListedItem extends ParsedItem {
    /** The text the item came from, e.g. "Oil 1L". */
    rawInput: string;
}

/** What kind of amount a unit measures. Packaging fits any item ("rice 1 bag", "oil 2 bottle"). */
export type UnitClass = 'weight' | 'volume' | 'count' | 'length' | 'area' | 'package';

const UNIT_CLASSES: Record<UnitClass, string[]> = {
    weight: ['kg', 'g', 'mg', 'lb', 'oz', 'ton', 'mon', 'ser', 'tola'],
    volume: ['L', 'ml', 'cl', 'dl', 'gal', 'qt', 'pt', 'cup', 'tbsp', 'tsp', 'fl oz'],
    count: ['pcs', 'dozen', 'half-dozen', 'strip', 'tab', 'cap', 'bundle', 'roll', 'tube'],
    length: ['m', 'cm', 'mm', 'km', 'ft', 'in', 'yd', 'gaj', 'hat'],
    area: ['sqft', 'sqm', 'sqyd', 'acre', 'katha', 'bigha', 'shotok'],
    package: ['pack', 'box', 'bag', 'bottle', 'can', 'jar', 'sachet'],
};

const CLASS_BY_UNIT = new Map(Object.entries(UNIT_CLASSES).flatMap(([cls, units]) => units.map(u => [u, cls as UnitClass])));

export function unitClassOf(unit: string): UnitClass | undefined {
    return CLASS_BY_UNIT.get(unit);
}

/** How common items are usually bought. Used to judge whether a stray quantity belongs to an item. */
const ITEM_CLASSES: Record<Exclude<UnitClass, 'package' | 'area'>, string[]> = {
    weight: [
        'rice', 'chal', 'chaal', 'atta', 'ata', 'moida', 'maida', 'flour', 'sooji', 'suji', 'sugar', 'suger', 'chini',
        'salt', 'lobon', 'dal', 'daal', 'lentil', 'onion', 'peyaj', 'piyaj', 'peyaz', 'piaj', 'garlic', 'roshun',
        'rosun', 'ginger', 'ada', 'potato', 'alu', 'aloo', 'tomato', 'chicken', 'murgi', 'beef', 'mutton', 'khasi', 'meat',
        'mangsho', 'mangso', 'fish', 'mach', 'maach', 'ilish', 'rui', 'shrimp', 'chingri', 'chili', 'morich', 'begun',
        'brinjal', 'eggplant', 'mango', 'aam', 'apple', 'grape', 'date', 'khejur', 'muri', 'chira', 'gur', 'peanut', 'badam',
        'চাল', 'আটা', 'ময়দা', 'সুজি', 'চিনি', 'লবণ', 'ডাল', 'পেঁয়াজ', 'রসুন', 'আদা', 'আলু', 'টমেটো', 'মুরগি', 'মাংস',
        'মাছ', 'ইলিশ', 'চিংড়ি', 'মরিচ', 'বেগুন', 'আম', 'আপেল', 'খেজুর', 'মুড়ি', 'চিড়া', 'গুড়', 'বাদাম',
    ],
    volume: [
        'oil', 'tel', 'soyabin', 'soybean', 'sorisha', 'shorisha', 'milk', 'dudh', 'water', 'pani', 'juice', 'ghee', 'ghi',
        'vinegar', 'kerosene', 'petrol', 'octane', 'diesel', 'fuel',
        'তেল', 'দুধ', 'পানি', 'জুস', 'ঘি', 'পেট্রোল', 'অকটেন', 'ডিজেল', 'কেরোসিন',
    ],
    count: [
        'egg', 'dim', 'deem', 'bread', 'pauruti', 'ruti', 'banana', 'kola', 'coconut', 'narkel', 'soap', 'saban', 'shampoo',
        'toothpaste', 'biscuit', 'noodle', 'napa', 'pen', 'notebook', 'khata',
        'ডিম', 'রুটি', 'পাউরুটি', 'কলা', 'নারকেল', 'সাবান', 'বিস্কুট', 'কলম', 'খাতা',
    ],
    length: ['cloth', 'kapor', 'fabric', 'rope', 'cable', 'wire', 'pipe', 'কাপড়'],
};

const CLASS_BY_ITEM = new Map(Object.entries(ITEM_CLASSES).flatMap(([cls, names]) => names.map(n => [n, cls as UnitClass])));

/** The usual unit class of an item: hints (e.g. the user's own history) first, then built-ins by full name or last word. */
export function itemClassOf(name: string, hints?: Record<string, UnitClass>): UnitClass | undefined {
    const key = name.toLowerCase().trim();
    const last = key.split(/\s+/).pop() ?? key;
    return hints?.[key] ?? CLASS_BY_ITEM.get(key) ?? hints?.[last] ?? CLASS_BY_ITEM.get(last);
}

/** Whether `unit` is a sensible way to measure `name`. Unknown items accept any unit. */
function fits(name: string, unit: string, hints?: Record<string, UnitClass>): boolean {
    const unitClass = unitClassOf(unit);
    if (unitClass === 'package') return true;
    const itemClass = itemClassOf(name, hints);
    return !itemClass || !unitClass || itemClass === unitClass;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const UNIT_WORDS = [...Object.keys(KNOWN_UNITS), 'hali', 'হালি', 'dozen', 'ডজন', 'pair', 'pairs', 'জোড়া', 'poa', 'powa', 'পোয়া']
    .sort((a, b) => b.length - a.length)
    .map(escape)
    .join('|');
/** A quantity at the start of a piece: "5kg", "5 kg", ".5 ltr", "2 hali", "x12", "3". */
const LEADING_QTY = new RegExp(`^((?:x\\d+|\\d*\\.?\\d+(?:\\s*-?\\s*(?:${UNIT_WORDS})(?![\\p{L}\\p{M}]))?))\\s+(?=[\\p{L}\\d.])`, 'iu');

/**
 * Parses a comma-separated list of items, one item per piece. An item written without a quantity
 * gets qty 0. Mistyped commas are repaired: in "rice ,5kg bread 1" the piece "5kg bread 1" carries two
 * quantities, so the leading "5kg" moves back to "rice" (which has none and is bought by weight). When it
 * does not fit the previous item ("rice ,2l bread 1") it is dropped. "5kg rice" alone is a normal item.
 */
export function parseItemList(pieces: string[], hints?: Record<string, UnitClass>): ListedItem[] {
    const out: ListedItem[] = [];
    /** Items that were written without a quantity, so a stray one may still be theirs. */
    const missingQty = new Set<ListedItem>();

    const giveToPrevious = (strayText: string) => {
        const prev = out[out.length - 1];
        const stray = parseItemDetailed(strayText);
        if (!prev || !missingQty.has(prev) || !stray.hasQty || !fits(prev.name, stray.unit, hints)) return;
        prev.qty = stray.qty;
        prev.unit = stray.unit;
        prev.rawInput = `${prev.rawInput} ${strayText}`;
        missingQty.delete(prev);
    };

    for (const raw of pieces) {
        let text = raw.trim();
        if (!text) continue;

        const lead = text.match(LEADING_QTY);
        if (lead) {
            const rest = text.slice(lead[0].length).trim();
            if (parseItemDetailed(rest).hasQty) {
                giveToPrevious(lead[1]);
                text = rest;
            }
        }

        const parsed = parseItemDetailed(text);
        if (!parsed.name) {
            // A quantity on its own ("rice, 5kg, bread") belongs to the item before it.
            if (parsed.hasQty) giveToPrevious(text);
            continue;
        }

        const item: ListedItem = parsed.hasQty
            ? { name: parsed.name, qty: parsed.qty, unit: parsed.unit, rawInput: text }
            : { name: parsed.name, qty: 0, unit: 'pcs', rawInput: text };
        if (!parsed.hasQty) missingQty.add(item);
        out.push(item);
    }
    return out;
}

/**
 * Learns how the user measures each item from their saved items (which include their own corrections):
 * the unit class used most often per name. Items without a quantity and packaging units teach nothing.
 */
export function buildUnitHints(items: Array<Pick<ParsedItem, 'name' | 'qty' | 'unit'>>): Record<string, UnitClass> {
    const counts = new Map<string, Map<UnitClass, number>>();
    for (const item of items) {
        const name = item.name.toLowerCase().trim();
        const cls = unitClassOf(item.unit);
        if (!name || !(item.qty > 0) || !cls || cls === 'package') continue;
        const perClass = counts.get(name) ?? new Map<UnitClass, number>();
        perClass.set(cls, (perClass.get(cls) ?? 0) + 1);
        counts.set(name, perClass);
    }
    const hints: Record<string, UnitClass> = {};
    for (const [name, perClass] of counts) {
        hints[name] = [...perClass].sort((a, b) => b[1] - a[1])[0][0];
    }
    return hints;
}
