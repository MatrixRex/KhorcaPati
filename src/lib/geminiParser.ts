import { parseItemInput, bengaliToEnglishDigits, normalizeUnitAndQty } from '@/parsers/itemParser';

export interface ExtractedItem {
    name: string;
    qty: number;
    unit: string;
}

export interface CleanedTransactionData {
    title: string;
    note: string;
    amount: number;
}

export class NetworkConnectionError extends Error {
    constructor(message: string = 'Network error contacting Gemini API. Check your internet connection.') {
        super(message);
        this.name = 'NetworkConnectionError';
    }
}

export function isNetworkConnectionError(err: unknown): boolean {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return true;
    }
    if (!err) return false;

    if (err instanceof NetworkConnectionError) {
        return true;
    }

    const msg = err instanceof Error ? err.message : String(err);
    const lower = msg.toLowerCase();

    // Explicitly exclude quota limits, bad requests, and authentication errors
    if (
        lower.includes('rate limit') ||
        lower.includes('quota') ||
        lower.includes('resource_exhausted') ||
        lower.includes('429') ||
        lower.includes('api key') ||
        lower.includes('unauthorized') ||
        lower.includes('permission denied') ||
        lower.includes('403') ||
        lower.includes('400')
    ) {
        return false;
    }

    // Include connection failures
    return (
        err instanceof TypeError ||
        lower.includes('failed to fetch') ||
        lower.includes('network error') ||
        lower.includes('networkerror') ||
        lower.includes('internet connection') ||
        lower.includes('econnrefused') ||
        lower.includes('enotfound') ||
        lower.includes('net::err_') ||
        lower.includes('offline') ||
        lower.includes('aborterror')
    );
}


function evaluateArithmeticExpression(expr: string): number | null {
    const sanitized = expr.replace(/\s+/g, '');
    if (!/^[\d.]+(?:[-+*/][\d.]+)+$/.test(sanitized)) {
        return null;
    }

    const tokens = sanitized.match(/([\d.]+|[-+*/])/g);
    if (!tokens || tokens.length < 3) return null;

    const values: number[] = [];
    const ops: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token === '*' || token === '/') {
            const prev = values.pop();
            const next = parseFloat(tokens[++i]);
            if (prev === undefined || isNaN(next)) return null;
            values.push(token === '*' ? prev * next : (next !== 0 ? prev / next : prev));
        } else if (token === '+' || token === '-') {
            ops.push(token);
        } else {
            const num = parseFloat(token);
            if (isNaN(num)) return null;
            values.push(num);
        }
    }

    let result = values[0];
    for (let i = 0; i < ops.length; i++) {
        const op = ops[i];
        const nextVal = values[i + 1];
        if (nextVal === undefined) return null;
        if (op === '+') result += nextVal;
        else if (op === '-') result -= nextVal;
    }

    return isNaN(result) ? null : Math.round(result * 100) / 100;
}

/**
 * Finds the money amount in free text (arithmetic, currency, k/lakh/crore shorthand, Bengali digits,
 * trailing price) and returns the text without it. Quantities like "5kg" or "x24" are not prices.
 */
