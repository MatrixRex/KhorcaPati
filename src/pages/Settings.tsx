import { CategoryManager } from '@/components/shared/CategoryManager';
import { PageContainer } from '@/components/shared/PageContainer';
import { useUIStore, type Theme } from '@/stores/uiStore';
import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function Settings() {
    const { theme, setTheme } = useUIStore();

    const themes: { id: Theme; label: string; icon: any }[] = [
        { id: 'light', label: 'Light', icon: Sun },
        { id: 'dark', label: 'Dark', icon: Moon },
        { id: 'system', label: 'System', icon: Monitor },
    ];

    return (
        <PageContainer title="Settings">
            <div className="space-y-6 pt-2 pb-10">
                <section>
                    <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">Appearance</h2>
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
                    <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">Categories</h2>
                    <CategoryManager />
                </section>
            </div>
        </PageContainer>
    );
}
