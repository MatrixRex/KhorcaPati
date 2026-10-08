import { addDays, format, parseISO } from 'date-fns';
import { bengaliToEnglishDigits, parseItemDetailed, type ParsedItem } from '@/parsers/itemParser';
import { parseItemList, type UnitClass } from '@/parsers/itemListParser';
import { extractAmountFromText } from '@/lib/geminiParser';

/** A transaction found by the rules; the category is picked later by the on-device categorizer. */
export interface RuleTransaction {
    title: string;
    amount: number;
    type: 'expense' | 'income';
    date: string; // YYYY-MM-DD
    /** Only set when one total covers several quantified pieces. */
    items?: ParsedItem[];
}

const CONJUNCTION = /\s+(?:and|ar|aar|এবং|আর|&|\+)\s+/i;
const LEADING_LABEL = /^\s*[\p{L}][\p{L}\s]{0,15}:\s*/u;

/** Money received. Checked on the whole segment before any words are removed. */
const INCOME_PATTERNS = [
    /\b(?:salary|salery|beton|bonus|income|refund|cashback|received|recieved|earned|earning|pelam|paisi|paici|commission|interest|profit|dividend|remittance|stipend|scholarship)\b/i,
    /\b(?:freelanc\w*|client)\s+(?:payment|pay\w*|taka)\b/i,
    /\bgot\b.*\b(?:payment|paid|money|taka|salary)\b/i,
    /বেতন|বোনাস|পেলাম|পেয়েছি|আয়|রেমিট্যান্স|ক্যাশব্যাক/,
];

/** Words that only describe the action; removed so the amount and item stand out. */
const TRAILING_VERBS = /\s+(?:dilam|dilum|pelam|korlam|kinlam|khoroch|khoros|holo|দিলাম|পেলাম|করলাম|কিনলাম|খরচ|হলো)\s*$/i;
const LEADING_VERBS = /^(?:paid|spent|bought|got|gave)\s+/i;
const CURRENCY_WORDS = /(?:^|\s)(?:tk|taka|টাকা|৳|bdt)(?=\s|$)/gi;
const CURRENCY_TOKEN = /^(?:tk|taka|টাকা|৳|bdt)$/i;

/** Quantities are not prices: "2kg", "2 ltr", "x24", "2 hali", "2 ticket". */
const UNIT_AFTER_NUMBER = /^\s*(?:kg|kgs|g|gm|gms|mg|l|ltr|ltrs|lt|liter|liters|litre|litres|ml|pcs|pc|piece|pieces|pack|packs|packet|packets|box|boxes|bag|bags|bottle|bottles|can|cans|strip|strips|tab|tabs|dozen|hali|pair|pairs|x|kilo|ta|ti|jon|plate|plates|cup|cups|ticket|tickets|days?|din|কেজি|লিটার|পিস|হালি|ডজন|টা|টি|জন|দিন)(?=\s|$)/i;

/** Smallest number treated as a price when splitting run-on notes ("cinema 2 ticket 900" stays one item). */
const MIN_RUN_ON_PRICE = 10;

interface DateRule {
    pattern: RegExp;
    offset: (match: RegExpMatchArray) => number;
}

const DATE_RULES: DateRule[] = [
    { pattern: /(?:^|\s)(\d+)\s*(?:days?|din|dine)\s*(?:ago|age|aage)(?=\s|$)/i, offset: m => -Number(m[1]) },
    { pattern: /(?:^|\s)(\d+)\s*দিন\s*আগে(?=\s|$)/, offset: m => -Number(m[1]) },
    { pattern: /(?:^|\s)(?:day before yesterday|porshu|porsu|পরশু)(?=\s|$)/i, offset: () => -2 },
    // Plain "kal" can also mean tomorrow, but notes record money already spent.
    { pattern: /(?:^|\s)(?:yesterday|gotokal|gotkal|goto kal|kal|kalke|kaal|গতকাল|কাল|কালকে)(?=\s|$)/i, offset: () => -1 },
    { pattern: /(?:^|\s)(?:today|aaj|aj|আজ|আজকে)(?=\s|$)/i, offset: () => 0 },
];

const hasAmount = (text: string) => extractAmountFromText(text).amount !== null || lastStandaloneNumber(text) !== null;

/**
 * Splits a note into one piece of text per transaction. Commas inside numbers (1,200) and dots in
 * decimals (9.99) are kept; "and"/"ar" only splits when both sides carry their own amount.
 */
export function splitNoteIntoSegments(note: string): string[] {
    return bengaliToEnglishDigits(note)
        .replace(/(\d)\s*\/[=-]/g, '$1') // "120/=" and "120/-" are Bangladeshi price notation
        .split(/\n|;|।|,(?!\d)|(?<!\d),|\.(?!\d)/)
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => {
            const withoutLabel = s.replace(LEADING_LABEL, '');
            return withoutLabel && hasAmount(withoutLabel) ? withoutLabel : s;
        })
        .flatMap(s => {
            // Every part needs a word too, so "10 + 20" stays arithmetic.
            const parts = s.split(CONJUNCTION).map(p => p.trim());
            return parts.length > 1 && parts.every(p => hasAmount(p) && /\p{L}/u.test(p)) ? parts : [s];
        })
        .flatMap(splitRunOnPrices);
}

