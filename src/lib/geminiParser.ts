import { parseItemInput } from '@/parsers/itemParser';

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

const bengaliToEnglishDigits = (str: string): string => {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return str.replace(/[০-৯]/g, (d) => String(bnDigits.indexOf(d)));
};

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

export function cleanTransactionNoteAndAmount(input: {
    title?: string;
    note?: string;
    amount?: number;
}): CleanedTransactionData {
    const title = (input.title || '').trim();
    const note = (input.note || '').trim();
    let amount = typeof input.amount === 'number' && !isNaN(input.amount) && input.amount > 0 ? input.amount : 0;

    const cleanText = (rawStr: string): { text: string; detectedAmount: number | null } => {
        let text = bengaliToEnglishDigits(rawStr);
        let detectedAmount: number | null = null;

        // 1. Check for arithmetic expression: e.g. "10+20+10", "10 + 20 + 10", "50+30"
        // (Do NOT match item multipliers like "x24" or "24x")
        const arithRegex = /(?:^|\s)([\d.]+(?:\s*[-+*/]\s*[\d.]+)+)(?:\s*(?:tk|taka|৳|\$|bdt))?(?:\s|$)/i;
        const arithMatch = text.match(arithRegex);
        if (arithMatch) {
            const val = evaluateArithmeticExpression(arithMatch[1]);
            if (val !== null && val > 0) {
                detectedAmount = val;
                text = text.replace(arithMatch[0], ' ');
            }
        }

        // 2. Check for currency-prefixed or currency-suffixed price anywhere: e.g. "৳100", "$50", "100tk", "100 taka"
        const currencyPriceRegex = /(?:^|\s)(?:(?:tk|taka|৳|\$|bdt)\s*([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s*(?:tk|taka|৳|\$|bdt))(?:\s|$)/i;
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
        const trailingPriceRegex = /(?:^|\s)(?:(?:tk|taka|৳|\$|bdt)\s*)?([\d,]+(?:\.\d+)?)\s*(k|lakh|crore|tk|taka|৳|\$|bdt)?\s*$/i;
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
            const isUnitSuffix = /^\d+(?:kg|g|gm|gms|l|ml|lb|oz|pcs|pc|pack|packs|box|boxes|dozen)/i.test(matchedSubstring);

            if (!isXPrefix && !isXSuffix && !isUnitSuffix && !isNaN(val) && val > 0) {
                if (detectedAmount === null) {
                    detectedAmount = val;
                }
                text = text.slice(0, matchIndex) + text.slice(matchIndex + trailingMatch[0].length);
            }
        }

        // Clean up punctuation and whitespace: remove leading/trailing dashes, colons, commas, extra spaces
        text = text.replace(/^[\s\-:,]+|[\s\-:,]+$/g, '').replace(/\s+/g, ' ').trim();

        return { text, detectedAmount };
    };

    const cleanedNoteResult = cleanText(note);
    const cleanedTitleResult = cleanText(title);

    if (cleanedNoteResult.detectedAmount !== null && (amount <= 0.01 || cleanedNoteResult.detectedAmount !== amount)) {
        amount = cleanedNoteResult.detectedAmount;
    } else if (cleanedTitleResult.detectedAmount !== null && (amount <= 0.01 || cleanedTitleResult.detectedAmount !== amount)) {
        amount = cleanedTitleResult.detectedAmount;
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

export interface GeminiParseOptions {
    noteText: string;
    categories: Array<{ id?: number; name: string }>;
    categoryPreferences?: Record<string, string>;
    historyExamples?: Array<{ item: string; category: string }>;
    referenceDate?: string; // YYYY-MM-DD
    apiKey: string;
    model?: string;
}

export async function parseTransactionsWithGemini(options: GeminiParseOptions): Promise<ParsedGeminiTransaction[]> {
    const {
        noteText,
        categories,
        categoryPreferences = {},
        historyExamples = [],
        referenceDate = new Date().toISOString().split('T')[0],
        apiKey,
        model = 'gemini-flash-lite-latest'
    } = options;

    if (!apiKey || !apiKey.trim()) {
        throw new Error('Please configure your Google Gemini API key in Settings or the prompt above.');
    }

    if (!noteText || !noteText.trim()) {
        return [];
    }

    const categoryNames = categories.map(c => c.name.trim()).filter(Boolean);
    const nonSystemCategories = categoryNames.filter(name => !['Unlisted', 'Lent', 'Borrowed'].includes(name));

    const userPrefsList: Array<{ item: string; category: string }> = [];

    if (categoryPreferences) {
        for (const [item, cat] of Object.entries(categoryPreferences)) {
            if (item && cat && cat !== 'Unlisted') {
                userPrefsList.push({ item, category: cat });
            }
        }
    }

    if (historyExamples) {
        for (const ex of historyExamples) {
            if (ex.item && ex.category && ex.category !== 'Unlisted' && !userPrefsList.some(p => p.item.toLowerCase() === ex.item.toLowerCase())) {
                userPrefsList.push({ item: ex.item.toLowerCase().trim(), category: ex.category.trim() });
            }
        }
    }

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

    const systemPrompt = `You are an expert financial categorization and extraction AI for the personal expense tracker app "KhorcaPati".
Your goal is to parse unstructured, conversational, or messy notes, receipts, and messages into clean, structured transactions, and accurately assign every transaction to an appropriate category.

CONTEXT:
- Reference Today's Date: ${referenceDate}
- User's Existing Categories: ${JSON.stringify(categoryNames)}
- User's Custom Categories: ${JSON.stringify(nonSystemCategories)}
${personalizationSection}

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
- "items": Extract item list if present with "name" (singular item name), "qty" (number), and "unit" (e.g. "kg", "L", "pcs", "dozen", "pack").
  * Example: "egg x24 120" -> items: [{ "name": "egg", "qty": 24, "unit": "pcs" }]. Otherwise empty array [].

SPLITTING VS GROUPING RULES (CRITICAL):
- If items have individual prices (e.g., "egg 20 taka, fish 50 taka"), you MUST create a SEPARATE transaction record for each item (one transaction for egg with amount 20, one for fish with amount 50).
- If multiple items are grouped together with a single total price (e.g., "egg and fish 70 taka"), create a SINGLE transaction record containing all those items in the "items" array, with the "amount" set to the total price (70).

Return ONLY valid JSON adhering to the specified schema.`;

    const requestPayload = {
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        text: `Extract all financial transactions from this note:\n\n"""\n${noteText}\n"""`
                    }
                ]
            }
        ],
        systemInstruction: {
            parts: [
                {
                    text: systemPrompt
                }
            ]
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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestPayload)
        });
    } catch (err: any) {
        throw new Error(`Network error contacting Gemini API: ${err?.message || 'Check your internet connection.'}`);
    }

    if (!response.ok) {
        let errorData: any = {};
        try {
            errorData = await response.json();
        } catch {
            // ignore
        }

        const msg = errorData?.error?.message || `API error (${response.status}: ${response.statusText})`;
        if (response.status === 400 && msg.toLowerCase().includes('api key')) {
            throw new Error('Invalid Gemini API Key. Please verify your key in Settings.');
        }
        if (response.status === 429) {
            throw new Error('Gemini API rate limit exceeded. Please wait a moment and try again.');
        }
        throw new Error(`Gemini API Error: ${msg}`);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
        throw new Error('No response received from Gemini model.');
    }

    let parsedResult: { transactions?: any[] };
    try {
        parsedResult = JSON.parse(candidateText);
    } catch {
        throw new Error('Failed to parse Gemini output into structured transactions.');
    }

    const rawTransactions = Array.isArray(parsedResult?.transactions) ? parsedResult.transactions : [];

    return rawTransactions.map((tx: any, index: number) => {
        const rawAmount = Number(tx.amount) || 0;
        const txType: 'expense' | 'income' = tx.type === 'income' ? 'income' : 'expense';

        // Match category case-insensitively against user categories
        let matchedCategory = categoryNames.find(c => c.toLowerCase() === (tx.category || '').toLowerCase()) || tx.category || 'Unlisted';

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
                const prefItemLower = prefItem.toLowerCase();
                const isMatch = noteLower === prefItemLower ||
                    new RegExp(`(^|\\s)${prefItemLower}(\\s|$)`, 'i').test(noteLower);
                if (isMatch) {
                    const validCat = categoryNames.find(c => c.toLowerCase() === prefCat.toLowerCase());
                    if (validCat) {
                        matchedCategory = validCat;
                        break;
                    }
                }
            }
        }

        const rawItems = Array.isArray(tx.items) ? tx.items : [];
        let validItems: ExtractedItem[] = rawItems.map((item: any) => ({
            name: String(item.name || '').trim().toLowerCase(),
            qty: Number(item.qty) || 1,
            unit: String(item.unit || 'pcs').trim()
        })).filter((item: ExtractedItem) => item.name.length > 0);

        // Fallback: If no items were extracted by Gemini, but the cleaned note contains an item (e.g. egg x24), extract it
        if (validItems.length === 0) {
            const parsed = parseItemInput(cleaned.note);
            if (parsed.name && (cleaned.note.toLowerCase().includes('x') || parsed.qty > 1)) {
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
