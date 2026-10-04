import type { EvalCase } from './types';

const REF = '2026-10-04'; // Sunday
const YESTERDAY = '2026-10-03';

/**
 * Fresh notes written after the offline rules were built, in styles the rules were not designed
 * around. Used to estimate real-world offline quality; don't tune the rules against these.
 */
export const HOLDOUT_EVAL_CASES: EvalCase[] = [
    { id: 'h-tk-prefix', tags: ['en', 'currency'], note: 'Tk. 450 lunch with team', referenceDate: REF, expected: [
        { amount: 450, type: 'expense', category: 'Food & Dining' },
    ] },
    { id: 'h-slash-equals', tags: ['banglish', 'currency'], note: 'pathao 120/=', referenceDate: REF, expected: [
        { amount: 120, type: 'expense', category: 'Transport' },
    ] },
    { id: 'h-plus-list', tags: ['banglish', 'multi'], note: 'bus vara 30 + rickshaw 40', referenceDate: REF, expected: [
        { amount: 30, type: 'expense', category: 'Transport' },
        { amount: 40, type: 'expense', category: 'Transport' },
    ] },
    { id: 'h-bill-paid', tags: ['en'], note: 'electricity bill 2,350 tk paid', referenceDate: REF, expected: [
        { amount: 2350, type: 'expense', category: 'Bills & Utilities' },
    ] },
    { id: 'h-decimal', tags: ['en'], note: 'grocery from shwapno 1,845.50', referenceDate: REF, expected: [
        { amount: 1845.5, type: 'expense', category: 'Groceries' },
    ] },
    { id: 'h-salary-credited', tags: ['en', 'income'], note: 'salary credited 52,000', referenceDate: REF, expected: [
        { amount: 52000, type: 'income', category: 'Salary' },
    ] },
    { id: 'h-health-list', tags: ['banglish', 'multi'], note: 'daktar fee 700, test 1500, osudh 640', referenceDate: REF, expected: [
        { amount: 700, type: 'expense', category: 'Healthcare' },
        { amount: 1500, type: 'expense', category: 'Healthcare' },
        { amount: 640, type: 'expense', category: 'Healthcare' },
    ] },
    { id: 'h-recharge-tk', tags: ['en'], note: 'mobile recharge 200 tk', referenceDate: REF, expected: [
        { amount: 200, type: 'expense', category: 'Bills & Utilities' },
    ] },
    { id: 'h-shoes', tags: ['en'], note: 'shoes from bata 3200', referenceDate: REF, expected: [
        { amount: 3200, type: 'expense', category: 'Shopping' },
    ] },
    { id: 'h-cinema-qty', tags: ['en'], note: 'cinema 2 ticket 900', referenceDate: REF, expected: [
        { amount: 900, type: 'expense', category: 'Entertainment' },
    ] },
    { id: 'h-kal-raate', tags: ['banglish', 'date'], note: 'kal raate biryani 380', referenceDate: REF, expected: [
        { amount: 380, type: 'expense', category: 'Food & Dining', date: YESTERDAY },
    ] },
    { id: 'h-staples', tags: ['banglish', 'multi', 'items'], note: 'chal 10 kg 720\ndal 2kg 260\ntel 2 litre 390', referenceDate: REF, expected: [
        { amount: 720, type: 'expense', category: 'Groceries', items: [{ name: ['chal', 'rice'], qty: 10, unit: 'kg' }] },
        { amount: 260, type: 'expense', category: 'Groceries', items: [{ name: ['dal', 'lentil'], qty: 2, unit: 'kg' }] },
        { amount: 390, type: 'expense', category: 'Groceries', items: [{ name: ['tel', 'oil'], qty: 2, unit: 'L' }] },
    ] },
    { id: 'h-gift', tags: ['mixed'], note: 'friend er birthday gift 1500', referenceDate: REF, expected: [
        { amount: 1500, type: 'expense', category: ['Shopping', 'Entertainment'] },
    ] },
    { id: 'h-salon', tags: ['en'], note: 'salon 400', referenceDate: REF, expected: [
        { amount: 400, type: 'expense', category: 'Personal Care' },
    ] },
    { id: 'h-gym', tags: ['en'], note: 'gym monthly fee 1500', referenceDate: REF, expected: [
        { amount: 1500, type: 'expense', category: 'Personal Care' },
    ] },
    { id: 'h-tuition-paid', tags: ['banglish'], note: 'tuition dilam 3000', referenceDate: REF, expected: [
        { amount: 3000, type: 'expense', category: 'Education' },
    ] },
    { id: 'h-tuition-income', tags: ['banglish', 'income'], note: 'tuition theke pelam 5000', referenceDate: REF, expected: [
        { amount: 5000, type: 'income', category: 'Salary' },
    ] },
    { id: 'h-bn-bills', tags: ['bangla', 'multi'], note: 'বিদ্যুৎ বিল ১২০০, গ্যাস বিল ৯৭৫', referenceDate: REF, expected: [
        { amount: 1200, type: 'expense', category: 'Bills & Utilities' },
        { amount: 975, type: 'expense', category: 'Bills & Utilities' },
    ] },
    { id: 'h-bn-rickshaw', tags: ['bangla'], note: 'রিকশা ৫০ টাকা', referenceDate: REF, expected: [
        { amount: 50, type: 'expense', category: 'Transport' },
    ] },
    { id: 'h-bn-no-separator', tags: ['bangla', 'multi'], note: 'মাছ ৬০০ মাংস ৮০০', referenceDate: REF, expected: [
        { amount: 600, type: 'expense', category: 'Groceries' },
        { amount: 800, type: 'expense', category: 'Groceries' },
    ] },
    { id: 'h-bn-medicine', tags: ['bangla'], note: 'ওষুধ কিনলাম ৪৫০ টাকা', referenceDate: REF, expected: [
        { amount: 450, type: 'expense', category: 'Healthcare' },
    ] },
    { id: 'h-bn-rent', tags: ['bangla'], note: 'বাসা ভাড়া ১৮০০০', referenceDate: REF, expected: [
        { amount: 18000, type: 'expense', category: 'Bills & Utilities' },
    ] },
    { id: 'h-bn-breakfast', tags: ['bangla'], note: 'আজ সকালে নাস্তা ৮০', referenceDate: REF, expected: [
        { amount: 80, type: 'expense', category: 'Food & Dining' },
    ] },
    { id: 'h-commute', tags: ['mixed', 'multi'], note: 'cng te office 180, back by bus 40', referenceDate: REF, expected: [
        { amount: 180, type: 'expense', category: 'Transport' },
        { amount: 40, type: 'expense', category: 'Transport' },
    ] },
    { id: 'h-per-year', tags: ['en'], note: 'netflix 1200 per year', referenceDate: REF, expected: [
        { amount: 1200, type: 'expense', category: 'Entertainment' },
    ] },
    { id: 'h-utilities-lines', tags: ['en', 'multi'], note: 'wifi 1000\ncurrent 1650\nwater 300', referenceDate: REF, expected: [
        { amount: 1000, type: 'expense', category: 'Bills & Utilities' },
        { amount: 1650, type: 'expense', category: 'Bills & Utilities' },
        { amount: 300, type: 'expense', category: ['Bills & Utilities', 'Groceries'] },
    ] },
    { id: 'h-eid-bonus', tags: ['banglish', 'income'], note: 'bonus pelam 15000 eid', referenceDate: REF, expected: [
        { amount: 15000, type: 'income', category: 'Salary' },
    ] },
    { id: 'h-refund', tags: ['en', 'income'], note: 'refund from daraz 899', referenceDate: REF, expected: [
        { amount: 899, type: 'income', category: ['Shopping', 'Salary', 'Unlisted'] },
    ] },
    { id: 'h-lent', tags: ['en'], note: 'lent 2000 to karim', referenceDate: REF, expected: [
        { amount: 2000, type: 'expense', category: ['Lent', 'Unlisted'] },
    ] },
    { id: 'h-petrol', tags: ['en'], note: 'petrol 1000 bike', referenceDate: REF, expected: [
        { amount: 1000, type: 'expense', category: 'Transport' },
    ] },
    { id: 'h-pizza', tags: ['en'], note: 'pizza hut 1450', referenceDate: REF, expected: [
        { amount: 1450, type: 'expense', category: 'Food & Dining' },
    ] },
    { id: 'h-books', tags: ['en'], note: 'books 650 from nilkhet', referenceDate: REF, expected: [
        { amount: 650, type: 'expense', category: 'Education' },
    ] },
    { id: 'h-medicine-for', tags: ['mixed'], note: 'medicine 320 for ammu', referenceDate: REF, expected: [
        { amount: 320, type: 'expense', category: 'Healthcare' },
    ] },
    { id: 'h-date-at-end', tags: ['en', 'date'], note: 'uber 210 yesterday', referenceDate: REF, expected: [
        { amount: 210, type: 'expense', category: 'Transport', date: YESTERDAY },
    ] },
    { id: 'h-days-ago-shirt', tags: ['banglish', 'date'], note: '3 din age shirt kinlam 1200', referenceDate: REF, expected: [
        { amount: 1200, type: 'expense', category: 'Shopping', date: '2026-10-01' },
    ] },
    { id: 'h-freelance-dollar', tags: ['en', 'income'], note: 'freelance income $300', referenceDate: REF, expected: [
        { amount: 300, type: 'income', category: 'Salary' },
    ] },
    { id: 'h-no-separator-en', tags: ['en', 'multi'], note: 'snacks 60 tea 20', referenceDate: REF, expected: [
        { amount: 60, type: 'expense', category: 'Food & Dining' },
        { amount: 20, type: 'expense', category: 'Food & Dining' },
    ] },
    { id: 'h-paid-for', tags: ['en'], note: 'paid 5000 for school admission', referenceDate: REF, expected: [
        { amount: 5000, type: 'expense', category: 'Education' },
    ] },
    { id: 'h-dash-amount', tags: ['banglish'], note: 'bazar - 1,250', referenceDate: REF, expected: [
        { amount: 1250, type: 'expense', category: 'Groceries' },
    ] },
    { id: 'h-nothing', tags: ['en', 'empty'], note: 'nothing spent today', referenceDate: REF, expected: [] },
];
