import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from './settingsStore';

describe('Settings Store Business Logic', () => {
    beforeEach(() => {
        useSettingsStore.setState({
            initialBalance: 0,
            language: 'en',
            hasSeenWelcome: false,
            resetDate: 1,
            geminiApiKey: '',
            geminiModel: 'gemini-flash-lite-latest',
            categoryPreferences: {},
            deletedCategories: []
        });
    });

    it('initializes with empty geminiApiKey by default', () => {
        const state = useSettingsStore.getState();
        expect(state.geminiApiKey).toBe('');
        expect(state.geminiModel).toBe('gemini-flash-lite-latest');
    });

    it('sets and updates geminiApiKey and geminiModel', () => {
        const { setGeminiApiKey, setGeminiModel } = useSettingsStore.getState();

        setGeminiApiKey('AIzaSyTestKey12345');
        expect(useSettingsStore.getState().geminiApiKey).toBe('AIzaSyTestKey12345');

        setGeminiModel('gemini-1.5-pro');
        expect(useSettingsStore.getState().geminiModel).toBe('gemini-1.5-pro');
    });

    it('can clear geminiApiKey', () => {
        const { setGeminiApiKey } = useSettingsStore.getState();

        setGeminiApiKey('AIzaSyTestKey12345');
        expect(useSettingsStore.getState().geminiApiKey).toBe('AIzaSyTestKey12345');

        setGeminiApiKey('');
        expect(useSettingsStore.getState().geminiApiKey).toBe('');
    });

    it('updates initialBalance, resetDate, and markWelcomeSeen', () => {
        const { setInitialBalance, setResetDate, markWelcomeSeen } = useSettingsStore.getState();

        setInitialBalance(5000);
        expect(useSettingsStore.getState().initialBalance).toBe(5000);

        setResetDate(15);
        expect(useSettingsStore.getState().resetDate).toBe(15);

        markWelcomeSeen();
        expect(useSettingsStore.getState().hasSeenWelcome).toBe(true);
    });

    it('learns and updates category preferences for items', () => {
        const { learnCategoryPreference, clearCategoryPreferences } = useSettingsStore.getState();

        learnCategoryPreference('fan 1k', 'House');
        expect(useSettingsStore.getState().categoryPreferences).toEqual({
            fan: 'House'
        });

        learnCategoryPreference('Ceiling Fan 1500', 'House');
        expect(useSettingsStore.getState().categoryPreferences).toEqual({
            fan: 'House',
            'ceiling fan': 'House'
        });

        learnCategoryPreference('shirt 500 tk', 'Shopping');
        expect(useSettingsStore.getState().categoryPreferences['shirt']).toBe('Shopping');

        clearCategoryPreferences();
        expect(useSettingsStore.getState().categoryPreferences).toEqual({});
    });

    it('marks and unmarks deleted categories', () => {
        const { markDeletedCategory, unmarkDeletedCategory } = useSettingsStore.getState();

        markDeletedCategory('Gaming');
        expect(useSettingsStore.getState().deletedCategories).toContain('Gaming');

        // Case insensitive duplicate prevention
        markDeletedCategory('gaming');
        expect(useSettingsStore.getState().deletedCategories.filter(c => c.toLowerCase() === 'gaming').length).toBe(1);

        unmarkDeletedCategory('gaming');
        expect(useSettingsStore.getState().deletedCategories).not.toContain('Gaming');
    });

    it('prevents learning preference for deleted categories', () => {
        const { markDeletedCategory, learnCategoryPreference } = useSettingsStore.getState();

        markDeletedCategory('Fast Food');
        learnCategoryPreference('burger', 'Fast Food');

        expect(useSettingsStore.getState().categoryPreferences['burger']).toBeUndefined();
    });

    it('removes or migrates category preferences when a category is deleted', () => {
        const { learnCategoryPreference, removeCategoryPreferences } = useSettingsStore.getState();

        learnCategoryPreference('burger', 'Fast Food');
        learnCategoryPreference('pizza', 'Fast Food');
        learnCategoryPreference('coffee', 'Drinks');

        // Migrate Fast Food to Food
        removeCategoryPreferences('Fast Food', 'Food');
        expect(useSettingsStore.getState().categoryPreferences).toEqual({
            burger: 'Food',
            pizza: 'Food',
            coffee: 'Drinks',
        });

        // Remove Drinks completely (no migration target or target is Unlisted)
        removeCategoryPreferences('Drinks');
        expect(useSettingsStore.getState().categoryPreferences).toEqual({
            burger: 'Food',
            pizza: 'Food',
        });
    });

    it('renames category preferences when category name is updated', () => {
        const { learnCategoryPreference, renameCategoryPreference } = useSettingsStore.getState();

        learnCategoryPreference('subway sandwich', 'Snacks');
        renameCategoryPreference('Snacks', 'Quick Bites');

        expect(useSettingsStore.getState().categoryPreferences['subway sandwich']).toBe('Quick Bites');
    });
});