export function extractAmountFromText(rawStr: string): { text: string; amount: number | null } {
    let text = bengaliToEnglishDigits(rawStr);
    let detectedAmount: number | null = null;

    // 1. Check for arithmetic expression: e.g. "10+20+10", "10 + 20 + 10", "50+30"
    // (Do NOT match item multipliers like "x24" or "24x")
    const arithRegex = /(?:^|\s)([\d.]+(?:\s*[-+*/]\s*[\d.]+)+)(?:\s*(?:tk|taka|টাকা|৳|\$|bdt))?(?:\s|$)/i;
    const arithMatch = text.match(arithRegex);
    if (arithMatch) {
        const val = evaluateArithmeticExpression(arithMatch[1]);
        if (val !== null && val > 0) {
            detectedAmount = val;
            text = text.replace(arithMatch[0], ' ');
        }
    }

    // 2. Check for currency-prefixed or currency-suffixed price anywhere: e.g. "৳100", "$50", "100tk", "100 taka"
    const currencyPriceRegex = /(?:^|\s)(?:(?:tk|taka|টাকা|৳|\$|bdt)\s*([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s*(?:tk|taka|টাকা|৳|\$|bdt))(?:\s|$)/i;
    const currMatch = text.match(currencyPriceRegex);
    if (currMatch) {
        const rawNum = (currMatch[1] || currMatch[2] || '').replace(/,/g, '');
        const val = parseFloat(rawNum);
        if (!isNaN(val) && val > 0) {
            if (detectedAmount === null) {
                detectedAmount = val;
            }
            text = text.replace(currMatch[0], ' ');
        }
    }

    // 3. Check for trailing standalone price: e.g. "chicken 100", "egg x24 120", "cng 150", "fan 1k"
    // Ensure it does NOT match "x24" (multiplier), "24x" (multiplier), or units like "2kg", "1L", "500g", "2pcs"
    const trailingPriceRegex = /(?:^|\s)(?:(?:tk|taka|টাকা|৳|\$|bdt)\s*)?([\d,]+(?:\.\d+)?)\s*(k|lakh|crore|tk|taka|টাকা|৳|\$|bdt)?\s*$/i;
    const trailingMatch = text.match(trailingPriceRegex);
    if (trailingMatch) {
        const rawNum = trailingMatch[1].replace(/,/g, '');
        let val = parseFloat(rawNum);
        const suffix = (trailingMatch[2] || '').toLowerCase();
        if (suffix === 'k') val *= 1000;
        else if (suffix === 'lakh') val *= 100000;
        else if (suffix === 'crore') val *= 10000000;

        const matchIndex = text.lastIndexOf(trailingMatch[0]);
        const matchedSubstring = trailingMatch[0].trim();

        const isXPrefix = /^[xX]\d+/i.test(matchedSubstring);
        const isXSuffix = /^\d+[xX]/i.test(matchedSubstring);
        const isUnitSuffix = /^\d+(?:kg|kgs|g|gm|gms|mg|l|ltr|ltrs|lt|liter|liters|litre|litres|litter|litters|ml|cl|dl|lb|lbs|oz|pcs|pc|piece|pieces|item|items|pack|packs|packet|packets|pkg|pkgs|box|boxes|carton|bag|bags|sack|sacks|bottle|bottles|can|cans|tin|strip|strips|tab|tabs|cap|caps|dozen|hali|pair|pairs|poa|powa|mon|gaj|meter|m|cm|ft)/i.test(matchedSubstring);

        if (!isXPrefix && !isXSuffix && !isUnitSuffix && !isNaN(val) && val > 0) {
            if (detectedAmount === null) {
                detectedAmount = val;
            }
            text = text.slice(0, matchIndex) + text.slice(matchIndex + trailingMatch[0].length);
        }
    }

    // Clean up punctuation and whitespace: remove leading/trailing dashes, colons, commas, extra spaces
    text = text.replace(/^[\s\-:,]+|[\s\-:,]+$/g, '').replace(/\s+/g, ' ').trim();

    return { text, amount: detectedAmount };
}

export function cleanTransactionNoteAndAmount(input: {
    title?: string;
    note?: string;
    amount?: number;
}): CleanedTransactionData {
    const title = (input.title || '').trim();
    const note = (input.note || '').trim();
    let amount = typeof input.amount === 'number' && !isNaN(input.amount) && input.amount > 0 ? input.amount : 0;


    const cleanedNoteResult = extractAmountFromText(note);
    const cleanedTitleResult = extractAmountFromText(title);

    if (cleanedNoteResult.amount !== null && (amount <= 0.01 || cleanedNoteResult.amount !== amount)) {
        amount = cleanedNoteResult.amount;
    } else if (cleanedTitleResult.amount !== null && (amount <= 0.01 || cleanedTitleResult.amount !== amount)) {
        amount = cleanedTitleResult.amount;
    }

    let finalNote = cleanedNoteResult.text;
    let finalTitle = cleanedTitleResult.text;

    if (!finalNote && finalTitle) finalNote = finalTitle;
    if (!finalTitle && finalNote) finalTitle = finalNote;

    if (!finalNote) finalNote = 'Transaction';
    if (!finalTitle) finalTitle = 'Transaction';

    // Capitalize title
    finalTitle = finalTitle.charAt(0).toUpperCase() + finalTitle.slice(1);

    return {
        title: finalTitle,
        note: finalNote,
        amount: Math.max(0.01, Math.round(amount * 100) / 100)
    };
}


export interface ParsedGeminiTransaction {
    id: string;
    title: string;
    amount: number;
    type: 'expense' | 'income';
    category: string;
    date: string; // YYYY-MM-DD
    note: string;
    itemAutoTrack: boolean;
    items: ExtractedItem[];
    selected: boolean;
}

import type { AIProviderConfig } from './aiProviders';

export interface GeminiParseOptions {
    noteText: string;
    categories: Array<{ id?: number; name: string }>;
    categoryPreferences?: Record<string, string>;
    deletedCategories?: string[];
    historyExamples?: Array<{ item: string; category: string }>;
    referenceDate?: string; // YYYY-MM-DD
    apiKey?: string;
    model?: string;
    providers?: AIProviderConfig[];
}

export const buildUserMessage = (noteText: string) =>
    `Extract all financial transactions from this note:\n\n"""\n${noteText}\n"""`;

async function callGeminiApi(apiKey: string, model: string, systemPrompt: string, userMessage: string): Promise<string> {
    const requestPayload = {
        contents: [
            {
                role: 'user',
                parts: [{ text: userMessage }]
            }
        ],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: 'OBJECT',
                properties: {
                    transactions: {
                        type: 'ARRAY',
                        items: {
                            type: 'OBJECT',
                            properties: {
                                title: { type: 'STRING' },
                                amount: { type: 'NUMBER' },
                                type: { type: 'STRING', enum: ['expense', 'income'] },
                                category: { type: 'STRING' },
                                date: { type: 'STRING' },
                                note: { type: 'STRING' },
                                itemAutoTrack: { type: 'BOOLEAN' },
                                items: {
                                    type: 'ARRAY',
                                    items: {
                                        type: 'OBJECT',
                                        properties: {
                                            name: { type: 'STRING' },
                                            qty: { type: 'NUMBER' },
                                            unit: { type: 'STRING' }
                                        },
                                        required: ['name', 'qty', 'unit']
                                    }
                                }
                            },
                            required: ['title', 'amount', 'type', 'category', 'date']
                        }
                    }
                },
                required: ['transactions']
            }
        }
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
    let response: Response;
    try {
        response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload)
        });
    } catch (err: any) {
        throw new NetworkConnectionError(`Network error contacting Gemini API: ${err?.message || 'Check your internet connection.'}`);
    }

    if (!response.ok) {
        let errorData: any = {};
        try { errorData = await response.json(); } catch { }
        const msg = errorData?.error?.message || `API error (${response.status}: ${response.statusText})`;
        if (response.status === 400 && msg.toLowerCase().includes('api key')) {
            throw new Error('Invalid Gemini API Key. Please verify your key in Settings.');
        }
        if (response.status === 429) {
            throw new Error('Gemini API rate limit exceeded.');
        }
        throw new Error(`Gemini API Error: ${msg}`);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
        throw new Error('No response received from Gemini model.');
    }
    return candidateText;
}

