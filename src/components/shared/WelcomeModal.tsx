import { useState, useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { cn } from '@/lib/utils';
import { Check, Sun, Moon, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'bn', label: 'বাংলা' },
];

const THEMES: { id: 'light' | 'dark'; labelKey: 'light' | 'dark'; icon: typeof Sun }[] = [
    { id: 'light', labelKey: 'light', icon: Sun },
    { id: 'dark',  labelKey: 'dark',  icon: Moon },
];

export function WelcomeModal() {
    const { hasSeenWelcome, markWelcomeSeen, setLanguage, language } = useSettingsStore();
    const { theme, setTheme } = useUIStore();
    const { t } = useTranslation();

    const [visible, setVisible] = useState(false);
    const [selectedLang, setSelectedLang] = useState(language || 'en');
    const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>(
        theme === 'light' ? 'light' : 'dark'
    );

    // Delay show so store rehydration completes first
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!hasSeenWelcome) setVisible(true);
        }, 150);
        return () => clearTimeout(timer);
    }, [hasSeenWelcome]);

    // Apply theme live as user previews — same logic as App.tsx
    useEffect(() => {
        if (!visible) return;
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(selectedTheme);
    }, [selectedTheme, visible]);

    // Apply language live so modal text switches immediately
    useEffect(() => {
        if (!visible) return;
        i18n.changeLanguage(selectedLang);
    }, [selectedLang, visible]);

    const handleDone = () => {
        setTheme(selectedTheme);
        setLanguage(selectedLang);
        markWelcomeSeen();
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" />

            {/* Sheet — slides up from bottom like the rest of the app */}
            <div className="fixed inset-x-0 bottom-0 z-[201] flex justify-center animate-reveal">
                <div className="w-full max-w-md rounded-t-xl glass shadow-2xl pb-safe">

                    {/* Drag handle */}
                    <div className="h-1.5 w-12 bg-muted/40 rounded-full mx-auto mt-3 mb-1" />

                    <div className="px-6 pt-4 pb-8 space-y-6">

                        {/* Header */}
                        <div>
                            <h2 className="text-2xl font-black text-gradient">{t('appTitle')} 👋</h2>
                            <p className="text-sm text-muted-foreground font-medium mt-0.5">
                                {t('selectLanguage')} & {t('appearance')}
                            </p>
                        </div>

                        {/* Language */}
                        <section>
                            <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1 flex items-center gap-2">
                                <Languages className="w-3.5 h-3.5" />
                                {t('language')}
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {LANGUAGES.map((lang) => {
                                    const isActive = selectedLang === lang.code;
                                    return (
                                        <Button
                                            key={lang.code}
                                            type="button"
                                            variant={isActive ? 'default' : 'outline'}
                                            className={cn(
                                                'flex flex-col items-center justify-center h-16 gap-1 border-2 relative overflow-hidden transition-all duration-300',
                                                isActive
                                                    ? 'border-primary bg-primary/10 text-foreground ring-2 ring-primary/20'
                                                    : 'border-muted hover:border-primary/50'
                                            )}
                                            onClick={() => setSelectedLang(lang.code)}
                                        >
                                            <Languages className={cn('w-4 h-4 transition-transform duration-300', isActive ? 'text-primary scale-110' : 'text-muted-foreground')} />
                                            <span className="text-xs font-medium">{lang.label}</span>
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

                        {/* Theme */}
                        <section>
                            <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
                                {t('appearance')}
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {THEMES.map((th) => {
                                    const Icon = th.icon;
                                    const isActive = selectedTheme === th.id;
                                    return (
                                        <Button
                                            key={th.id}
                                            type="button"
                                            variant={isActive ? 'default' : 'outline'}
                                            className={cn(
                                                'flex flex-col items-center justify-center h-20 gap-2 border-2 relative overflow-hidden transition-all duration-300',
                                                isActive
                                                    ? 'border-primary bg-primary/10 text-foreground ring-2 ring-primary/20'
                                                    : 'border-muted hover:border-primary/50'
                                            )}
                                            onClick={() => setSelectedTheme(th.id)}
                                        >
                                            <Icon className={cn('w-5 h-5 transition-transform duration-300', isActive ? 'text-primary scale-110' : 'text-muted-foreground')} />
                                            <span className="text-xs font-medium">{t(th.labelKey)}</span>
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

                        {/* CTA */}
                        <Button
                            type="button"
                            className="w-full h-12 rounded-lg font-bold text-sm shadow-sm active:scale-95 transition-all"
                            onClick={handleDone}
                        >
                            {t('getStarted')} →
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
