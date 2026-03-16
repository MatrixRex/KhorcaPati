import nlp from 'compromise';
// @ts-expect-error - compromise-numbers doesn't export types correctly in some environments
import nlpNumbers from 'compromise-numbers';

// Extend compromise with numbers plugin
nlp.plugin(nlpNumbers);

interface ParsedItem {
    name: string;
    qty: number;
    unit: string;
}

const KNOWN_UNITS: Record<string, string> = {
    // Volume
    l: 'L', litre: 'L', liters: 'L', liter: 'L',
    ml: 'ml', millilitre: 'ml', milliliters: 'ml', milliliter: 'ml',
    'fl oz': 'fl oz', 'fluid ounce': 'fl oz', 'fluid ounces': 'fl oz',

    // Weight
    kg: 'kg', kilogram: 'kg', kilograms: 'kg',
    g: 'g', gram: 'g', grams: 'g', gm: 'g', gms: 'g',
    lb: 'lb', pound: 'lb', pounds: 'lb',
    oz: 'oz', ounce: 'oz', ounces: 'oz',

    // Count
    pcs: 'pcs', pc: 'pcs', piece: 'pcs', pieces: 'pcs',
    pack: 'pack', packs: 'pack', packet: 'pack', packets: 'pack',
    box: 'box', boxes: 'box',
    dozen: 'dozen',
    'half-dozen': 'half-dozen',

    // Area
    sqft: 'sqft', sqm: 'sqm',
};

const SPECIAL_MULTIPLIERS: Record<string, number> = {
    half: 0.5,
    quarter: 0.25,
    couple: 2,
    few: 3,
};

export function parseItemInput(input: string): ParsedItem {
    const doc = nlp(input.toLowerCase());
    doc.numbers().toNumber();

    const textArray = doc.out('array');
    const tokens = textArray.length > 0 ? textArray[0].split(/\s+/) : [];

    if (tokens.length === 0) {
        return { name: '', qty: 1, unit: 'pcs' };
    }

    let qty = 1;
    let unit = 'pcs';
    let nameTokens: string[] = [];

    let foundQty = false;
    let foundUnit = false;
    let multiplier = 1;

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        // Skip glue words
        if (token === 'of') continue;

        if (SPECIAL_MULTIPLIERS[token] !== undefined) {
            if (!foundQty) {
                multiplier = SPECIAL_MULTIPLIERS[token];
            }
            continue;
        }

        if (token === 'dozen') {
            qty = 12 * multiplier;
            unit = 'pcs';
            foundQty = true;
            foundUnit = true;
            continue;
        }

        if (token === 'half-dozen') {
            qty = 6 * multiplier;
            unit = 'pcs';
            foundQty = true;
            foundUnit = true;
            continue;
        }

        // Is it a number or number+unit?
        const numMatch = token.match(/^([\d.]+)([a-zA-Z]*)$/);
        if (!foundQty && numMatch) {
            const maybeNum = parseFloat(numMatch[1]);
            if (!isNaN(maybeNum)) {
                qty = maybeNum * multiplier;
                foundQty = true;

                const attachedUnit = numMatch[2];
                if (attachedUnit) {
                    if (KNOWN_UNITS[attachedUnit]) {
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

        // Is it a known standalone unit? (e.g., "kg", "liter")
        if (!foundUnit && KNOWN_UNITS[token]) {
            unit = KNOWN_UNITS[token];
            foundUnit = true;

            // If we got a unit without a qty but we had a multiplier (e.g. "half kg")
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

    // Strip trailing numbers attached to name (e.g. 'shampoo2' -> 'shampoo')
    rawName = rawName.replace(/\d+$/, '').trim();

    // Plural -> singular
    if (rawName) {
        const singularName = nlp(rawName).nouns().toSingular().all().text();
        if (singularName) {
            rawName = singularName;
        }
    }

    // Auto-convert smaller units to standard ones
    if (unit === 'g') {
        qty = qty / 1000;
        unit = 'kg';
    } else if (unit === 'ml') {
        qty = qty / 1000;
        unit = 'L';
    }

    return { name: rawName, qty, unit };
}