async function callOpenAiCompatibleApi(provider: AIProviderConfig, systemPrompt: string, userMessage: string): Promise<string> {
    let endpoint = '';
    if (provider.type === 'groq') {
        endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    } else if (provider.type === 'openrouter') {
        endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    } else if (provider.baseUrl) {
        endpoint = provider.baseUrl.replace(/\/$/, '') + '/chat/completions';
    } else {
        endpoint = 'http://localhost:11434/v1/chat/completions';
    }

    const payload = {
        model: provider.model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
    };

    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };
    if (provider.apiKey) {
        headers['Authorization'] = `Bearer ${provider.apiKey.trim()}`;
    }
    if (provider.type === 'openrouter') {
        headers['HTTP-Referer'] = 'https://github.com/MatrixRex/KhorcaPati';
        headers['X-Title'] = 'KhorcaPati';
    }

    let res: Response;
    try {
        res = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });
    } catch (err: any) {
        throw new NetworkConnectionError(`Network error contacting ${provider.name || provider.type}: ${err?.message || 'Check your internet connection.'}`);
    }

    if (!res.ok) {
        let errJson: any = {};
        try { errJson = await res.json(); } catch { }
        const errMsg = errJson?.error?.message || `API error (${res.status}: ${res.statusText})`;
        throw new Error(`${provider.name || provider.type} Error (${res.status}): ${errMsg}`);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error(`No content returned from ${provider.name || provider.type}`);
    }
    return content;
}

/** Sends one prompt to a configured cloud provider and returns its raw text reply. */
export function callAIProvider(provider: AIProviderConfig, systemPrompt: string, userMessage: string): Promise<string> {
    return provider.type === 'gemini'
        ? callGeminiApi(provider.apiKey, provider.model || 'gemini-flash-lite-latest', systemPrompt, userMessage)
        : callOpenAiCompatibleApi(provider, systemPrompt, userMessage);
}

