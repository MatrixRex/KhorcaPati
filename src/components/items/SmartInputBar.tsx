import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { parseItemInput } from '@/parsers/itemParser';
import { useItemStore } from '@/stores/itemStore';
import { useTranslation } from 'react-i18next';

export function SmartInputBar() {
    const [input, setInput] = useState('');
    const addItem = useItemStore((state) => state.addItem);
    const { t } = useTranslation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        try {
            const parsed = parseItemInput(input);

            await addItem({
                name: parsed.name,
                rawInput: input,
                qty: parsed.qty,
                unit: parsed.unit,
                expenseId: null,
                date: new Date().toISOString(),
                note: '',
                createdAt: new Date().toISOString()
            });

            setInput('');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 mb-4">
            <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('smartInputPlaceholder')}
                className="flex-1"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={true}
            />
            <Button type="submit" size="icon" disabled={!input.trim()}>
                <Plus className="w-5 h-5" />
            </Button>
        </form>
    );
}
