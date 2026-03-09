
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';

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
        <div className="fixed bottom-24 left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-4 flex items-center justify-between gap-4">
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
                                ? 'A new version of KhorcaPati is available. Update now to get the latest features.'
                                : 'App is ready to work offline.'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {needRefresh && (
                        <Button
                            size="sm"
                            onClick={() => updateServiceWorker(true)}
                            className="rounded-full px-4 h-9 font-medium"
                        >
                            Update
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
        </div>
    );
}