/** Normalized parse inputs shared by prompt building and response post-processing. */
export interface ParseContext {
    categoryNames: string[];
    nonSystemCategories: string[];
    deletedCategories: string[];
    deletedNamesSet: Set<string>;
    categoryPreferences: Record<string, string>;
    userPrefsList: Array<{ item: string; category: string }>;
    referenceDate: string;
}

export type ParseContextInput = Pick<GeminiParseOptions, 'categories' | 'categoryPreferences' | 'deletedCategories' | 'historyExamples' | 'referenceDate'>;

export function buildParseContext(options: ParseContextInput): ParseContext {
    const {
        categories,
        categoryPreferences = {},
        deletedCategories = [],
        historyExamples = [],
        referenceDate = new Date().toISOString().split('T')[0],
    } = options;

    const categoryNames = categories.map(c => c.name.trim()).filter(Boolean);
    const nonSystemCategories = categoryNames.filter(name => !['Unlisted', 'Lent', 'Borrowed'].includes(name));

    const validCategoryNamesSet = new Set(categoryNames.map(c => c.toLowerCase().trim()));
    const deletedNamesSet = new Set(deletedCategories.map(d => d.toLowerCase().trim()));

    const userPrefsList: Array<{ item: string; category: string }> = [];

    if (categoryPreferences) {
        for (const [item, cat] of Object.entries(categoryPreferences)) {
            const normCat = (cat || '').trim().toLowerCase();
            if (item && cat && cat !== 'Unlisted' && validCategoryNamesSet.has(normCat) && !deletedNamesSet.has(normCat)) {
                userPrefsList.push({ item, category: cat });
            }
        }
    }

    if (historyExamples) {
        for (const ex of historyExamples) {
            const normCat = (ex.category || '').trim().toLowerCase();
            if (
                ex.item &&
                ex.category &&
                ex.category !== 'Unlisted' &&
                validCategoryNamesSet.has(normCat) &&
                !deletedNamesSet.has(normCat) &&
                !userPrefsList.some(p => p.item.toLowerCase() === ex.item.toLowerCase())
            ) {
                userPrefsList.push({ item: ex.item.toLowerCase().trim(), category: ex.category.trim() });
            }
        }
    }

    return { categoryNames, nonSystemCategories, deletedCategories, deletedNamesSet, categoryPreferences, userPrefsList, referenceDate };
}