/**
 * "snacks 60 tea 20" → ["snacks 60", "tea 20"]: splits after a price that is followed by another
 * priced item. Quantities, small numbers and trailing words ("5000 for rahim") never split.
 */
function splitRunOnPrices(segment: string): string[] {
    const tokens = segment.split(/\s+/);
    const parts: string[] = [];
    let start = 0;
    for (let i = 0; i < tokens.length - 1; i++) {
        if (!/^\d[\d,]*(?:\.\d+)?$/.test(tokens[i])) continue;
        const rest = tokens.slice(i + 1).join(' ');
        const isSplitPoint =
            parseFloat(tokens[i].replace(/,/g, '')) >= MIN_RUN_ON_PRICE &&
            tokens.slice(start, i).some(t => /\p{L}/u.test(t)) &&
            /^\p{L}/u.test(tokens[i + 1]) &&
            !CURRENCY_TOKEN.test(tokens[i + 1]) &&
            !UNIT_AFTER_NUMBER.test(rest) &&
            hasAmount(rest);
        if (isSplitPoint) {
            parts.push(tokens.slice(start, i + 1).join(' '));
            start = i + 1;
        }
    }
    parts.push(tokens.slice(start).join(' '));
    return parts;
}

/** Last number that is not a quantity ("2kg", "x24") — for amounts followed by other words. */
function lastStandaloneNumber(text: string): { amount: number; text: string } | null {
    const matches = [...text.matchAll(/(?:^|\s)(\d[\d,]*(?:\.\d+)?)(?=\s|$)/g)];
    for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i];
        const end = m.index! + m[0].length;
        if (UNIT_AFTER_NUMBER.test(text.slice(end))) continue;
        const amount = parseFloat(m[1].replace(/,/g, ''));
        if (!(amount > 0)) continue;
        return { amount, text: (text.slice(0, m.index) + ' ' + text.slice(end)).trim() };
    }
    return null;
}

function findAmount(text: string): { amount: number; text: string } | null {
    // "2x 400 = 800": the total after "=" wins.
    const eq = text.match(/^(.*?)=\s*([\d,]+(?:\.\d+)?\s*k?)\s*$/i);
    if (eq) {
        const total = extractAmountFromText(eq[2]).amount;
        if (total !== null) return { amount: total, text: extractAmountFromText(eq[1]).text };
    }
    const found = extractAmountFromText(text);
    if (found.amount !== null) return { amount: found.amount, text: found.text };
    return lastStandaloneNumber(text);
}

function cleanTitle(text: string): string {
    let title = text
        .replace(CURRENCY_WORDS, ' ')
        .replace(LEADING_VERBS, '')
        .replace(/^[\s\-:,.]+|[\s\-:,.]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    // "beton pelam 30000": the verb only reaches the end once the amount is gone.
    while (TRAILING_VERBS.test(title)) title = title.replace(TRAILING_VERBS, '').trim();
    return title;
}

const hasQuantity = (text: string) => parseItemDetailed(text).hasQty;

/**
 * Turns a free-text note into transactions without any AI model. Priceless pieces in front of a priced
 * one on the same line ("onion, oil 1l, peyaj 2kg 935") are one shopping trip when any of them names a
 * quantity: one transaction with each comma-separated piece as an item.
 */
export function extractTransactionsWithRules(note: string, referenceDate: string, unitHints?: Record<string, UnitClass>): RuleTransaction[] {
    const reference = parseISO(referenceDate);
    const transactions: RuleTransaction[] = [];

    for (const line of note.split('\n')) {
        let pending: string[] = [];
        for (const segment of splitNoteIntoSegments(line)) {
            const tx = extractSegment(segment, reference);
            if (!tx) {
                pending.push(segment);
                continue;
            }
            if (pending.length > 0 && [...pending, tx.text].some(hasQuantity)) {
                const items = parseItemList([...pending, tx.text], unitHints).map(({ name, qty, unit }) => ({ name, qty, unit }));
                if (items.length > 0) {
                    tx.transaction.title = items.map(i => i.name).join(', ');
                    tx.transaction.items = items;
                }
            }
            pending = [];
            transactions.push(tx.transaction);
        }
    }

    return transactions;
}

function extractSegment(segment: string, reference: Date): { transaction: RuleTransaction; text: string } | null {
    let text = ` ${segment} `;

    let offset = 0;
    for (const rule of DATE_RULES) {
        const m = text.match(rule.pattern);
        if (m) {
            offset = rule.offset(m);
            text = text.replace(m[0], ' ');
            break;
        }
    }

    const type = INCOME_PATTERNS.some(p => p.test(segment)) ? 'income' : 'expense';

    text = text.trim();
    while (TRAILING_VERBS.test(text)) text = text.replace(TRAILING_VERBS, '');

    const found = findAmount(text);
    if (!found) return null;

    return {
        text: cleanTitle(found.text),
        transaction: {
            title: cleanTitle(found.text) || 'Transaction',
            amount: found.amount,
            type,
            date: format(addDays(reference, offset), 'yyyy-MM-dd'),
        },
    };
}
