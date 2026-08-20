export interface ExtractedItem {
    name: string;
    qty: number;
    unit: string;
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
    referenceDate?: string; // YYYY-MM-DD
    apiKey: string;
    model?: string;
}

export async function parseTransactionsWithGemini(options: GeminiParseOptions): Promise<ParsedGeminiTransaction[]> {
    const {
        noteText,
        categories,
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

    const systemPrompt = `You are an expert financial categorization and extraction AI for the personal expense tracker app "KhorcaPati".
Your goal is to parse unstructured, conversational, or messy notes, receipts, and messages into clean, structured transactions, and accurately assign every transaction to an appropriate category.

CONTEXT:
- Reference Today's Date: ${referenceDate}
- User's Existing Categories: ${JSON.stringify(categoryNames)}
- User's Custom Categories: ${JSON.stringify(nonSystemCategories)}

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
- "title": Clean, concise description of the purpose or merchant (e.g., "Lunch at Sultan's Dine", "Uber to Office", "DESCO Electricity Bill", "Freelance Web Design").
- "amount": Positive number for the total money amount. Parse currency symbols (৳, $, Tk, BDT, INR, EUR, £), shorthand (1.5k -> 1500, 20k -> 20000, 1 lakh -> 100000), word numbers, and Bengali numerals (০-৯) accurately.
- "type": "expense" for money spent/paid/bought/lost. "income" for money received/earned/salary/cashback/refund.
- "date": ISO format (YYYY-MM-DD). Resolve relative dates ("yesterday", "last Sunday", "3 days ago", "15 Aug") against ${referenceDate}. If not mentioned, use ${referenceDate}.
- "note": Original context, details, or merchant name.
- "itemAutoTrack": Set to true if physical grocery, shopping, or supply items are listed.
- "items": Extract item list if present with "name" (singular item name), "qty" (number), and "unit" (e.g. "kg", "L", "pcs", "dozen", "pack"). Otherwise empty array [].

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
    } catch (parseErr) {
        throw new Error('Failed to parse Gemini output into structured transactions.');
    }

    const rawTransactions = Array.isArray(parsedResult?.transactions) ? parsedResult.transactions : [];

    return rawTransactions.map((tx: any, index: number) => {
        const rawAmount = Number(tx.amount) || 0;
        const safeAmount = Math.max(0.01, Math.round(rawAmount * 100) / 100);
        const txType: 'expense' | 'income' = tx.type === 'income' ? 'income' : 'expense';

        // Match category case-insensitively against user categories
        const matchedCategory = categoryNames.find(c => c.toLowerCase() === (tx.category || '').toLowerCase()) || tx.category || 'Unlisted';

        const safeDate = typeof tx.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tx.date) ? tx.date : referenceDate;

        const rawItems = Array.isArray(tx.items) ? tx.items : [];
        const validItems: ExtractedItem[] = rawItems.map((item: any) => ({
            name: String(item.name || '').trim().toLowerCase(),
            qty: Number(item.qty) || 1,
            unit: String(item.unit || 'pcs').trim()
        })).filter((item: ExtractedItem) => item.name.length > 0);

        return {
            id: `gemini-tx-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
            title: String(tx.title || 'Transaction').trim(),
            amount: safeAmount,
            type: txType,
            category: matchedCategory,
            date: safeDate,
            note: String(tx.note || '').trim(),
            itemAutoTrack: Boolean(tx.itemAutoTrack || validItems.length > 0),
            items: validItems,
            selected: true
        };
    });
}