export function buildSystemPrompt(ctx: ParseContext): string {
    const { categoryNames, nonSystemCategories, deletedCategories, userPrefsList, referenceDate } = ctx;

    const personalizationSection = userPrefsList.length > 0
        ? `\nUSER CATEGORIZATION PREFERENCES & HISTORICAL HABITS (CRITICAL PERSONALIZATION):
The user has established specific past categorization preferences and corrections:
${userPrefsList.slice(0, 30).map(p => `- "${p.item}" -> "${p.category}"`).join('\n')}

PERSONALIZATION & LEARNING RULES:
1. **Honor User Preferences Above Generic Defaults**:
   - If an item or keyword in the note matches an item the user previously categorized (e.g. user set "fan" -> "House"), you MUST assign it to that specific category ("House") rather than a generic category (like "Shopping").
2. **Semantic Generalization to Related Records**:
   - Apply the user's categorization logic to related or similar items of the same type/domain!
   - Example: If the user categorized "fan" to "House", then any electrical appliances, home fixtures, or household equipment (e.g. "ac", "air conditioner", "heater", "light bulb", "iron", "blender") should ALSO prioritize the "House" category instead of "Shopping", respecting the user's personal classification style.
   - Example: If the user categorized a specific grocery or store to a particular category, honor that style for equivalent transactions.
`
        : '';

    const deletedCategoriesSection = deletedCategories.length > 0
        ? `\nDELETED CATEGORIES (STRICT FORBIDDEN LIST):
The user has explicitly deleted these categories: ${JSON.stringify(deletedCategories)}.
Under NO circumstances should you assign transactions to any of these deleted categories!
Instead, map to the closest matching category from "User's Existing Categories", or use "Unlisted".\n`
        : '';

    return `You are an expert financial categorization and extraction AI for the personal expense tracker app "KhorcaPati".
Your goal is to parse unstructured, conversational, or messy notes, receipts, and messages into clean, structured transactions, and accurately assign every transaction to an appropriate category.

CONTEXT:
- Reference Today's Date: ${referenceDate}
- User's Existing Categories: ${JSON.stringify(categoryNames)}
- User's Custom Categories: ${JSON.stringify(nonSystemCategories)}
${personalizationSection}${deletedCategoriesSection}

CATEGORIZATION RULES (CRITICAL):
1. **Prioritize Existing Categories**:
   - Check the "User's Existing Categories" list first. If any existing category fits the transaction (e.g. user has "Food" or "Dining" or "Khabaar" for a restaurant expense), you MUST use that exact category name.
2. **Assign Intelligent Standard Categories if no match exists**:
   - If the user's category list only has system categories (like "Unlisted", "Lent", "Borrowed") or does not contain a suitable category, DO NOT default to "Unlisted"!
   - Instead, assign the most appropriate standard category from common financial domains:
     * Food & Dining (restaurant, lunch, dinner, breakfast, cafe, coffee, tea, cha, snacks, takeout, KFC, pizza, burger)
     * Groceries (supermarket, bazar, market, vegetables, fruits, rice, oil, milk, eggs, meat, fish, spices, bread)
     * Transportation (uber, pathao, cng, rickshaw, taxi, bus, metro, train, fuel, petrol, octane, gas, parking, toll, travel)
     * Bills & Utilities (electricity, current bill, desco, dpdc, water, gas bill, internet, wifi, broadband, mobile recharge, flexiload, rent, house rent, maintenance)
     * Shopping (clothing, shoes, electronics, accessories, daraz, amazon, gadgets, cosmetics)
     * Salary / Income (salary, wages, freelance, client payment, bonus, cashback, refund, dividend, interest)
     * Healthcare (doctor, hospital, clinic, pharmacy, medicine, pills, dental, diagnostic)
     * Entertainment (movies, cinema, netflix, spotify, games, outings, parties)
     * Education (tuition, courses, books, school fees, exams)
     * Personal Care (haircut, salon, spa, gym, fitness)
3. **"Unlisted" is strictly a last resort**:
   - Only use "Unlisted" if the note is completely ambiguous with zero context (e.g. "Misc 100" or "unknown 50").
4. **South Asian / Bengali terminology understanding**:
   - "bazar" / "mach" / "dim" / "doodh" / "sobji" -> Groceries
   - "rickshaw" / "cng" / "uber" / "pathao" / "bus vara" -> Transportation
   - "bari bhara" / "current bill" / "desco" / "wifi" / "flexiload" -> Bills & Utilities
   - "cha" / "nashta" / "biryani" / "khabar" / "kfc" -> Food & Dining
   - "beton" / "salary" / "client pay" -> Salary / Income
   - "osudh" / "daktar" / "pharma" -> Healthcare

TRANSACTION FIELD EXTRACTION RULES:
- "title": Clean, concise description of the purpose, item, or merchant.
  * CRITICAL: NEVER include the monetary price or arithmetic calculation in "title"!
  * Example: "chicken 100" -> title: "Chicken" (ignore 100).
  * Example: "transport 10+20+10" -> title: "Transport" (do NOT include arithmetic in title).
  * Example: "egg x24 120" -> title: "Egg x24" (keep item count multiplier x24, ignore price 120).
- "amount": Positive number for the total money amount.
  * CRITICAL: If the price has arithmetic calculation (e.g. "10+20+10" or "50+30"), YOU MUST EVALUATE/SUM THE NUMBERS!
  * Example: "transport 10+20+10" -> amount: 40 (10 + 20 + 10 = 40).
  * Parse currency symbols (৳, $, Tk, BDT, INR, EUR, £), shorthand (1.5k -> 1500, 20k -> 20000, 1 lakh -> 100000), word numbers, and Bengali numerals (০-৯) accurately.
- "type": "expense" for money spent/paid/bought/lost. "income" for money received/earned/salary/cashback/refund.
- "date": ISO format (YYYY-MM-DD). Resolve relative dates ("yesterday", "last Sunday", "3 days ago", "15 Aug") against ${referenceDate}. If not mentioned, use ${referenceDate}.
- "note": Clean description or merchant name.
  * CRITICAL: NEVER include the monetary price or arithmetic calculation in "note"!
  * Example: "chicken 100" -> note: "chicken" (ignore 100).
  * Example: "transport 10+20+10" -> note: "transport" (do NOT include arithmetic in note).
  * Example: "egg x24 120" -> note: "egg x24" (keep multiplier x24, ignore 120).
- "itemAutoTrack": Set to true if physical grocery, shopping, or supply items are listed.
- "items": Extract item list if present with "name" (singular item name), "qty" (number), and "unit" (e.g. "kg", "L", "pcs", "bottle", "can", "pack", "bag", "box", "strip", "dozen").
  * CRITICAL UNIT RULES:
    - Volume: Always map volume units ("ltr", "ltrs", "liter", "liters", "litre", "litres", "litter", "litters", "l") to "L". For milliliters ("ml"), use "ml" or convert 1000ml to 1 L.
    - Weight: Always map weight units ("kg", "kgs", "kilogram", "kilo") to "kg". Map grams ("g", "gram", "gm") to "kg" (if >= 1000) or "g".
    - Containers & Packaging: Preserve specific packaging like "bottle", "can", "bag", "box", "strip", "pack".
    - Count Multipliers: "hali" = 4 pcs (e.g. 2 hali eggs -> qty: 8, unit: "pcs"), "pair" = 2 pcs, "dozen" = 12 pcs.
  * Examples:
    - "soybean oil 2 ltr 380" -> items: [{ "name": "soybean oil", "qty": 2, "unit": "L" }]
    - "milk 1ltr 90" -> items: [{ "name": "milk", "qty": 1, "unit": "L" }]
    - "egg x24 120" -> items: [{ "name": "egg", "qty": 24, "unit": "pcs" }]
    - "coke 2 bottles 100" -> items: [{ "name": "coke", "qty": 2, "unit": "bottle" }]
    - "napa 2 strips 40" -> items: [{ "name": "napa", "qty": 2, "unit": "strip" }]
  * Otherwise empty array [].

SPLITTING VS GROUPING RULES (CRITICAL):
- If items have individual prices (e.g., "egg 20 taka, fish 50 taka"), you MUST create a SEPARATE transaction record for each item (one transaction for egg with amount 20, one for fish with amount 50).
- If multiple items are grouped together with a single total price (e.g., "egg and fish 70 taka"), create a SINGLE transaction record containing all those items in the "items" array, with the "amount" set to the total price (70).

Return ONLY valid JSON adhering to the specified schema.`;
}

