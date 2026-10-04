import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseTransactionsWithGemini, cleanTransactionNoteAndAmount, extractAmountFromText } from './geminiParser';

describe('Gemini AI Transaction Parser', () => {
    const mockCategories = [
        { id: 1, name: 'Food & Dining' },
        { id: 2, name: 'Transport' },
        { id: 3, name: 'Groceries' },
        { id: 4, name: 'Bills' },
        { id: 5, name: 'Salary' },
        { id: 6, name: 'Unlisted' }
    ];

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('throws an error if apiKey is missing', async () => {
        await expect(parseTransactionsWithGemini({
            noteText: 'Uber 250',
            categories: mockCategories,
            apiKey: '',
        })).rejects.toThrow(/API key/i);
    });

    it('returns empty array when noteText is empty', async () => {
        const result = await parseTransactionsWithGemini({
            noteText: '   ',
            categories: mockCategories,
            apiKey: 'test-key',
        });
        expect(result).toEqual([]);
    });

    it('successfully calls Gemini API and formats transactions', async () => {
        const mockGeminiResponse = {
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: JSON.stringify({
                                    transactions: [
                                        {
                                            title: 'Uber to Office',
                                            amount: 250,
                                            type: 'expense',
                                            category: 'Transport',
                                            date: '2026-08-18',
                                            note: 'Ride to work',
                                            itemAutoTrack: false,
                                            items: []
                                        },
                                        {
                                            title: 'Freelance Design Payment',
                                            amount: 15000,
                                            type: 'income',
                                            category: 'Salary',
                                            date: '2026-08-19',
                                            note: 'Client project payment',
                                            itemAutoTrack: false,
                                            items: []
                                        },
                                        {
                                            title: 'Bazar / Groceries',
                                            amount: 1200,
                                            type: 'expense',
                                            category: 'Groceries',
                                            date: '2026-08-19',
                                            note: 'Weekly veggies and milk',
                                            itemAutoTrack: true,
                                            items: [
                                                { name: 'milk', qty: 1, unit: 'L' },
                                                { name: 'egg', qty: 12, unit: 'pcs' }
                                            ]
                                        }
                                    ]
                                })
                            }
                        ]
                    }
                }
            ]
        };

        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockGeminiResponse
        });
        globalThis.fetch = mockFetch as any;

        const results = await parseTransactionsWithGemini({
            noteText: 'Uber 250 yesterday\nReceived freelance 15000\nBazar 1200 - 1L milk, 12 eggs',
            categories: mockCategories,
            referenceDate: '2026-08-19',
            apiKey: 'valid-gemini-key',
            model: 'gemini-1.5-flash'
        });

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(results).toHaveLength(3);

        expect(results[0]).toMatchObject({
            title: 'Uber to Office',
            amount: 250,
            type: 'expense',
            category: 'Transport',
            date: '2026-08-18',
            selected: true
        });

        expect(results[1]).toMatchObject({
            title: 'Freelance Design Payment',
            amount: 15000,
            type: 'income',
            category: 'Salary',
            selected: true
        });

        expect(results[2]).toMatchObject({
            title: 'Bazar / Groceries',
            amount: 1200,
            type: 'expense',
            category: 'Groceries',
            itemAutoTrack: true,
            items: [
                { name: 'milk', qty: 1, unit: 'L' },
                { name: 'egg', qty: 12, unit: 'pcs' }
            ]
        });
    });

    it('handles API errors gracefully', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            json: async () => ({
                error: {
                    message: 'API key not valid. Please pass a valid API key.'
                }
            })
        });
        globalThis.fetch = mockFetch as any;

        await expect(parseTransactionsWithGemini({
            noteText: 'Coffee 150',
            categories: mockCategories,
            apiKey: 'bad-key'
        })).rejects.toThrow(/Invalid Gemini API Key/i);
    });

    describe('cleanTransactionNoteAndAmount', () => {
        it('strips standalone price from note and sets correct amount (e.g. "chicken 100")', () => {
            const result = cleanTransactionNoteAndAmount({
                title: 'chicken 100',
                note: 'chicken 100',
                amount: 100
            });
            expect(result.title).toBe('Chicken');
            expect(result.note).toBe('chicken');
            expect(result.amount).toBe(100);
        });

        it('evaluates arithmetic expressions in note and removes arithmetic from note (e.g. "transport 10+20+10")', () => {
            const result = cleanTransactionNoteAndAmount({
                title: 'transport 10+20+10',
                note: 'transport 10+20+10',
                amount: 0
            });
            expect(result.title).toBe('Transport');
            expect(result.note).toBe('transport');
            expect(result.amount).toBe(40);
        });

        it('preserves item count multipliers like x24 while stripping price (e.g. "egg x24 120")', () => {
            const result = cleanTransactionNoteAndAmount({
                title: 'egg x24 120',
                note: 'egg x24 120',
                amount: 120
            });
            expect(result.title).toBe('Egg x24');
            expect(result.note).toBe('egg x24');
            expect(result.amount).toBe(120);
        });

        it('preserves suffix multipliers like 24x while stripping price (e.g. "egg 24x 120")', () => {
            const result = cleanTransactionNoteAndAmount({
                title: 'egg 24x 120',
                note: 'egg 24x 120',
                amount: 120
            });
            expect(result.title).toBe('Egg 24x');
            expect(result.note).toBe('egg 24x');
            expect(result.amount).toBe(120);
        });

        it('preserves units like 2kg while stripping price (e.g. "chicken 2kg 450")', () => {
            const result = cleanTransactionNoteAndAmount({
                title: 'chicken 2kg 450',
                note: 'chicken 2kg 450',
                amount: 450
            });
            expect(result.title).toBe('Chicken 2kg');
            expect(result.note).toBe('chicken 2kg');
            expect(result.amount).toBe(450);
        });

        it('handles currency symbol and suffixes cleanly (e.g. "bus 20+15+10 tk")', () => {
            const result = cleanTransactionNoteAndAmount({
                title: 'bus 20+15+10 tk',
                note: 'bus 20+15+10 tk',
                amount: 0
            });
            expect(result.title).toBe('Bus');
            expect(result.note).toBe('bus');
            expect(result.amount).toBe(45);
        });

        it('converts Bengali numerals in arithmetic and prices', () => {
            const result = cleanTransactionNoteAndAmount({
                title: 'যাতায়াত ১০+২০+১০',
                note: 'যাতায়াত ১০+২০+১০',
                amount: 0
            });
            expect(result.amount).toBe(40);
            expect(result.note).toBe('যাতায়াত');
        });
    });

    it('cleans arithmetic, prices, and multipliers when formatting Gemini API responses', async () => {
        const mockGeminiResponse = {
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: JSON.stringify({
                                    transactions: [
                                        {
                                            title: 'chicken 100',
                                            note: 'chicken 100',
                                            amount: 100,
                                            type: 'expense',
                                            category: 'Groceries',
                                            date: '2026-08-19',
                                            itemAutoTrack: true,
                                            items: []
                                        },
                                        {
                                            title: 'transport 10+20+10',
                                            note: 'transport 10+20+10',
                                            amount: 0,
                                            type: 'expense',
                                            category: 'Transport',
                                            date: '2026-08-19',
                                            itemAutoTrack: false,
                                            items: []
                                        },
                                        {
                                            title: 'egg x24 120',
                                            note: 'egg x24 120',
                                            amount: 120,
                                            type: 'expense',
                                            category: 'Groceries',
                                            date: '2026-08-19',
                                            itemAutoTrack: true,
                                            items: []
                                        }
                                    ]
                                })
                            }
                        ]
                    }
                }
            ]
        };

        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockGeminiResponse
        });
        globalThis.fetch = mockFetch as any;

        const results = await parseTransactionsWithGemini({
            noteText: 'chicken 100\ntransport 10+20+10\negg x24 120',
            categories: mockCategories,
            referenceDate: '2026-08-19',
            apiKey: 'valid-gemini-key'
        });

        expect(results).toHaveLength(3);

        // chicken 100: note chicken, amount 100
        expect(results[0].title).toBe('Chicken');
        expect(results[0].note).toBe('chicken');
        expect(results[0].amount).toBe(100);

        // transport 10+20+10: note transport, amount 40
        expect(results[1].title).toBe('Transport');
        expect(results[1].note).toBe('transport');
        expect(results[1].amount).toBe(40);

        // egg x24 120: note egg x24, amount 120, items egg with qty 24
        expect(results[2].title).toBe('Egg x24');
        expect(results[2].note).toBe('egg x24');
        expect(results[2].amount).toBe(120);
        expect(results[2].items).toEqual([
            { name: 'egg', qty: 24, unit: 'pcs' }
        ]);
    });

    it('injects user category preferences and prioritizes learned category over generic category', async () => {
        const customCategories = [
            { id: 1, name: 'House' },
            { id: 2, name: 'Shopping' },
            { id: 3, name: 'Unlisted' }
        ];

        let capturedSystemPrompt = '';

        const mockFetch = vi.fn().mockImplementation(async (_url, options) => {
            const body = JSON.parse(options.body);
            capturedSystemPrompt = body.systemInstruction.parts[0].text;

            return {
                ok: true,
                json: async () => ({
                    candidates: [
                        {
                            content: {
                                parts: [
                                    {
                                        text: JSON.stringify({
                                            transactions: [
                                                {
                                                    title: 'fan 1k',
                                                    note: 'fan 1k',
                                                    amount: 1000,
                                                    type: 'expense',
                                                    // Suppose Gemini returned 'Shopping' initially
                                                    category: 'Shopping',
                                                    date: '2026-08-19'
                                                }
                                            ]
                                        })
                                    }
                                ]
                            }
                        }
                    ]
                })
            };
        });
        globalThis.fetch = mockFetch as any;

        const results = await parseTransactionsWithGemini({
            noteText: 'fan 1k',
            categories: customCategories,
            categoryPreferences: {
                fan: 'House'
            },
            historyExamples: [
                { item: 'light bulb', category: 'House' }
            ],
            referenceDate: '2026-08-19',
            apiKey: 'valid-gemini-key'
        });

        // Verify system prompt includes personalization instructions and examples
        expect(capturedSystemPrompt).toContain('USER CATEGORIZATION PREFERENCES & HISTORICAL HABITS');
        expect(capturedSystemPrompt).toContain('"fan" -> "House"');
        expect(capturedSystemPrompt).toContain('"light bulb" -> "House"');
        expect(capturedSystemPrompt).toContain('electrical appliances, home fixtures, or household equipment');

        // Verify that client-side preference match overrides generic category 'Shopping' to 'House'
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Fan');
        expect(results[0].note).toBe('fan');
        expect(results[0].amount).toBe(1000);
        expect(results[0].category).toBe('House');
    });

    it('canonicalizes item units returned by Gemini (ltr, liter, litter, bottles, cans)', async () => {
        const mockGeminiResponse = {
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: JSON.stringify({
                                    transactions: [
                                        {
                                            title: 'Soybean Oil 2ltr',
                                            amount: 380,
                                            type: 'expense',
                                            category: 'Groceries',
                                            date: '2026-08-19',
                                            note: 'Soybean oil 2ltr',
                                            itemAutoTrack: true,
                                            items: [
                                                { name: 'soybean oil', qty: 2, unit: 'ltr' },
                                                { name: 'milk', qty: 1, unit: 'litter' },
                                                { name: 'water', qty: 2.5, unit: 'liters' },
                                                { name: 'coke', qty: 2, unit: 'bottles' },
                                                { name: 'soda', qty: 3, unit: 'cans' },
                                                { name: 'potatoes', qty: 3, unit: 'kgs' }
                                            ]
                                        }
                                    ]
                                })
                            }
                        ]
                    }
                }
            ]
        };

        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockGeminiResponse
        });
        globalThis.fetch = mockFetch as any;

        const results = await parseTransactionsWithGemini({
            noteText: 'Soybean oil 2ltr 380 tk',
            categories: mockCategories,
            referenceDate: '2026-08-19',
            apiKey: 'valid-gemini-key'
        });

        expect(results).toHaveLength(1);
        expect(results[0].items).toEqual([
            { name: 'soybean oil', qty: 2, unit: 'L' },
            { name: 'milk', qty: 1, unit: 'L' },
            { name: 'water', qty: 2.5, unit: 'L' },
            { name: 'coke', qty: 2, unit: 'bottle' },
            { name: 'soda', qty: 3, unit: 'can' },
            { name: 'potatoes', qty: 3, unit: 'kg' }
        ]);
    });

    it('fallback extracts single-quantity volume and non-pcs items when Gemini returns empty items', async () => {
        const mockGeminiResponse = {
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: JSON.stringify({
                                    transactions: [
                                        {
                                            title: 'Oil 1 ltr',
                                            amount: 190,
                                            type: 'expense',
                                            category: 'Groceries',
                                            date: '2026-08-19',
                                            note: 'oil 1 ltr',
                                            itemAutoTrack: false,
                                            items: []
                                        }
                                    ]
                                })
                            }
                        ]
                    }
                }
            ]
        };

        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockGeminiResponse
        });
        globalThis.fetch = mockFetch as any;

        const results = await parseTransactionsWithGemini({
            noteText: 'oil 1 ltr 190',
            categories: mockCategories,
            referenceDate: '2026-08-19',
            apiKey: 'valid-gemini-key'
        });

        expect(results).toHaveLength(1);
        expect(results[0].items).toEqual([
            { name: 'oil', qty: 1, unit: 'L' }
        ]);
        expect(results[0].itemAutoTrack).toBe(true);
    });

    it('cleanTransactionNoteAndAmount preserves trailing numbers attached to unit suffixes', () => {
        const cleaned1 = cleanTransactionNoteAndAmount({ note: 'oil 2ltr 380', amount: 0 });
        expect(cleaned1.amount).toBe(380);
        expect(cleaned1.note).toBe('oil 2ltr');

        const cleaned2 = cleanTransactionNoteAndAmount({ note: 'coke 2bottles 100 tk', amount: 0 });
        expect(cleaned2.amount).toBe(100);
        expect(cleaned2.note).toBe('coke 2bottles');

        const cleaned3 = cleanTransactionNoteAndAmount({ note: 'napa 2strips 40', amount: 0 });
        expect(cleaned3.amount).toBe(40);
        expect(cleaned3.note).toBe('napa 2strips');
    });

    it('filters out deleted or non-existent categories from personalization prompt and includes forbidden section', async () => {
        let sentBody: any = null;
        const mockFetch = vi.fn().mockImplementation(async (_url, options) => {
            sentBody = JSON.parse(options.body);
            return {
                ok: true,
                json: async () => ({
                    candidates: [{
                        content: {
                            parts: [{
                                text: JSON.stringify({
                                    transactions: [{
                                        title: 'Burger',
                                        amount: 250,
                                        type: 'expense',
                                        category: 'Food & Dining',
                                        date: '2026-08-19',
                                        note: 'Burger'
                                    }]
                                })
                            }]
                        }
                    }]
                })
            };
        });
        globalThis.fetch = mockFetch as any;

        await parseTransactionsWithGemini({
            noteText: 'burger 250',
            categories: mockCategories,
            categoryPreferences: {
                burger: 'Fast Food', // Deleted category!
                pasta: 'Food & Dining' // Valid existing category
            },
            deletedCategories: ['Fast Food'],
            historyExamples: [
                { item: 'pizza', category: 'Fast Food' }, // Deleted!
                { item: 'tea', category: 'Food & Dining' } // Valid!
            ],
            apiKey: 'valid-key'
        });

        const systemPrompt = sentBody?.systemInstruction?.parts?.[0]?.text;
        expect(systemPrompt).toBeDefined();

        // Should include pasta -> Food & Dining and tea -> Food & Dining
        expect(systemPrompt).toContain('pasta');
        expect(systemPrompt).toContain('tea');

        // Should NOT include burger -> Fast Food or pizza -> Fast Food in preferences
        expect(systemPrompt).not.toContain('"burger" -> "Fast Food"');
        expect(systemPrompt).not.toContain('"pizza" -> "Fast Food"');

        // Should contain the strict forbidden section for deleted categories
        expect(systemPrompt).toContain('DELETED CATEGORIES (STRICT FORBIDDEN LIST)');
        expect(systemPrompt).toContain('Fast Food');
    });

    it('sanitizes returned category to Unlisted if Gemini attempts to return a deleted category', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                candidates: [{
                    content: {
                        parts: [{
                            text: JSON.stringify({
                                transactions: [{
                                    title: 'Game Subscription',
                                    amount: 500,
                                    type: 'expense',
                                    category: 'Gaming', // Deleted by user
                                    date: '2026-08-19',
                                    note: 'Game'
                                }]
                            })
                        }]
                    }
                }]
            })
        });
        globalThis.fetch = mockFetch as any;

        const results = await parseTransactionsWithGemini({
            noteText: 'game subscription 500',
            categories: mockCategories,
            deletedCategories: ['Gaming'],
            apiKey: 'valid-key'
        });

        expect(results).toHaveLength(1);
        expect(results[0].category).toBe('Unlisted');
    });

    describe('Multi-Provider Fallback Chain', () => {
        it('automatically falls back to secondary provider if primary provider fails with 429 or error', async () => {
            const mockFetch = vi.fn()
                // Call 1: Gemini rate limited (429)
                .mockResolvedValueOnce({
                    ok: false,
                    status: 429,
                    statusText: 'Too Many Requests',
                    json: async () => ({ error: { message: 'Quota exceeded' } })
                })
                // Call 2: Groq succeeds (200)
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        choices: [
                            {
                                message: {
                                    content: JSON.stringify({
                                        transactions: [
                                            {
                                                title: 'Cat Food',
                                                amount: 570,
                                                type: 'expense',
                                                category: 'Groceries',
                                                date: '2026-08-19',
                                                note: 'Cat food'
                                            }
                                        ]
                                    })
                                }
                            }
                        ]
                    })
                });
            globalThis.fetch = mockFetch as any;

            const results = await parseTransactionsWithGemini({
                noteText: 'Cat food 570',
                categories: mockCategories,
                providers: [
                    {
                        id: 'gemini-1',
                        name: 'Primary Gemini',
                        type: 'gemini',
                        apiKey: 'gemini-key',
                        model: 'gemini-2.0-flash',
                        enabled: true
                    },
                    {
                        id: 'groq-2',
                        name: 'Secondary Groq',
                        type: 'groq',
                        apiKey: 'groq-key',
                        model: 'openai/gpt-oss-20b',
                        enabled: true
                    }
                ]
            });

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(results).toHaveLength(1);
            expect(results[0].title).toBe('Cat Food');
            expect(results[0].amount).toBe(570);
        });

        it('throws comprehensive aggregated error if all configured providers fail', async () => {
            const mockFetch = vi.fn()
                .mockResolvedValueOnce({
                    ok: false,
                    status: 429,
                    statusText: 'Too Many Requests',
                    json: async () => ({ error: { message: 'Rate limit' } })
                })
                .mockResolvedValueOnce({
                    ok: false,
                    status: 401,
                    statusText: 'Unauthorized',
                    json: async () => ({ error: { message: 'Bad Key' } })
                });
            globalThis.fetch = mockFetch as any;

            await expect(parseTransactionsWithGemini({
                noteText: 'Uber 250',
                categories: mockCategories,
                providers: [
                    {
                        id: 'gemini-1',
                        name: 'Primary Gemini',
                        type: 'gemini',
                        apiKey: 'gemini-key',
                        model: 'gemini-2.0-flash',
                        enabled: true
                    },
                    {
                        id: 'groq-2',
                        name: 'Secondary Groq',
                        type: 'groq',
                        apiKey: 'groq-key',
                        model: 'openai/gpt-oss-20b',
                        enabled: true
                    }
                ]
            })).rejects.toThrow(/All configured AI providers failed/i);
        });
    });
});


describe('extractAmountFromText', () => {
    it('finds trailing, currency, shorthand and arithmetic amounts and removes them from the text', () => {
        expect(extractAmountFromText('chicken 100')).toEqual({ text: 'chicken', amount: 100 });
        expect(extractAmountFromText('Netflix $9.99')).toEqual({ text: 'Netflix', amount: 9.99 });
        expect(extractAmountFromText('new phone 18.5k')).toEqual({ text: 'new phone', amount: 18500 });
        expect(extractAmountFromText('transport 10+20+10')).toEqual({ text: 'transport', amount: 40 });
        expect(extractAmountFromText('বাজার ৫০০ টাকা').amount).toBe(500);
    });

    it('does not treat quantities or multipliers as prices', () => {
        expect(extractAmountFromText('egg x24 120')).toEqual({ text: 'egg x24', amount: 120 });
        expect(extractAmountFromText('rice 5kg')).toEqual({ text: 'rice 5kg', amount: null });
    });

    it('returns null when there is no amount', () => {
        expect(extractAmountFromText('remind me to pay rent')).toEqual({ text: 'remind me to pay rent', amount: null });
    });
});
