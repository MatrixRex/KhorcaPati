import { describe, it, expect } from 'vitest';
import { extractTransactionsWithRules, splitNoteIntoSegments } from './ruleParser';

const REF = '2026-10-04';
const parse = (note: string) => extractTransactionsWithRules(note, REF);
const amounts = (note: string) => parse(note).map(t => t.amount);

describe('splitNoteIntoSegments', () => {
    it('splits on new lines, semicolons, commas and sentence ends, keeping decimals and thousands', () => {
        expect(splitNoteIntoSegments('lunch 180\ncoffee 120; bus 40')).toEqual(['lunch 180', 'coffee 120', 'bus 40']);
        expect(splitNoteIntoSegments('egg 20 taka, fish 1,200 taka')).toEqual(['egg 20 taka', 'fish 1,200 taka']);
        expect(splitNoteIntoSegments('Netflix $9.99. uber 250')).toEqual(['Netflix $9.99', 'uber 250']);
        expect(splitNoteIntoSegments('চাল ৫ কেজি ৩৫০।ডাল ২৪০')).toEqual(['চাল 5 কেজি 350', 'ডাল 240']);
    });

    it('drops leading labels like "morning:"', () => {
        expect(splitNoteIntoSegments('morning: tea 20, breakfast 90')).toEqual(['tea 20', 'breakfast 90']);
    });

    it('splits on "and" only when both sides have their own amount', () => {
        expect(splitNoteIntoSegments('paid wifi bill 1050 and electricity 1800')).toEqual(['paid wifi bill 1050', 'electricity 1800']);
        expect(splitNoteIntoSegments('egg and fish 70 taka')).toEqual(['egg and fish 70 taka']);
        expect(splitNoteIntoSegments('cha 20 ar singara 30')).toEqual(['cha 20', 'singara 30']);
    });
});

describe('extractTransactionsWithRules', () => {
    it('extracts one transaction per priced segment with a clean title', () => {
        expect(parse('Uber 250')).toEqual([{ title: 'Uber', amount: 250, type: 'expense', date: REF }]);
        expect(amounts('lunch 180\ncoffee 120\nbus 40')).toEqual([180, 120, 40]);
        expect(parse('egg and fish 70 taka')).toMatchObject([{ title: 'egg and fish', amount: 70 }]);
    });

    it('reuses shared amount detection: arithmetic, shorthand, currency, Bangla digits', () => {
        expect(amounts('transport 10+20+10')).toEqual([40]);
        expect(amounts('new phone 18.5k')).toEqual([18500]);
        expect(amounts('Netflix $9.99')).toEqual([9.99]);
        expect(amounts('বাজার ৫০০ টাকা')).toEqual([500]);
    });

    it('finds amounts followed by verbs or other words', () => {
        expect(parse('bari bhara 15000 dilam')).toMatchObject([{ title: 'bari bhara', amount: 15000 }]);
        expect(parse('tuition fee 5000 for rahim')).toMatchObject([{ amount: 5000 }]);
        expect(parse('rafi ke 500 dhar dilam')).toMatchObject([{ amount: 500, type: 'expense' }]);
    });

    it('uses the total after "=" and keeps quantities out of the amount', () => {
        expect(parse('movie tickets 2x 400 = 800')).toMatchObject([{ amount: 800 }]);
        expect(parse('dim 2 hali 100')).toMatchObject([{ title: 'dim 2 hali', amount: 100 }]);
        expect(parse('soybean oil 2 ltr 380')).toMatchObject([{ amount: 380 }]);
    });

    it('resolves relative dates in English, Banglish and Bangla and removes them from the title', () => {
        expect(parse('yesterday dinner at kfc 650')).toMatchObject([{ title: 'dinner at kfc', date: '2026-10-03' }]);
        expect(parse('gotokal cha 20')).toMatchObject([{ date: '2026-10-03' }]);
        expect(parse('গতকাল চা নাস্তা ১২০')).toMatchObject([{ title: 'চা নাস্তা', date: '2026-10-03' }]);
        expect(parse('2 days ago pathao 180')).toMatchObject([{ title: 'pathao', date: '2026-10-02' }]);
        expect(parse('3 din age bazar 900')).toMatchObject([{ date: '2026-10-01' }]);
        expect(parse('aaj bazar 1200')).toMatchObject([{ title: 'bazar', date: REF }]);
    });

    it('detects income', () => {
        for (const note of ['got salary 45000', 'beton pelam 30000', 'বেতন পেলাম ৩৫০০০', 'daraz refund 1200', 'got freelance payment 12000']) {
            expect(parse(note)[0].type, note).toBe('income');
        }
        expect(parse('school fee 2000')[0].type).toBe('expense');
    });

    it('understands the "/=" and "/-" price suffix', () => {
        expect(parse('pathao 120/=')).toMatchObject([{ title: 'pathao', amount: 120 }]);
        expect(parse('bazar 1,250/-')).toMatchObject([{ amount: 1250 }]);
    });

    it('treats " + " between priced items as a separator, but keeps arithmetic', () => {
        expect(amounts('bus vara 30 + rickshaw 40')).toEqual([30, 40]);
        expect(amounts('transport 10 + 20 + 10')).toEqual([40]);
    });

    it('splits items written back to back without a separator', () => {
        expect(amounts('snacks 60 tea 20')).toEqual([60, 20]);
        expect(amounts('মাছ ৬০০ মাংস ৮০০')).toEqual([600, 800]);
        // Quantities and trailing words are not split points.
        expect(amounts('cinema 2 ticket 900')).toEqual([900]);
        expect(amounts('chal 10 kg 720')).toEqual([720]);
        expect(amounts('tuition fee 5000 for rahim')).toEqual([5000]);
    });

    it('reads "kal" as yesterday (notes record the past)', () => {
        expect(parse('kal raate biryani 380')).toMatchObject([{ date: '2026-10-03' }]);
        expect(parse('কাল বাজার ৫০০')).toMatchObject([{ date: '2026-10-03' }]);
    });

    it('ignores text without an amount', () => {
        expect(parse('remind me to pay rent')).toEqual([]);
        expect(parse('')).toEqual([]);
    });

    it('handles a long mixed note', () => {
        const txs = parse('morning: tea 20, breakfast 90. office uber 320. evening bazar - alu 2kg 80, piyaj 1kg 110. got freelance payment 12000');
        expect(txs.map(t => t.amount)).toEqual([20, 90, 320, 80, 110, 12000]);
        expect(txs[5].type).toBe('income');
    });
});