export async function parseTransactionsWithGemini(options: GeminiParseOptions): Promise<ParsedGeminiTransaction[]> {
    const { noteText, apiKey, model = 'gemini-flash-lite-latest' } = options;

    const hasProviders = options.providers && options.providers.some(p => p.enabled && p.apiKey && p.apiKey.trim());
    if (!hasProviders && (!apiKey || !apiKey.trim())) {
        throw new Error('Please configure your Google Gemini or AI provider API key in Settings.');
    }

    if (!noteText || !noteText.trim()) {
        return [];
    }

    const ctx = buildParseContext(options);
    const systemPrompt = buildSystemPrompt(ctx);

    // Build active candidate providers list
    const candidateProviders: AIProviderConfig[] = [];
    if (options.providers && options.providers.length > 0) {
        candidateProviders.push(...options.providers.filter(p => p.enabled && p.apiKey && p.apiKey.trim()));
    } else if (apiKey && apiKey.trim()) {
        candidateProviders.push({
            id: 'legacy-gemini',
            name: 'Google Gemini',
            type: 'gemini',
            apiKey: apiKey.trim(),
            model: model || 'gemini-flash-lite-latest',
            enabled: true
        });
    }

    if (candidateProviders.length === 0) {
        throw new Error('Please configure an AI provider with an API key in Settings.');
    }

    let candidateText = '';
    const failureErrors: string[] = [];

    for (const provider of candidateProviders) {
        try {
            candidateText = await callAIProvider(provider, systemPrompt, buildUserMessage(noteText));
            if (candidateText) {
                break; // Succeeded!
            }
        } catch (err: any) {
            console.warn(`[AI Parser] Provider ${provider.name || provider.type} failed:`, err);
            failureErrors.push(`${provider.name || provider.type}: ${err?.message || 'Failed'}`);
            // If it's a network error and there are no other providers, rethrow network error so offline queue triggers
            if (isNetworkConnectionError(err) && candidateProviders.length === 1) {
                throw err;
            }
        }
    }

    if (!candidateText) {
        // If all candidate errors were network errors, throw NetworkConnectionError
        if (failureErrors.length > 0 && failureErrors.every(e => e.toLowerCase().includes('network error') || e.toLowerCase().includes('connection'))) {
            throw new NetworkConnectionError(`Network error contacting AI providers: ${failureErrors.join('; ')}`);
        }
        throw new Error(`All configured AI providers failed. Errors: ${failureErrors.join(' | ')}`);
    }

    return postProcessAIResponse(candidateText, ctx);
}

