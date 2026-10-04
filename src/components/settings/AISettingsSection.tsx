import { useTranslation } from 'react-i18next';
import { Check, Cloud, Download, Loader2, RefreshCw, Smartphone, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useSettingsStore, type AIMode } from '@/stores/settingsStore';
import { useOfflineAIStore } from '@/stores/offlineAIStore';
import { deleteOfflineModel, downloadOfflineModel } from '@/lib/offlineAI/offlineEngine';
import { AIProviderManager } from './AIProviderManager';

/** Download / status / delete controls for the on-device model; also used inside the Smart Note drawer. */
export function OfflineModelPanel({ compact = false }: { compact?: boolean }) {
    const { t } = useTranslation();
    const downloaded = useSettingsStore(s => s.offlineModelDownloaded);
    const { status, progress, error } = useOfflineAIStore();

    const download = () => { downloadOfflineModel().catch(() => { /* shown via the status store */ }); };

    let statusLine: React.ReactNode;
    if (status === 'loading') {
        statusLine = downloaded ? t('offlineModelPreparing') : t('offlineModelDownloading', { percent: Math.round(progress * 100) });
    } else if (status === 'error') {
        statusLine = <span className="text-destructive">{t('offlineModelError', { error })}</span>;
    } else if (downloaded) {
        statusLine = (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Check className="w-3.5 h-3.5" /> {t('offlineModelReady')}
            </span>
        );
    } else {
        statusLine = t('offlineModelNotDownloaded');
    }

    return (
        <div className={cn('space-y-3', !compact && 'report-card-container p-4')}>
            <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold text-muted-foreground min-w-0">{statusLine}</div>
                {status === 'loading' && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
            </div>

            {status === 'loading' && !downloaded && <Progress value={progress * 100} />}

            {status !== 'loading' && !downloaded && (
                <div className="space-y-1.5">
                    <Button className="w-full h-10 rounded-xl font-bold active:scale-95 transition-all duration-200" onClick={download}>
                        {status === 'error' ? <RefreshCw className="w-4 h-4 mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                        {status === 'error' ? t('offlineModelRetry') : t('offlineModelDownload')}
                    </Button>
                    <p className="text-[11px] text-muted-foreground text-center">{t('offlineModelOneTime')}</p>
                </div>
            )}

            {downloaded && status !== 'loading' && !compact && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive active:scale-95 transition-all duration-200"
                    onClick={() => { deleteOfflineModel(); }}
                >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> {t('offlineModelDelete')}
                </Button>
            )}
        </div>
    );
}

/** Settings section: choose where Smart Notes are parsed, then configure that engine. */
export function AISettingsSection() {
    const { t } = useTranslation();
    const aiMode = useSettingsStore(s => s.aiMode);
    const setAIMode = useSettingsStore(s => s.setAIMode);

    const modes: Array<{ id: AIMode; label: string; icon: typeof Cloud }> = [
        { id: 'offline', label: t('aiModeOffline'), icon: Smartphone },
        { id: 'online', label: t('aiModeOnline'), icon: Cloud },
    ];

    return (
        <div className="space-y-3">
            <h2 className="label-header px-1">{t('aiModeTitle')}</h2>
            <div className="grid grid-cols-2 gap-2">
                {modes.map(m => {
                    const Icon = m.icon;
                    const isActive = aiMode === m.id;
                    return (
                        <Button
                            key={m.id}
                            variant={isActive ? 'default' : 'outline'}
                            className={cn(
                                'flex flex-col items-center justify-center h-16 gap-1 border-2 relative overflow-hidden active:scale-95 transition-all duration-200',
                                isActive ? 'border-primary bg-primary/10 text-foreground ring-2 ring-primary/20' : 'border-muted hover:border-primary/50'
                            )}
                            onClick={() => setAIMode(m.id)}
                        >
                            <Icon className={cn('w-4 h-4 transition-transform duration-300', isActive ? 'text-primary scale-110' : 'text-muted-foreground')} />
                            <span className="text-xs font-medium">{m.label}</span>
                            {isActive && (
                                <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5 shadow-sm">
                                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                                </div>
                            )}
                        </Button>
                    );
                })}
            </div>
            <p className="text-[11px] text-muted-foreground font-medium px-1">
                {aiMode === 'offline' ? t('aiModeOfflineDesc') : t('aiModeOnlineDesc')}
            </p>
            {aiMode === 'offline' ? <OfflineModelPanel /> : <AIProviderManager />}
        </div>
    );
}