describe('grouped shopping lists', () => {
    const note = 'Soyabin oil 1l, sorisha oil 1l, peyaj 2kg, roshun 1kg, salt 1kg, suger .5kg 3185-2250\nRice 25kg 2250\nAbba medicine 270';

    it('turns priceless quantified pieces plus the priced one into a single transaction with items', () => {
        const result = parse(note);
        expect(result.map(t => t.amount)).toEqual([935, 2250, 270]);
        expect(result[0].items).toEqual([
            { name: 'soyabin oil', qty: 1, unit: 'L' },
            { name: 'sorisha oil', qty: 1, unit: 'L' },
            { name: 'peyaj', qty: 2, unit: 'kg' },
            { name: 'roshun', qty: 1, unit: 'kg' },
            { name: 'salt', qty: 1, unit: 'kg' },
            { name: 'suger', qty: 0.5, unit: 'kg' },
        ]);
        expect(result[0].title).toBe('soyabin oil, sorisha oil, peyaj, roshun, salt, suger');
        expect(result[1].items).toBeUndefined();
    });

    it('does not group priceless text without a quantity, or across lines', () => {
        expect(parse('went to market, bazar 500')).toMatchObject([{ title: 'bazar', amount: 500 }]);
        expect(parse('oil 1l\nrice 500').map(t => t.items)).toEqual([undefined]);
    });
});

describe('comma item lists in Smart Notes', () => {
    it('keeps priceless items without a quantity and repairs a misplaced comma', () => {
        const [tx] = parse('onion, oil 1l, rice ,5kg bread 1 500');
        expect(tx.amount).toBe(500);
        expect(tx.items).toEqual([
            { name: 'onion', qty: 0, unit: 'pcs' },
            { name: 'oil', qty: 1, unit: 'L' },
            { name: 'rice', qty: 5, unit: 'kg' },
            { name: 'bread', qty: 1, unit: 'pcs' },
        ]);
    });
});
