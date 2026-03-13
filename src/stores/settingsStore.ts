import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
    initialBalance: number;
    language: string;
    setInitialBalance: (amount: number) => void;
    setLanguage: (lang: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            initialBalance: 0,
            language: 'en',
            setInitialBalance: (amount: number) => set({ initialBalance: amount }),
            setLanguage: (lang: string) => set({ language: lang }),
        }),
        {
            name: 'khorchapati-settings-store',
        }
    )
);