/** Parses raw model JSON output and applies the shared cleanup and category rules, whichever engine produced it. */
export function postProcessAIResponse(candidateText: string, ctx: ParseContext): ParsedGeminiTransaction[] {
    const { categoryNames, deletedNamesSet, categoryPreferences, referenceDate } = ctx;

    let parsedResult: { transactions?: any[] };
    try {
        parsedResult = JSON.parse(candidateText);
    } catch {
        // Attempt to extract json block if wrapped in markdown
        const match = candidateText.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                parsedResult = JSON.parse(match[0]);
            } catch {
                throw new Error('Failed to parse AI output into structured transactions.');
            }
        } else {
            throw new Error('Failed to parse AI output into structured transactions.');
        }
    }

    const rawTransactions = Array.isArray(parsedResult?.transactions) ? parsedResult.transactions : [];

    return rawTransactions.map((tx: any, index: number) => {
        const rawAmount = Number(tx.amount) || 0;
        const txType: 'expense' | 'income' = tx.type === 'income' ? 'income' : 'expense';

        // Match category case-insensitively against user categories
        let matchedCategory = categoryNames.find(c => c.toLowerCase() === (tx.category || '').toLowerCase()) || tx.category || 'Unlisted';

        if (deletedNamesSet.has(matchedCategory.toLowerCase().trim())) {
            matchedCategory = 'Unlisted';
        }

        const safeDate = typeof tx.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tx.date) ? tx.date : referenceDate;

        const cleaned = cleanTransactionNoteAndAmount({
            title: String(tx.title || '').trim(),
            note: String(tx.note || '').trim(),
            amount: rawAmount
        });

        // High-confidence client-side user preference check
        if (categoryPreferences && Object.keys(categoryPreferences).length > 0) {
            const noteLower = cleaned.note.toLowerCase();
            for (const [prefItem, prefCat] of Object.entries(categoryPreferences)) {
                if (!prefItem || !prefCat) continue;
                const prefCatLower = prefCat.toLowerCase().trim();
                if (deletedNamesSet.has(prefCatLower)) continue;
                const prefItemLower = prefItem.toLowerCase();
                const isMatch = noteLower === prefItemLower ||
                    new RegExp(`(^|\\s)${prefItemLower}(\\s|$)`, 'i').test(noteLower);
                if (isMatch) {
                    const validCat = categoryNames.find(c => c.toLowerCase() === prefCatLower);
                    if (validCat) {
                        matchedCategory = validCat;
                        break;
                    }
                }
            }
        }

        if (deletedNamesSet.has(matchedCategory.toLowerCase().trim())) {
            matchedCategory = 'Unlisted';
        }

        const rawItems = Array.isArray(tx.items) ? tx.items : [];
        let validItems: ExtractedItem[] = rawItems.map((item: any) => {
            const rawQty = Number(item.qty) || 1;
            const rawUnit = String(item.unit || 'pcs');
            const { qty, unit } = normalizeUnitAndQty(rawQty, rawUnit);
            return {
                name: String(item.name || '').trim().toLowerCase(),
                qty,
                unit
            };
        }).filter((item: ExtractedItem) => item.name.length > 0);

        // Fallback: If no items were extracted by Gemini, but the cleaned note contains an item (e.g. egg x24, oil 1 ltr, rice 1kg), extract it
        if (validItems.length === 0) {
            const parsed = parseItemInput(cleaned.note);
            if (parsed.name && (cleaned.note.toLowerCase().includes('x') || parsed.qty > 1 || parsed.unit !== 'pcs')) {
                validItems = [parsed];
            }
        }

        return {
            id: `gemini-tx-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
            title: cleaned.title,
            amount: cleaned.amount,
            type: txType,
            category: matchedCategory,
            date: safeDate,
            note: cleaned.note,
            itemAutoTrack: Boolean(tx.itemAutoTrack || validItems.length > 0),
            items: validItems,
            selected: true
        };
    });
}
