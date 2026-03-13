import { db } from '@/db/schema';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';

export interface BackupData {
    version: number;
    timestamp: string;
    dexie: {
        expenses: any[];
        items: any[];
        budgets: any[];
        goals: any[];
        categories: any[];
        recurringPayments: any[];
    };
    settings: {
        initialBalance: number;
        language: string;
    };
    ui: {
        theme: 'light' | 'dark' | 'system';
        fontScale: number;
    };
}

export const exportData = async () => {
    const backup: BackupData = {
        version: 1,
        timestamp: new Date().toISOString(),
        dexie: {
            expenses: await db.expenses.toArray(),
            items: await db.items.toArray(),
            budgets: await db.budgets.toArray(),
            goals: await db.goals.toArray(),
            categories: await db.categories.toArray(),
            recurringPayments: await db.recurringPayments.toArray(),
        },
        settings: {
            initialBalance: useSettingsStore.getState().initialBalance,
            language: useSettingsStore.getState().language,
        },
        ui: {
            theme: useUIStore.getState().theme,
            fontScale: useUIStore.getState().fontScale,
        },
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `khorchapati-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const importData = async (jsonString: string) => {
    try {
        const backup: BackupData = JSON.parse(jsonString);

        if (!backup.dexie || !backup.settings) {
            throw new Error('Invalid backup file');
        }

        // Clear existing data
        await db.transaction('rw', [db.expenses, db.items, db.budgets, db.goals, db.categories, db.recurringPayments], async () => {
            await Promise.all([
                db.expenses.clear(),
                db.items.clear(),
                db.budgets.clear(),
                db.goals.clear(),
                db.categories.clear(),
                db.recurringPayments.clear(),
            ]);

            // Import Dexie data
            if (backup.dexie.expenses.length > 0) await db.expenses.bulkAdd(backup.dexie.expenses);
            if (backup.dexie.items.length > 0) await db.items.bulkAdd(backup.dexie.items);
            if (backup.dexie.budgets.length > 0) await db.budgets.bulkAdd(backup.dexie.budgets);
            if (backup.dexie.goals.length > 0) await db.goals.bulkAdd(backup.dexie.goals);
            if (backup.dexie.categories.length > 0) await db.categories.bulkAdd(backup.dexie.categories);
            if (backup.dexie.recurringPayments.length > 0) await db.recurringPayments.bulkAdd(backup.dexie.recurringPayments);
        });

        // Import Settings
        const settings = backup.settings;
        useSettingsStore.getState().setInitialBalance(settings.initialBalance);
        useSettingsStore.getState().setLanguage(settings.language);

        // Import UI Settings
        if (backup.ui) {
            useUIStore.getState().setTheme(backup.ui.theme);
            useUIStore.getState().setFontScale(backup.ui.fontScale);
        }

        return true;
    } catch (error) {
        console.error('Import failed:', error);
        throw error;
    }
};
