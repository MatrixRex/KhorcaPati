import nlp from 'compromise';
// @ts-expect-error - compromise-numbers doesn't export types correctly in some environments
import nlpNumbers from 'compromise-numbers';

// Extend compromise with numbers plugin
nlp.plugin(nlpNumbers);

export interface ParsedItem {
    name: string;
    qty: number;
    unit: string;
}

export const bengaliToEnglishDigits = (str: string): string => {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return str.replace(/[০-৯]/g, (d) => String(bnDigits.indexOf(d)));
};

export const KNOWN_UNITS: Record<string, string> = {
    // Volume
    l: 'L', litre: 'L', litres: 'L', liters: 'L', liter: 'L',
    ltr: 'L', ltrs: 'L', lt: 'L', litter: 'L', litters: 'L',
    'লিটার': 'L', 'লি': 'L', 'লিঃ': 'L',
    ml: 'ml', millilitre: 'ml', millilitres: 'ml', milliliters: 'ml', milliliter: 'ml', milli: 'ml',
    'মিলি': 'ml', 'মিঃলিঃ': 'ml',
    cl: 'cl', dl: 'dl',
    gal: 'gal', gallon: 'gal', gallons: 'gal',
    qt: 'qt', quart: 'qt', quarts: 'qt',
    pt: 'pt', pint: 'pt', pints: 'pt',
    cup: 'cup', cups: 'cup',
    tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
    tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
    'fl oz': 'fl oz', 'fl-oz': 'fl oz', 'fluid ounce': 'fl oz', 'fluid ounces': 'fl oz',

    // Weight
    kg: 'kg', kgs: 'kg', kilogram: 'kg', kilograms: 'kg', kilo: 'kg', kilos: 'kg',
    'কেজি': 'kg', 'কেঃজিঃ': 'kg',
    g: 'g', gram: 'g', grams: 'g', gm: 'g', gms: 'g',
    'গ্রাম': 'g', 'গ্রা': 'g', 'গ্রাঃ': 'g',
    mg: 'mg', milligram: 'mg', milligrams: 'mg', 'মিঃগ্রা': 'mg',
    lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
    oz: 'oz', ounce: 'oz', ounces: 'oz',
    ton: 'ton', tons: 'ton', tonne: 'ton', tonnes: 'ton', 'টন': 'ton',
    // South Asian weights
    mon: 'mon', maund: 'mon', 'মন': 'mon',
    ser: 'ser', seer: 'ser', 'সের': 'ser',
    tola: 'tola', 'তোলা': 'tola',

    // Count, Packaging & Containers
    pcs: 'pcs', pc: 'pcs', piece: 'pcs', pieces: 'pcs', item: 'pcs', items: 'pcs',
    'পিস': 'pcs', 'টি': 'pcs', 'টা': 'pcs', 'খানা': 'pcs', 'খানি': 'pcs',
    pack: 'pack', packs: 'pack', packet: 'pack', packets: 'pack', pkt: 'pack', pkts: 'pack', pkg: 'pack', pkgs: 'pack', package: 'pack', packages: 'pack',
    'প্যাক': 'pack', 'প্যাকেট': 'pack',
    box: 'box', boxes: 'box', carton: 'box', cartons: 'box', ctn: 'box', crate: 'box', crates: 'box',
    'বক্স': 'box', 'কার্টুন': 'box',
    bag: 'bag', bags: 'bag', sack: 'bag', sacks: 'bag',
    'ব্যাগ': 'bag', 'বস্তা': 'bag',
    bottle: 'bottle', bottles: 'bottle', btl: 'bottle', btls: 'bottle',
    'বোতল': 'bottle',
    can: 'can', cans: 'can', tin: 'can', tins: 'can',
    'ক্যান': 'can', 'টিন': 'can',
    jar: 'jar', jars: 'jar',
    tube: 'tube', tubes: 'tube',
    roll: 'roll', rolls: 'roll',
    bundle: 'bundle', bundles: 'bundle', bunch: 'bundle', bunches: 'bundle',
    'আঁটি': 'bundle', 'মুঠা': 'bundle',
    strip: 'strip', strips: 'strip', 'পাতা': 'strip',
    tab: 'tab', tabs: 'tab', tablet: 'tab', tablets: 'tab', pill: 'tab', pills: 'tab',
    capsule: 'cap', capsules: 'cap', cap: 'cap', caps: 'cap',
    sachet: 'sachet', sachets: 'sachet',
    dozen: 'dozen',
    'half-dozen': 'half-dozen',

    // Length, Fabric & Area
    m: 'm', meter: 'm', meters: 'm', metre: 'm', metres: 'm', 'মিটার': 'm',
    cm: 'cm', centimeter: 'cm', centimeters: 'cm',
    mm: 'mm', millimeter: 'mm', millimeters: 'mm',
    km: 'km', kilometer: 'km', kilometers: 'km',
    ft: 'ft', foot: 'ft', feet: 'ft', 'ফুট': 'ft',
    in: 'in', inch: 'in', inches: 'in', 'ইঞ্চি': 'in',
    yd: 'yd', yard: 'yd', yards: 'yd',
    gaj: 'gaj', 'গজ': 'gaj', hat: 'hat', 'হাত': 'hat',
    sqft: 'sqft', sqm: 'sqm', sqyd: 'sqyd',
    acre: 'acre', acres: 'acre',
    katha: 'katha', 'কাঠা': 'katha', bigha: 'bigha', 'বিঘা': 'bigha',
    shotok: 'shotok', 'শতক': 'shotok', 'শতাংশ': 'shotok',
};

