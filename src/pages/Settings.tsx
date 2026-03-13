import { PageContainer } from '@/components/shared/PageContainer';
import { useUIStore, type Theme } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useState } from 'react';
import { Moon, Sun, Monitor, Check, Trash2, Bell, Target, Wallet, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Settings() {
    const { t } = useTranslation();
    const { theme, setTheme, fontScale, setFontScale } = useUIStore();
    const { language, setLanguage } = useSettingsStore();
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

    const handleReset = async () => {
        const { db } = await import('@/db/schema');
        await db.delete();
        localStorage.clear();
        window.location.reload();
    };

    const languages = [
        { id: 'en', label: t('english') },
        { id: 'bn', label: t('bangla') },
    ];

    const themes: { id: Theme; label: string; icon: any }[] = [
        { id: 'light', label: t('light'), icon: Sun },
        { id: 'dark', label: t('dark'), icon: Moon },
        { id: 'system', label: t('system'), icon: Monitor },
    ];

    return (
        <PageContainer title={t('settings')}>
            <div className="space-y-6 pt-2 pb-10">
                <section>
                    <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">{t('language')}</h2>
                    <div className="grid grid-cols-2 gap-2">
                        {languages.map((l) => {
                            const isActive = language === l.id;
                            return (
                                <Button
                                    key={l.id}
                                    variant={isActive ? 'default' : 'outline'}
                                    className={cn(
                                        "flex flex-col items-center justify-center h-16 gap-1 border-2 relative overflow-hidden transition-all duration-300",
                                        isActive
                                            ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/20"
                                            : "border-muted hover:border-primary/50"
                                    )}
                                    onClick={() => setLanguage(l.id)}
                                >
                                    <Languages className={cn("w-4 h-4 transition-transform duration-300", isActive ? "text-primary scale-110" : "text-muted-foreground")} />
                                    <span className="text-xs font-medium">{l.label}</span>
                                    {isActive && (
                                        <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5 shadow-sm">
                                            <Check className="w-2.5 h-2.5 text-primary-foreground" />
                                        </div>
                                    )}
                                </Button>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">{t('appearance')}</h2>
                    <div className="grid grid-cols-3 gap-2">
                        {themes.map((t) => {
                            const Icon = t.icon;
                            const isActive = theme === t.id;
                            return (
                                <Button
                                    key={t.id}
                                    variant={isActive ? 'default' : 'outline'}
                                    className={cn(
                                        "flex flex-col items-center justify-center h-20 gap-2 border-2 relative overflow-hidden transition-all duration-300",
                                        isActive
                                            ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/20"
                                            : "border-muted hover:border-primary/50"
                                    )}
                                    onClick={() => setTheme(t.id)}
                                >
                                    <Icon className={cn("w-5 h-5 transition-transform duration-300", isActive ? "text-primary scale-110" : "text-muted-foreground")} />
                                    <span className="text-xs font-medium">{t.label}</span>
                                    {isActive && (
                                        <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5 shadow-sm">
                                            <Check className="w-2.5 h-2.5 text-primary-foreground" />
                                        </div>
                                    )}
                                </Button>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h2 className="text-sm font-medium text-muted-foreground">{t('textSize')}</h2>
                        <button
                            onClick={() => setFontScale(1.1)}
                            className="text-[10px] font-bold uppercase tracking-widest text-primary/60 hover:text-primary transition-colors"
                        >
                            {t('reset')}
                        </button>
                    </div>
                    <div className="bg-muted/30 p-6 rounded-3xl border border-muted/50">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-xs font-bold uppercase tracking-wider opacity-60">{t('scaleMultiplier')}</span>
                            <span className="text-lg font-black text-primary">{(fontScale * 100).toFixed(0)}%</span>
                        </div>

                        <div className="px-2">
                            <input
                                type="range"
                                min="90"
                                max="120"
                                step="5"
                                value={Math.round(fontScale * 100)}
                                onChange={(e) => setFontScale(parseInt(e.target.value) / 100)}
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary transition-all active:scale-[1.01]"
                            />
                            <div className="flex justify-between mt-4 px-1">
                                <span className="text-[10px] font-bold text-muted-foreground/40">90%</span>
                                <span className="text-[10px] font-bold text-muted-foreground/40">105%</span>
                                <span className="text-[10px] font-bold text-muted-foreground/40">120%</span>
                            </div>
                        </div>

                        <p className="text-[10px] text-muted-foreground mt-6 text-center font-medium italic opacity-60">
                            {t('dragSlider')}
                        </p>
                    </div>
                </section>

                <section>
                    <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">{t('management')}</h2>
                    <div className="grid grid-cols-1 gap-3">
                        <Button
                            variant="outline"
                            onClick={() => useUIStore.getState().openCategoryManagement()}
                            className="h-16 justify-between px-6 rounded-2xl border-muted/50 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                                    <Check className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-bold">{t('categories')}</span>
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{t('manageNames')}</span>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Monitor className="w-4 h-4 rotate-[-90deg]" />
                            </div>
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => useUIStore.getState().openRecurringPaymentsList()}
                            className="h-16 justify-between px-6 rounded-2xl border-muted/50 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500 group-hover:scale-110 transition-transform">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-bold">{t('recurringPayments')}</span>
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{t('editSchedules')}</span>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Monitor className="w-4 h-4 rotate-[-90deg]" />
                            </div>
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => useUIStore.getState().openBudgetsList()}
                            className="h-16 justify-between px-6 rounded-2xl border-muted/50 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-bold">{t('budgets')}</span>
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{t('setLimits')}</span>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Monitor className="w-4 h-4 rotate-[-90deg]" />
                            </div>
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => useUIStore.getState().openGoalsList()}
                            className="h-16 justify-between px-6 rounded-2xl border-muted/50 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                                    <Target className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-bold">{t('savingsGoals')}</span>
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{t('manageTargets')}</span>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Monitor className="w-4 h-4 rotate-[-90deg]" />
                            </div>
                        </Button>
                    </div>
                </section>

                <section className="pt-6 border-t">
                    <h2 className="text-sm font-medium text-destructive mb-3 px-1">{t('dangerZone')}</h2>
                    <div className="bg-destructive/5 p-6 rounded-3xl border border-destructive/20 space-y-4">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-sm font-bold text-destructive">{t('resetApp')}</h3>
                            <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                                {t('deleteCheck')}
                            </p>
                        </div>

                        <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="destructive"
                                    className="w-full h-11 rounded-xl font-bold shadow-sm active:scale-95 transition-all"
                                >
                                    {t('deleteAllData')}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="w-[90%] rounded-[32px] p-8 border-none bg-background shadow-2xl">
                                <AlertDialogHeader className="space-y-4">
                                    <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mx-auto mb-2">
                                        <Trash2 size={32} />
                                    </div>
                                    <AlertDialogTitle className="text-xl font-black text-center">{t('deleteEverything')}</AlertDialogTitle>
                                    <AlertDialogDescription className="text-center text-xs font-medium text-muted-foreground leading-relaxed">
                                        {t('wipeDatabase')}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-col gap-3 mt-8">
                                    <AlertDialogAction
                                        onClick={handleReset}
                                        className="h-12 rounded-2xl bg-destructive text-destructive-foreground font-bold text-sm shadow-lg shadow-destructive/20 active:scale-95 transition-all w-full"
                                    >
                                        {t('yesDelete')}
                                    </AlertDialogAction>
                                    <AlertDialogCancel className="h-12 rounded-2xl border-none bg-secondary/50 font-bold text-sm active:scale-95 transition-all w-full mt-0">
                                        {t('waitGoBack')}
                                    </AlertDialogCancel>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </section>

                <div className="flex flex-col items-center justify-center gap-1 opacity-20 py-8">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">KhorcaPati</span>
                    <span className="text-[10px] font-medium font-mono">1.1.0</span>
                </div>

                <div className="h-20" />
            </div>
        </PageContainer >
    );
}
