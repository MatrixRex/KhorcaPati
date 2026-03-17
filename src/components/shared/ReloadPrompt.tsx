
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';

export function ReloadPrompt() {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    const isEditing = useUIStore((state) => state.isInEditingMode());
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (offlineReady || needRefresh) {
            setIsVisible(true);
        }
    }, [offlineReady, needRefresh]);

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="absolute bottom-24 left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className={`bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-4 flex flex-col gap-4 transition-all duration-300 ${isEditing ? 'opacity-90 grayscale-[0.2]' : ''}`}>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <RefreshCw className={`w-5 h-5 ${needRefresh ? 'animate-spin-slow' : ''}`} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold">
                                {needRefresh ? 'Update Available' : 'Ready for Offline'}
                            </span>
                            <span className="text-xs text-muted-foreground leading-tight">
                                {needRefresh
                                    ? (isEditing
                                        ? 'Please finish your work before updating.'
                                        : 'A new version of KhorcaPati is available. Update now to get the latest features.')
                                    : 'App is ready to work offline.'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {needRefresh && (
                            <Button
                                size="sm"
                                onClick={() => updateServiceWorker(true)}
                                disabled={isEditing}
                                className="rounded-full px-4 h-9 font-medium whitespace-nowrap"
                            >
                                {isEditing ? 'Finish Work First' : 'Update'}
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={close}
                            className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {isEditing && needRefresh && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-[10px] text-amber-500 font-medium">
                            Update is paused while drawer is open to prevent data loss.
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
