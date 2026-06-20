import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '@/i18n';

interface SettingsState {
    initialBalance: number;
    language: string;
    hasSeenWelcome: boolean;
    resetDate: number;
    setInitialBalance: (amount: number) => void;
    setLanguage: (lang: string) => void;
    markWelcomeSeen: () => void;
    setResetDate: (date: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            initialBalance: 0,
            language: 'en',
            hasSeenWelcome: false,
            resetDate: 1,
            setInitialBalance: (amount: number) => set({ initialBalance: amount }),
            setLanguage: (lang: string) => {
                set({ language: lang });
                i18n.changeLanguage(lang);
            },
            markWelcomeSeen: () => set({ hasSeenWelcome: true }),
            setResetDate: (date: number) => set({ resetDate: date }),
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
