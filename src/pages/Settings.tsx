import { CategoryManager } from '@/components/shared/CategoryManager';
import { PageContainer } from '@/components/shared/PageContainer';
import { useUIStore, type Theme } from '@/stores/uiStore';
import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function Settings() {
    const { theme, setTheme, fontScale, setFontScale } = useUIStore();

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
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h2 className="text-sm font-medium text-muted-foreground">Text Size</h2>
                        <button
                            onClick={() => setFontScale(1.1)}
                            className="text-[10px] font-bold uppercase tracking-widest text-primary/60 hover:text-primary transition-colors"
                        >
                            Reset
                        </button>
                    </div>
                    <div className="bg-muted/30 p-6 rounded-3xl border border-muted/50">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-xs font-bold uppercase tracking-wider opacity-60">Scale Multiplier</span>
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
                            Drag the slider to find your perfect reading size.
                        </p>
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
