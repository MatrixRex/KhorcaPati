import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseTransactionsWithGemini, cleanTransactionNoteAndAmount } from './geminiParser';

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
});
