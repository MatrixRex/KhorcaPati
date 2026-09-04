import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '@/i18n';

export function normalizePreferenceKeyword(input: string): string {
    return input
        .toLowerCase()
        .replace(/(?:^|\s)(?:tk|taka|bdt|\$|৳)\s*\d+(?:\.\d+)?(?:k|lakh|crore)?(?:\s|$)/gi, ' ')
        .replace(/(?:^|\s)\d+(?:\.\d+)?\s*(?:k|lakh|crore|tk|taka|bdt|\$|৳)?(?:\s|$)/gi, ' ')
        .replace(/[\d.,+*xX-]+/g, ' ')
        .replace(/[^\p{L}\s]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
}

interface SettingsState {
    initialBalance: number;
    language: string;
    hasSeenWelcome: boolean;
    resetDate: number;
    geminiApiKey: string;
    geminiModel: string;
    categoryPreferences: Record<string, string>;
    setInitialBalance: (amount: number) => void;
    setLanguage: (lang: string) => void;
    markWelcomeSeen: () => void;
    setResetDate: (date: number) => void;
    setGeminiApiKey: (key: string) => void;
    setGeminiModel: (model: string) => void;
    learnCategoryPreference: (item: string, category: string) => void;
    clearCategoryPreferences: () => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            initialBalance: 0,
            language: 'en',
            hasSeenWelcome: false,
            resetDate: 1,
            geminiApiKey: '',
            geminiModel: 'gemini-flash-lite-latest',
            categoryPreferences: {},
            setInitialBalance: (amount: number) => set({ initialBalance: amount }),
            setLanguage: (lang: string) => {
                set({ language: lang });
                i18n.changeLanguage(lang);
            },
            markWelcomeSeen: () => set({ hasSeenWelcome: true }),
            setResetDate: (date: number) => set({ resetDate: date }),
            setGeminiApiKey: (key: string) => set({ geminiApiKey: key }),
            setGeminiModel: (model: string) => set({ geminiModel: model }),
            learnCategoryPreference: (item: string, category: string) => {
                const cleanKey = normalizePreferenceKeyword(item);
                const cleanCat = category.trim();
                if (!cleanKey || !cleanCat || cleanCat === 'Unlisted') return;

                set((state) => ({
                    categoryPreferences: {
                        ...state.categoryPreferences,
                        [cleanKey]: cleanCat,
                    },
                }));
            },
            clearCategoryPreferences: () => set({ categoryPreferences: {} }),
        }),
        {
            name: 'khorchapati-settings-store',
            onRehydrateStorage: () => (state) => {
                if (state) {
                    i18n.changeLanguage(state.language);
                }
            },
        }
    )
);
