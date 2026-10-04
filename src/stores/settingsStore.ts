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

import type { AIProviderConfig } from '@/lib/aiProviders';

export type AIMode = 'offline' | 'online';

interface SettingsState {
    initialBalance: number;
    language: string;
    hasSeenWelcome: boolean;
    resetDate: number;
    geminiApiKey: string;
    geminiModel: string;
    aiProviders: AIProviderConfig[];
    categoryPreferences: Record<string, string>;
    deletedCategories: string[];
    quickAddMode: 'single' | 'ai';
    /** Smart Notes engine: on-device (no key, works without internet) or cloud API providers. */
    aiMode: AIMode;
    /** Set once the on-device model has been downloaded into the browser cache. */
    offlineModelDownloaded: boolean;
    setInitialBalance: (amount: number) => void;
    setLanguage: (lang: string) => void;
    markWelcomeSeen: () => void;
    setResetDate: (date: number) => void;
    setGeminiApiKey: (key: string) => void;
    setGeminiModel: (model: string) => void;
    setAIProviders: (providers: AIProviderConfig[]) => void;
    addAIProvider: (provider: Omit<AIProviderConfig, 'id'>) => void;
    updateAIProvider: (id: string, updates: Partial<AIProviderConfig>) => void;
    removeAIProvider: (id: string) => void;
    moveAIProvider: (fromIndex: number, toIndex: number) => void;
    setQuickAddMode: (mode: 'single' | 'ai') => void;
    toggleQuickAddMode: () => void;
    setAIMode: (mode: AIMode) => void;
    setOfflineModelDownloaded: (downloaded: boolean) => void;
    learnCategoryPreference: (item: string, category: string) => void;
    clearCategoryPreferences: () => void;
    markDeletedCategory: (categoryName: string) => void;
    unmarkDeletedCategory: (categoryName: string) => void;
    removeCategoryPreferences: (categoryName: string, targetCategoryName?: string) => void;
    renameCategoryPreference: (oldName: string, newName: string) => void;
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
            aiProviders: [],
            categoryPreferences: {},
            deletedCategories: [],
            quickAddMode: 'single',
            aiMode: 'offline',
            offlineModelDownloaded: false,
            setInitialBalance: (amount: number) => set({ initialBalance: amount }),
            setLanguage: (lang: string) => {
                set({ language: lang });
                i18n.changeLanguage(lang);
            },
            markWelcomeSeen: () => set({ hasSeenWelcome: true }),
            setResetDate: (date: number) => set({ resetDate: date }),
            setGeminiApiKey: (key: string) => set({ geminiApiKey: key }),
            setGeminiModel: (model: string) => set({ geminiModel: model }),
            setAIProviders: (providers: AIProviderConfig[]) => set({ aiProviders: providers }),
            addAIProvider: (provider) => set((state) => ({
                aiProviders: [
                    ...state.aiProviders,
                    { ...provider, id: `prov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` }
                ]
            })),
            updateAIProvider: (id, updates) => set((state) => ({
                aiProviders: state.aiProviders.map(p => p.id === id ? { ...p, ...updates } : p)
            })),
            removeAIProvider: (id) => set((state) => ({
                aiProviders: state.aiProviders.filter(p => p.id !== id)
            })),
            moveAIProvider: (fromIndex, toIndex) => set((state) => {
                if (fromIndex < 0 || toIndex < 0 || fromIndex >= state.aiProviders.length || toIndex >= state.aiProviders.length) {
                    return state;
                }
                const updated = [...state.aiProviders];
                const [moved] = updated.splice(fromIndex, 1);
                updated.splice(toIndex, 0, moved);
                return { aiProviders: updated };
            }),
            setQuickAddMode: (mode) => set({ quickAddMode: mode }),
            setAIMode: (mode) => set({ aiMode: mode }),
            setOfflineModelDownloaded: (downloaded) => set({ offlineModelDownloaded: downloaded }),
            toggleQuickAddMode: () => set((state) => ({
                quickAddMode: state.quickAddMode === 'single' ? 'ai' : 'single'
            })),
            learnCategoryPreference: (item: string, category: string) => {
                const cleanKey = normalizePreferenceKeyword(item);
                const cleanCat = category.trim();
                if (!cleanKey || !cleanCat || cleanCat === 'Unlisted') return;

                set((state) => {
                    if ((state.deletedCategories || []).some(c => c.toLowerCase() === cleanCat.toLowerCase())) {
                        return state;
                    }
                    return {
                        categoryPreferences: {
                            ...state.categoryPreferences,
                            [cleanKey]: cleanCat,
                        },
                    };
                });
            },
            clearCategoryPreferences: () => set({ categoryPreferences: {} }),
            markDeletedCategory: (categoryName: string) => {
                const trimmed = categoryName.trim();
                if (!trimmed) return;
                const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
                set((state) => {
                    const current = state.deletedCategories || [];
                    if (current.some((c) => c.toLowerCase() === normalized.toLowerCase())) {
                        return state;
                    }
                    return { deletedCategories: [...current, normalized] };
                });
            },
            unmarkDeletedCategory: (categoryName: string) => {
                const trimmed = categoryName.trim().toLowerCase();
                if (!trimmed) return;
                set((state) => ({
                    deletedCategories: (state.deletedCategories || []).filter(
                        (c) => c.toLowerCase().trim() !== trimmed
                    ),
                }));
            },
            removeCategoryPreferences: (categoryName: string, targetCategoryName?: string) => {
                const target = categoryName.trim().toLowerCase();
                const replacement = targetCategoryName?.trim();
                set((state) => {
                    const nextPrefs: Record<string, string> = {};
                    for (const [key, val] of Object.entries(state.categoryPreferences || {})) {
                        if (val.toLowerCase().trim() === target) {
                            if (replacement && replacement !== 'Unlisted' && replacement.toLowerCase() !== target) {
                                nextPrefs[key] = replacement;
                            }
                        } else {
                            nextPrefs[key] = val;
                        }
                    }
                    return { categoryPreferences: nextPrefs };
                });
            },
            renameCategoryPreference: (oldName: string, newName: string) => {
                const oldLower = oldName.trim().toLowerCase();
                const cleanNew = newName.trim();
                if (!oldLower || !cleanNew) return;
                set((state) => {
                    const nextPrefs: Record<string, string> = {};
                    for (const [key, val] of Object.entries(state.categoryPreferences || {})) {
                        if (val.toLowerCase().trim() === oldLower) {
                            nextPrefs[key] = cleanNew;
                        } else {
                            nextPrefs[key] = val;
                        }
                    }
                    return { categoryPreferences: nextPrefs };
                });
            },
        }),
        {
            name: 'khorchapati-settings-store',
            onRehydrateStorage: () => (state) => {
                if (state) {
                    i18n.changeLanguage(state.language);
                    // Automatic migration: if user has a legacy geminiApiKey and empty aiProviders, seed Gemini provider
                    if (state.geminiApiKey && (!state.aiProviders || state.aiProviders.length === 0)) {
                        state.aiProviders = [
                            {
                                id: 'prov_legacy_gemini',
                                name: 'Google Gemini',
                                type: 'gemini',
                                apiKey: state.geminiApiKey,
                                model: state.geminiModel || 'gemini-flash-lite-latest',
                                enabled: true
                            }
                        ];
                    }
                }
            },
        }
    )
);
