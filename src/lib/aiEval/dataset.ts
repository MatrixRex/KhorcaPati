import type { EvalCase } from './types';

/** Category list every eval case is parsed against. */
export const EVAL_CATEGORIES = [
    'Food & Dining',
    'Groceries',
    'Transport',
    'Bills & Utilities',
    'Shopping',
    'Healthcare',
    'Entertainment',
    'Education',
    'Personal Care',
    'Salary',
    'Unlisted',
    'Lent',
    'Borrowed',
] as const;

/** 2026-10-04 is a Sunday. */
const REF = '2026-10-04';
const YESTERDAY = '2026-10-03';

/**
 * Hand-labelled notes for comparing AI engines. Tags: language first
 * (en | banglish | bangla | mixed), then features being exercised.
 */
export const EVAL_CASES: EvalCase[] = [
    // ── English ────────────────────────────────────────────────────────────
    { id: 'en-simple', tags: ['en'], note: 'Uber 250', referenceDate: REF, expected: [
        { amount: 250, type: 'expense', category: 'Transport' },
    ] },
    { id: 'en-multiline', tags: ['en', 'multi'], note: 'lunch 180\ncoffee 120\nbus 40', referenceDate: REF, expected: [
        { amount: 180, type: 'expense', category: 'Food & Dining' },
        { amount: 120, type: 'expense', category: 'Food & Dining' },
        { amount: 40, type: 'expense', category: 'Transport' },
    ] },
    { id: 'en-salary', tags: ['en', 'income'], note: 'got salary 45000', referenceDate: REF, expected: [
        { amount: 45000, type: 'income', category: 'Salary' },
    ] },
    { id: 'en-arithmetic', tags: ['en', 'arithmetic'], note: 'transport 10+20+10', referenceDate: REF, expected: [
        { amount: 40, type: 'expense', category: 'Transport' },
    ] },
    { id: 'en-shorthand-k', tags: ['en', 'shorthand'], note: 'new phone 18.5k', referenceDate: REF, expected: [
        { amount: 18500, type: 'expense', category: 'Shopping' },
    ] },
    { id: 'en-yesterday', tags: ['en', 'date'], note: 'yesterday dinner at kfc 650', referenceDate: REF, expected: [
        { amount: 650, type: 'expense', category: 'Food & Dining', date: YESTERDAY },
    ] },
    { id: 'en-grouped', tags: ['en', 'grouping'], note: 'egg and fish 70 taka', referenceDate: REF, expected: [
        { amount: 70, type: 'expense', category: 'Groceries' },
    ] },
    { id: 'en-split', tags: ['en', 'multi'], note: 'egg 20 taka, fish 50 taka', referenceDate: REF, expected: [
        { amount: 20, type: 'expense', category: 'Groceries' },
        { amount: 50, type: 'expense', category: 'Groceries' },
    ] },
    { id: 'en-units', tags: ['en', 'multi', 'items'], note: 'soybean oil 2 ltr 380, rice 5kg 350', referenceDate: REF, expected: [
        { amount: 380, type: 'expense', category: 'Groceries', items: [{ name: 'soybean oil', qty: 2, unit: 'L' }] },
        { amount: 350, type: 'expense', category: 'Groceries', items: [{ name: 'rice', qty: 5, unit: 'kg' }] },
    ] },
    { id: 'en-medicine', tags: ['en', 'items'], note: 'napa 2 strips 40', referenceDate: REF, expected: [
        { amount: 40, type: 'expense', category: 'Healthcare', items: [{ name: 'napa', qty: 2, unit: 'strip' }] },
    ] },
    { id: 'en-refund', tags: ['en', 'income'], note: 'daraz refund 1200', referenceDate: REF, expected: [
        { amount: 1200, type: 'income', category: ['Shopping', 'Salary', 'Unlisted'] },
    ] },
    { id: 'en-bills', tags: ['en', 'multi'], note: 'paid wifi bill 1050 and electricity 1800', referenceDate: REF, expected: [
        { amount: 1050, type: 'expense', category: 'Bills & Utilities' },
        { amount: 1800, type: 'expense', category: 'Bills & Utilities' },
    ] },
    { id: 'en-dollar', tags: ['en', 'currency'], note: 'Netflix $9.99', referenceDate: REF, expected: [
        { amount: 9.99, type: 'expense', category: 'Entertainment' },
    ] },
    { id: 'en-receipt', tags: ['en', 'multi', 'items'], note: 'Shwapno - milk 1L 95, bread 60, eggs 1 dozen 150', referenceDate: REF, expected: [
        { amount: 95, type: 'expense', category: 'Groceries', items: [{ name: 'milk', qty: 1, unit: 'L' }] },
        { amount: 60, type: 'expense', category: 'Groceries' },
        { amount: 150, type: 'expense', category: 'Groceries', items: [{ name: ['egg', 'eggs'], qty: 12, unit: 'pcs' }] },
    ] },

    // ── Banglish (romanized Bangla) ────────────────────────────────────────
    { id: 'bl-bazar', tags: ['banglish'], note: 'aaj bazar 1200', referenceDate: REF, expected: [
        { amount: 1200, type: 'expense', category: 'Groceries' },
    ] },
    { id: 'bl-transport', tags: ['banglish', 'multi'], note: 'rickshaw vara 60, cng 250', referenceDate: REF, expected: [
        { amount: 60, type: 'expense', category: 'Transport' },
        { amount: 250, type: 'expense', category: 'Transport' },
    ] },
    { id: 'bl-cha', tags: ['banglish'], note: 'cha nasta 85', referenceDate: REF, expected: [
        { amount: 85, type: 'expense', category: 'Food & Dining' },
    ] },
    { id: 'bl-rent', tags: ['banglish'], note: 'bari bhara 15000 dilam', referenceDate: REF, expected: [
        { amount: 15000, type: 'expense', category: 'Bills & Utilities' },
    ] },
    { id: 'bl-salary', tags: ['banglish', 'income'], note: 'beton pelam 30000', referenceDate: REF, expected: [
        { amount: 30000, type: 'income', category: 'Salary' },
    ] },
    { id: 'bl-medicine', tags: ['banglish'], note: 'osudh kinlam 450', referenceDate: REF, expected: [
        { amount: 450, type: 'expense', category: 'Healthcare' },
    ] },
    { id: 'bl-hali', tags: ['banglish', 'items'], note: 'dim 2 hali 100', referenceDate: REF, expected: [
        { amount: 100, type: 'expense', category: 'Groceries', items: [{ name: ['dim', 'egg'], qty: 8, unit: 'pcs' }] },
    ] },
    { id: 'bl-lent', tags: ['banglish'], note: 'rafi ke 500 dhar dilam', referenceDate: REF, expected: [
        { amount: 500, type: 'expense', category: ['Lent', 'Unlisted'] },
    ] },
    { id: 'bl-recharge', tags: ['banglish', 'multi'], note: 'flexiload 100, mobile recharge 50', referenceDate: REF, expected: [
        { amount: 100, type: 'expense', category: 'Bills & Utilities' },
        { amount: 50, type: 'expense', category: 'Bills & Utilities' },
    ] },
    { id: 'bl-arithmetic', tags: ['banglish', 'arithmetic'], note: 'gari vara 50+30+20', referenceDate: REF, expected: [
        { amount: 100, type: 'expense', category: 'Transport' },
    ] },

    // ── Bangla script ──────────────────────────────────────────────────────
    { id: 'bn-bazar', tags: ['bangla', 'digits'], note: 'বাজার ৫০০ টাকা', referenceDate: REF, expected: [
        { amount: 500, type: 'expense', category: 'Groceries' },
    ] },
    { id: 'bn-rickshaw', tags: ['bangla', 'digits'], note: 'রিকশা ভাড়া ৮০', referenceDate: REF, expected: [
        { amount: 80, type: 'expense', category: 'Transport' },
    ] },
    { id: 'bn-units', tags: ['bangla', 'digits', 'multi', 'items'], note: 'চাল ৫ কেজি ৩৫০\nডাল ২ কেজি ২৪০', referenceDate: REF, expected: [
        { amount: 350, type: 'expense', category: 'Groceries', items: [{ name: ['চাল', 'chal', 'rice'], qty: 5, unit: 'kg' }] },
        { amount: 240, type: 'expense', category: 'Groceries', items: [{ name: ['ডাল', 'dal', 'lentil'], qty: 2, unit: 'kg' }] },
    ] },
    { id: 'bn-salary', tags: ['bangla', 'digits', 'income'], note: 'বেতন পেলাম ৩৫০০০', referenceDate: REF, expected: [
        { amount: 35000, type: 'income', category: 'Salary' },
    ] },
    { id: 'bn-health', tags: ['bangla', 'digits', 'multi'], note: 'ডাক্তার ফি ৮০০, ওষুধ ৩২০', referenceDate: REF, expected: [
        { amount: 800, type: 'expense', category: 'Healthcare' },
        { amount: 320, type: 'expense', category: 'Healthcare' },
    ] },
    { id: 'bn-yesterday', tags: ['bangla', 'digits', 'date'], note: 'গতকাল চা নাস্তা ১২০', referenceDate: REF, expected: [
        { amount: 120, type: 'expense', category: 'Food & Dining', date: YESTERDAY },
    ] },

    // ── Mixed / harder ─────────────────────────────────────────────────────
    { id: 'mix-day', tags: ['mixed', 'multi', 'income'], note: 'morning: tea 20, breakfast 90. office uber 320. evening bazar - alu 2kg 80, piyaj 1kg 110. got freelance payment 12000', referenceDate: REF, expected: [
        { amount: 20, type: 'expense', category: 'Food & Dining' },
        { amount: 90, type: 'expense', category: 'Food & Dining' },
        { amount: 320, type: 'expense', category: 'Transport' },
        { amount: 80, type: 'expense', category: 'Groceries' },
        { amount: 110, type: 'expense', category: 'Groceries' },
        { amount: 12000, type: 'income', category: 'Salary' },
    ] },
    { id: 'mix-no-amount', tags: ['mixed', 'empty'], note: 'remind me to pay rent', referenceDate: REF, expected: [] },
    { id: 'mix-movie', tags: ['mixed', 'arithmetic'], note: 'movie tickets 2x 400 = 800', referenceDate: REF, expected: [
        { amount: 800, type: 'expense', category: 'Entertainment' },
    ] },
    { id: 'mix-personal-care', tags: ['mixed', 'multi'], note: 'haircut 300, gym fee 2000', referenceDate: REF, expected: [
        { amount: 300, type: 'expense', category: 'Personal Care' },
        { amount: 2000, type: 'expense', category: 'Personal Care' },
    ] },
    { id: 'mix-tuition', tags: ['mixed'], note: 'tuition fee 5000 for rahim', referenceDate: REF, expected: [
        { amount: 5000, type: 'expense', category: 'Education' },
    ] },
    { id: 'mix-days-ago', tags: ['mixed', 'date'], note: '2 days ago pathao 180', referenceDate: REF, expected: [
        { amount: 180, type: 'expense', category: 'Transport', date: '2026-10-02' },
    ] },
];
