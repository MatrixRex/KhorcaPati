import { describe, it, expect } from 'vitest';
import { buildParseContext, buildSystemPrompt } from '@/lib/geminiParser';
import { buildCompactSystemPrompt, buildTransactionJsonSchema, buildPrompt } from './prompts';

// Loose view of the generated schema for assertions.
type SchemaShape = { required: string[]; properties: { transactions: { items: { required: string[]; properties: Record<string, { enum?: string[] }> } } } };
const txSchema = (s: object) => (s as SchemaShape).properties.transactions.items;

const categories = ['Food & Dining', 'Groceries', 'Transport', 'Unlisted'].map(name => ({ name }));

describe('buildCompactSystemPrompt', () => {
    const ctx = buildParseContext({ categories, referenceDate: '2026-10-04' });

    it('includes the categories and reference date', () => {
        const prompt = buildCompactSystemPrompt(ctx);
        expect(prompt).toContain('2026-10-04');
        expect(prompt).toContain('"Food & Dining"');
        expect(prompt).toContain('"Transport"');
    });

    it('is far shorter than the production prompt', () => {
        expect(buildCompactSystemPrompt(ctx).length).toBeLessThan(buildSystemPrompt(ctx).length * 0.4);
    });

    it('lists user preferences only when present', () => {
        expect(buildCompactSystemPrompt(ctx)).not.toContain('past choices');
        const withPrefs = buildParseContext({ categories, referenceDate: '2026-10-04', categoryPreferences: { fan: 'Groceries' } });
        expect(buildCompactSystemPrompt(withPrefs)).toContain('"fan" -> "Groceries"');
    });
});

describe('buildTransactionJsonSchema', () => {
    it('requires the core transaction fields', () => {
        const schema = buildTransactionJsonSchema() as SchemaShape;
        const tx = txSchema(schema);
        expect(schema.required).toEqual(['transactions']);
        expect(tx.required).toEqual(expect.arrayContaining(['title', 'amount', 'type', 'category', 'date', 'items']));
        expect(tx.properties.type.enum).toEqual(['expense', 'income']);
        expect(tx.properties.category.enum).toBeUndefined();
    });

    it('restricts category to the given names when provided', () => {
        const schema = buildTransactionJsonSchema(['Food & Dining', 'Transport']);
        expect(txSchema(schema).properties.category.enum).toEqual(['Food & Dining', 'Transport']);
    });
});

describe('buildPrompt', () => {
    const ctx = buildParseContext({ categories, referenceDate: '2026-10-04' });

    it('picks the prompt variant and wraps the note like production', () => {
        const full = buildPrompt(ctx, 'uber 250', { variant: 'full', constrainCategories: false });
        const compact = buildPrompt(ctx, 'uber 250', { variant: 'compact', constrainCategories: true });
        expect(full.systemPrompt).toBe(buildSystemPrompt(ctx));
        expect(compact.systemPrompt).toBe(buildCompactSystemPrompt(ctx));
        expect(full.userMessage).toContain('"""\nuber 250\n"""');
        expect(txSchema(full.jsonSchema).properties.category.enum).toBeUndefined();
        expect(txSchema(compact.jsonSchema).properties.category.enum).toEqual(ctx.categoryNames);
    });
});
