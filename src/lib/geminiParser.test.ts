import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseTransactionsWithGemini } from './geminiParser';

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
});
