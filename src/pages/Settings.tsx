import { CategoryManager } from '@/components/shared/CategoryManager';
import { PageContainer } from '@/components/shared/PageContainer';
import { useUIStore, type Theme } from '@/stores/uiStore';
import { useState, useEffect } from 'react';
import { sendTestNotification } from '@/utils/notifications';
import { Moon, Sun, Monitor, Check, Trash2, Bell, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
    const { theme, setTheme, fontScale, setFontScale } = useUIStore();
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
    const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
        (typeof window !== 'undefined' && 'Notification' in window)
            ? Notification.permission
            : 'default' as NotificationPermission
    );
    const [isTestingNotif, setIsTestingNotif] = useState(false);
    const [isSecure, setIsSecure] = useState(true);
    const [lastError, setLastError] = useState<string | null>(null);

    useEffect(() => {
        setIsSecure(window.isSecureContext);
        const checkPermission = () => {
            if (typeof window !== 'undefined' && 'Notification' in window) {
                setNotifPermission(Notification.permission);
            }
        };

        const interval = setInterval(checkPermission, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleTestNotification = async () => {
        console.log('Test notification clicked');
        setIsTestingNotif(true);
        setLastError(null);
        try {
            const success = await sendTestNotification();
            console.log('sendTestNotification result:', success);
            if (!success) {
                setLastError('Notifications are blocked or not supported on this device.');
            }
            setNotifPermission(Notification.permission);
        } catch (err: any) {
            console.error('Notification error:', err);
            setLastError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsTestingNotif(false);
        }
    };

    const handleReset = async () => {
        const { db } = await import('@/db/schema');
        await db.delete();
        localStorage.clear();
        window.location.reload();
    };

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
                    <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">Notifications</h2>
                    <div className="bg-muted/30 p-6 rounded-3xl border border-muted/50 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-2.5 rounded-2xl",
                                    notifPermission === 'granted' ? "bg-green-500/10 text-green-500" :
                                        notifPermission === 'denied' ? "bg-red-500/10 text-red-500" :
                                            "bg-yellow-500/10 text-yellow-500"
                                )}>
                                    {notifPermission === 'granted' ? <ShieldCheck className="w-5 h-5" /> :
                                        notifPermission === 'denied' ? <ShieldAlert className="w-5 h-5" /> :
                                            <Bell className="w-5 h-5" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold">System Status</span>
                                    <span className="text-[10px] font-medium text-muted-foreground uppercase">
                                        {notifPermission === 'granted' ? 'Enabled' :
                                            notifPermission === 'denied' ? 'Blocked' : 'Action Required'}
                                    </span>
                                </div>
                            </div>

                            {notifPermission === 'denied' && (
                                <div className="flex items-center gap-1.5 text-red-500 bg-red-500/5 px-3 py-1.5 rounded-full border border-red-500/10">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span className="text-[10px] font-bold">Check Browser Settings</span>
                                </div>
                            )}
                        </div>

                        {!isSecure && (
                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                                <div className="flex items-center gap-2 text-amber-500">
                                    <ShieldAlert className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-tight">Security Restriction</span>
                                </div>
                                <p className="text-[10px] text-amber-200/70 leading-relaxed">
                                    You are accessing the app over <span className="text-amber-500 font-bold">HTTP</span>.
                                    Mobile browsers <span className="font-bold underline">require HTTPS</span> to enable notifications.
                                    Use <span className="bg-amber-500/20 px-1 rounded text-amber-500">localhost</span> or setup an <span className="text-amber-500">HTTPS dev server</span>.
                                </p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {notifPermission === 'granted'
                                    ? "Your notifications are working. Use the test button below to verify you're receiving them correctly on your device."
                                    : notifPermission === 'denied'
                                        ? "Notifications are blocked. Please visit your browser settings to allow KhorcaPati to send you updates."
                                        : "Allow notifications to receive reminders for upcoming payments and budget alerts."}
                            </p>

                            {lastError && (
                                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-medium leading-tight flex gap-2 items-start">
                                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    <span>{lastError}</span>
                                </div>
                            )}

                            <button
                                type="button"
                                onPointerUp={() => {
                                    console.log('Test button PointerUp');
                                    handleTestNotification();
                                }}
                                disabled={isTestingNotif}
                                className={cn(
                                    "w-full h-14 rounded-2xl font-black text-sm uppercase tracking-wider relative z-50 flex items-center justify-center gap-2 border-4",
                                    isTestingNotif
                                        ? "bg-muted text-muted-foreground border-transparent"
                                        : "bg-primary text-primary-foreground border-primary-foreground/20 shadow-xl active:bg-primary/80"
                                )}
                            >
                                {isTestingNotif ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Bell className="w-5 h-5" />
                                        Fire Test Notification
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">Categories</h2>
                    <CategoryManager />
                </section>

                <section className="pt-6 border-t">
                    <h2 className="text-sm font-medium text-destructive mb-3 px-1">Danger Zone</h2>
                    <div className="bg-destructive/5 p-6 rounded-3xl border border-destructive/20 space-y-4">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-sm font-bold text-destructive">Reset App</h3>
                            <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                                This will permanently delete all your expenses, goals, budgets, and categories.
                                This action cannot be undone.
                            </p>
                        </div>

                        <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="destructive"
                                    className="w-full h-11 rounded-xl font-bold shadow-sm active:scale-95 transition-all"
                                >
                                    Delete All Data
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="w-[90%] rounded-[32px] p-8 border-none bg-background shadow-2xl">
                                <AlertDialogHeader className="space-y-4">
                                    <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mx-auto mb-2">
                                        <Trash2 size={32} />
                                    </div>
                                    <AlertDialogTitle className="text-xl font-black text-center">Delete Everything?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-center text-xs font-medium text-muted-foreground leading-relaxed">
                                        This will permanently wipe your local database.
                                        Your transactions, budgets, and settings will be gone forever.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-col gap-3 mt-8">
                                    <AlertDialogAction
                                        onClick={handleReset}
                                        className="h-12 rounded-2xl bg-destructive text-destructive-foreground font-bold text-sm shadow-lg shadow-destructive/20 active:scale-95 transition-all w-full"
                                    >
                                        Yes, Delete Everything
                                    </AlertDialogAction>
                                    <AlertDialogCancel className="h-12 rounded-2xl border-none bg-secondary/50 font-bold text-sm active:scale-95 transition-all w-full mt-0">
                                        Wait, Go Back
                                    </AlertDialogCancel>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </section>
                <div className="h-20" />
            </div>
        </PageContainer >
    );
}
