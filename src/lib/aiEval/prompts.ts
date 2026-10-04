import { buildSystemPrompt, buildUserMessage, type ParseContext } from '@/lib/geminiParser';

export type PromptVariant = 'full' | 'compact';

export interface PromptOptions {
    variant: PromptVariant;
    /** Restrict `category` to the user's category names via the JSON schema. */
    constrainCategories: boolean;
}

/**
 * Short prompt for small on-device models: prompt length dominates latency on phones
 * (every token must be prefilled), so this keeps only the rules that change outcomes.
 */
export function buildCompactSystemPrompt(ctx: ParseContext): string {
    const { categoryNames, userPrefsList, referenceDate } = ctx;
    const prefs = userPrefsList.length > 0
        ? `\nUser's past choices (follow them for the same or similar items):\n${userPrefsList.slice(0, 15).map(p => `"${p.item}" -> "${p.category}"`).join('\n')}\n`
        : '';

    return `Extract money transactions from a personal finance note written in English, Bangla or Banglish. Today is ${referenceDate}.

Categories (use one exactly): ${categoryNames.map(c => `"${c}"`).join(', ')}
${prefs}
Rules:
- One transaction per separately priced item. Items sharing one total price form one transaction.
- amount: positive number. Add up arithmetic (10+20+10 = 40). 1.5k = 1500. Bangla digits ০-৯ mean 0-9.
- type: "income" for salary, beton, refund or payment received; otherwise "expense".
- date: YYYY-MM-DD. Resolve yesterday/gotokal/"2 days ago" from today; default is today.
- title: short item or purpose, no price.
- items: goods with qty and unit (kg, g, L, ml, pcs, bottle, pack, strip). hali = 4 pcs, dozen = 12 pcs. Otherwise [].
- If the note has no money amount, return {"transactions": []}.
Hints: bazar, dim, mach, sobji = groceries. rickshaw, cng, pathao, vara = transport. bari bhara, wifi, current bill, flexiload = bills. cha, nasta, khabar = food. osudh, daktar = health.

Example for "cha 20, alu 2kg 80":
{"transactions":[{"title":"Cha","amount":20,"type":"expense","category":"Food & Dining","date":"${referenceDate}","items":[]},{"title":"Alu","amount":80,"type":"expense","category":"Groceries","date":"${referenceDate}","items":[{"name":"alu","qty":2,"unit":"kg"}]}]}

Reply with JSON only.`;
}

/** Standard JSON Schema for the reply. Engines with constrained decoding enforce it token by token. */
export function buildTransactionJsonSchema(categoryNames?: string[]): object {
    return {
        type: 'object',
        properties: {
            transactions: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        amount: { type: 'number' },
                        type: { type: 'string', enum: ['expense', 'income'] },
                        category: categoryNames && categoryNames.length > 0
                            ? { type: 'string', enum: categoryNames }
                            : { type: 'string' },
                        date: { type: 'string' },
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    qty: { type: 'number' },
                                    unit: { type: 'string' },
                                },
                                required: ['name', 'qty', 'unit'],
                            },
                        },
                    },
                    required: ['title', 'amount', 'type', 'category', 'date', 'items'],
                },
            },
        },
        required: ['transactions'],
    };
}

export function buildPrompt(ctx: ParseContext, note: string, options: PromptOptions) {
    return {
        systemPrompt: options.variant === 'full' ? buildSystemPrompt(ctx) : buildCompactSystemPrompt(ctx),
        userMessage: buildUserMessage(note),
        jsonSchema: buildTransactionJsonSchema(options.constrainCategories ? ctx.categoryNames : undefined),
    };
}