const SPECIAL_MULTIPLIERS: Record<string, number> = {
    half: 0.5,
    'হাফ': 0.5,
    'অর্ধেক': 0.5,
    quarter: 0.25,
    'কোয়ার্টার': 0.25,
    couple: 2,
    few: 3,
};

export function normalizeUnitAndQty(qty: number, unit: string): { qty: number; unit: string } {
    const raw = (unit || '').trim();
    if (!raw) return { qty: Number(qty) || 1, unit: 'pcs' };

    const clean = raw.toLowerCase().replace(/^[^\w\u0980-\u09FF]+|[^\w\u0980-\u09FF]+$/g, '');
    const mapped = KNOWN_UNITS[clean] || KNOWN_UNITS[raw.toLowerCase()] || KNOWN_UNITS[raw] || raw;

    let finalQty = Number(qty) || 1;
    let finalUnit = mapped;

    // Unit conversions
    if (finalUnit === 'g') {
        finalQty = Math.round((finalQty / 1000) * 1000) / 1000;
        finalUnit = 'kg';
    } else if (finalUnit === 'ml') {
        finalQty = Math.round((finalQty / 1000) * 1000) / 1000;
        finalUnit = 'L';
    } else if (finalUnit === 'cl') {
        finalQty = Math.round((finalQty / 100) * 1000) / 1000;
        finalUnit = 'L';
    } else if (finalUnit === 'dl') {
        finalQty = Math.round((finalQty / 10) * 1000) / 1000;
        finalUnit = 'L';
    } else if (finalUnit === 'mon') {
        finalQty = Math.round((finalQty * 40) * 100) / 100;
        finalUnit = 'kg';
    } else if (finalUnit === 'ser') {
        finalUnit = 'kg';
    }

    return { qty: finalQty, unit: finalUnit };
}

