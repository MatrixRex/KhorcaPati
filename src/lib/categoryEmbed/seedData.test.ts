import { describe, it, expect } from 'vitest';
import { contentTokens, isNovelItem, prepareItemText, seedTokenSet } from './seedData';

describe('prepareItemText', () => {
    it('removes filler verbs and particles so the item itself is embedded', () => {
        expect(prepareItemText('salon e gelam')).toBe('salon');
        expect(prepareItemText('Shampoo  kinlam')).toBe('shampoo');
        expect(prepareItemText('শ্যাম্পু কিনলাম')).toBe('শ্যাম্পু');
        expect(prepareItemText('paid the wifi bill')).toBe('wifi bill');
    });

    it('keeps the original text when everything would be removed', () => {
        expect(prepareItemText('kinlam')).toBe('kinlam');
    });
});

describe('contentTokens', () => {
    it('drops short particles and filler verbs in all three scripts', () => {
        expect(contentTokens('cng te gelam')).toEqual(['cng']);
        expect(contentTokens('Pathao  TE office')).toEqual(['pathao', 'office']);
        expect(contentTokens('চটপটি খেলাম')).toEqual(['চটপটি']);
        expect(contentTokens('paid the wifi bill')).toEqual(['wifi', 'bill']);
    });
});

describe('isNovelItem', () => {
    const tokens = seedTokenSet([
        { text: 'pathao', category: 'Transport' },
        { text: 'chowmein', category: 'Food & Dining' },
        { text: 'চটপটি', category: 'Food & Dining' },
    ]);

    it('is novel when no content word appears in any seed', () => {
        expect(isNovelItem('momo', tokens)).toBe(true);
        expect(isNovelItem('fried rice khelam', tokens)).toBe(true);
    });

    it('is a variant when any content word is a seed word', () => {
        expect(isNovelItem('pathao te office', tokens)).toBe(false);
        expect(isNovelItem('চটপটি খেলাম', tokens)).toBe(false);
    });

    it('treats items made only of filler as variants, not novel', () => {
        expect(isNovelItem('kinlam', tokens)).toBe(false);
    });
});