export function parseItemInput(input: string): ParsedItem {
    const normalizedInput = bengaliToEnglishDigits((input || '').trim());
    const doc = nlp(normalizedInput.toLowerCase());
    doc.numbers().toNumber();

    const textArray = doc.out('array');
    const tokens = textArray.length > 0 ? textArray[0].split(/\s+/) : [];

    if (tokens.length === 0) {
        return { name: '', qty: 1, unit: 'pcs' };
    }

    let qty = 1;
    let unit = 'pcs';
    const nameTokens: string[] = [];

    let foundQty = false;
    let foundUnit = false;
    let multiplier = 1;

    for (let i = 0; i < tokens.length; i++) {
        const rawToken = tokens[i];
        const token = rawToken.replace(/^[^\w\u0980-\u09FF]+|[^\w\u0980-\u09FF]+$/g, '');
        if (!token) continue;

        // Skip glue words
        if (token === 'of' || token === 'এর') continue;

        if (SPECIAL_MULTIPLIERS[token] !== undefined) {
            if (!foundQty) {
                multiplier = SPECIAL_MULTIPLIERS[token];
            }
            continue;
        }

        if (token === 'dozen' || token === 'ডজন') {
            const base = foundQty ? qty : 1;
            qty = base * 12 * multiplier;
            unit = 'pcs';
            foundQty = true;
            foundUnit = true;
            continue;
        }

        if (token === 'half-dozen' || token === 'হাফ-ডজন') {
            const base = foundQty ? qty : 1;
            qty = base * 6 * multiplier;
            unit = 'pcs';
            foundQty = true;
            foundUnit = true;
            continue;
        }

        if (token === 'hali' || token === 'হালি') {
            const base = foundQty ? qty : 1;
            qty = base * 4 * multiplier;
            unit = 'pcs';
            foundQty = true;
            foundUnit = true;
            continue;
        }

        if (token === 'pair' || token === 'pairs' || token === 'জোড়া' || token === 'জোড়া') {
            const base = foundQty ? qty : 1;
            qty = base * 2 * multiplier;
            unit = 'pcs';
            foundQty = true;
            foundUnit = true;
            continue;
        }

        if (token === 'powa' || token === 'poa' || token === 'পোয়া' || token === 'পোয়া') {
            const base = foundQty ? qty : 1;
            qty = base * 0.25 * multiplier;
            unit = 'kg';
            foundQty = true;
            foundUnit = true;
            continue;
        }

        // Is it an x-prefixed multiplier? (e.g. "x24", "x12")
        const xPrefixMatch = token.match(/^x(\d+)$/i);
        if (!foundQty && xPrefixMatch) {
            qty = parseFloat(xPrefixMatch[1]) * multiplier;
            unit = 'pcs';
            foundQty = true;
            foundUnit = true;
            continue;
        }

        // Is it a number or number+unit? (e.g. "2ltr", "2.5kg", "2-ltr", "24x")
        const numMatch = token.match(/^([\d.]+)-?([a-zA-Z\u0980-\u09FF]*)$/);
        if (!foundQty && numMatch) {
            const maybeNum = parseFloat(numMatch[1]);
            if (!isNaN(maybeNum)) {
                qty = maybeNum * multiplier;
                foundQty = true;

                const attachedUnit = numMatch[2].toLowerCase();
                if (attachedUnit) {
                    if (attachedUnit === 'x') {
                        unit = 'pcs';
                        foundUnit = true;
                    } else if (attachedUnit === 'dozen' || attachedUnit === 'ডজন') {
                        qty = maybeNum * 12 * multiplier;
                        unit = 'pcs';
                        foundUnit = true;
                    } else if (attachedUnit === 'hali' || attachedUnit === 'হালি') {
                        qty = maybeNum * 4 * multiplier;
                        unit = 'pcs';
                        foundUnit = true;
                    } else if (attachedUnit === 'pair' || attachedUnit === 'pairs' || attachedUnit === 'জোড়া' || attachedUnit === 'জোড়া') {
                        qty = maybeNum * 2 * multiplier;
                        unit = 'pcs';
                        foundUnit = true;
                    } else if (attachedUnit === 'powa' || attachedUnit === 'poa' || attachedUnit === 'পোয়া' || attachedUnit === 'পোয়া') {
                        qty = maybeNum * 0.25 * multiplier;
                        unit = 'kg';
                        foundUnit = true;
                    } else if (KNOWN_UNITS[attachedUnit]) {
                        unit = KNOWN_UNITS[attachedUnit];
                        foundUnit = true;
                    } else {
                        // Like "5apples" -> push "apples" to name
                        nameTokens.push(attachedUnit);
                    }
                }
                continue;
            }
        }

        // Is it a known standalone unit? (e.g., "kg", "liter", "ltr", "bottle")
        if (!foundUnit && KNOWN_UNITS[token]) {
            unit = KNOWN_UNITS[token];
            foundUnit = true;

            // If we got a unit without a qty but we had a multiplier (e.g. "half kg", "quarter liter")
            if (!foundQty && multiplier !== 1) {
                qty = multiplier;
                foundQty = true;
            }
            continue;
        }

        // Otherwise, it's part of the product name
        nameTokens.push(token);
    }

    // Handle fallback if we never found a number but we had a multiplier ("half milk")
    if (!foundQty && multiplier !== 1) {
        qty = multiplier;
    }

    let rawName = nameTokens.join(' ').trim();

    // Strip trailing standalone price / currency (e.g. "egg x24 120", "oil 2ltr 380 tk", "shampoo2 1")
    rawName = rawName.replace(/(?:\s|^)(?:tk|taka|৳|\$|bdt)?\s*[\d,]+(?:\.\d+)?\s*(?:tk|taka|৳|\$|bdt)?$/i, '').trim();
    // Strip trailing digits directly attached to word (e.g. 'shampoo2' -> 'shampoo')
    rawName = rawName.replace(/\d+$/, '').trim();

    // Plural -> singular
    if (rawName) {
        const singularName = nlp(rawName).nouns().toSingular().all().text();
        if (singularName) {
            rawName = singularName;
        }
    }

    // Auto-convert smaller units to standard ones
    const normalized = normalizeUnitAndQty(qty, unit);

    return { name: rawName, qty: normalized.qty, unit: normalized.unit };
}
