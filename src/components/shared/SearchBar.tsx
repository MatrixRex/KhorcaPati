import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useFilterStore } from '@/stores/filterStore';
import { useSearchStore } from '@/stores/searchStore';
import { DateRangePicker } from './DateRangeFilter';

interface SearchBarProps {
    placeholder: string;
}

/**
 * Bottom-anchored search: a round icon at the left that expands into an input
 * with its own time-range picker. By default it follows the page's view range.
 */
export function SearchBar({ placeholder }: SearchBarProps) {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const query = useSearchStore((s) => s.query);
    const expanded = useSearchStore((s) => s.expanded);
    const allTime = useSearchStore((s) => s.allTime);
    const override = useSearchStore((s) => s.override);
    const { setQuery, setExpanded, setAllTime, setTimeframe, setCustomRange, followView, reset } = useSearchStore.getState();
    const view = useFilterStore();

    useEffect(() => {
        if (expanded) inputRef.current?.focus();
    }, [expanded]);

    // Search state is per page visit.
    useEffect(() => () => useSearchStore.getState().reset(), []);

    const range = override ?? view;
    const close = () => reset();

    return (
        <div className="absolute left-0 right-0 bottom-[var(--bottom-nav-height)] z-40 px-[var(--container-padding)] pb-3 pointer-events-none">
            {!expanded ? (
                <button
                    type="button"
                    aria-label={t('search')}
                    onClick={() => setExpanded(true)}
                    className="pointer-events-auto h-12 w-12 rounded-full glass flex items-center justify-center text-primary shadow-xl shadow-black/10 border border-white/20 active:scale-95 transition-all duration-200"
                >
                    <Search className="w-5 h-5" />
                </button>
            ) : (
                <div className="pointer-events-auto flex items-center gap-1 h-12 pl-4 pr-1.5 rounded-full glass shadow-xl shadow-black/10 border border-white/20 animate-in fade-in slide-in-from-left-4 duration-200">
                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Escape' && close()}
                        placeholder={placeholder}
                        enterKeyHint="search"
                        className="flex-1 min-w-0 bg-transparent outline-none text-sm font-medium px-2 placeholder:text-muted-foreground/60"
                    />
                    {query && (
                        <button
                            type="button"
                            aria-label={t('searchClear')}
                            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                            className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground active:scale-95 transition-all duration-200"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <DateRangePicker
                        centered
                        hideOptions={allTime}
                        timeframe={range.timeframe}
                        startDate={range.startDate}
                        endDate={range.endDate}
                        onTimeframe={setTimeframe}
                        onRange={setCustomRange}
                        labelOverride={allTime ? t('searchAllTime') : undefined}
                        triggerClassName={cn('shrink-0 rounded-full', allTime && 'text-primary')}
                        header={
                            <div className={cn('flex flex-col gap-1', !allTime && 'pb-2 mb-1 border-b')}>
                                <label className="flex items-center justify-between gap-3 px-2 py-1.5 cursor-pointer">
                                    <span className="flex flex-col">
                                        <span className="text-sm font-medium">{t('searchAllTime')}</span>
                                        <span className="text-[10px] text-muted-foreground">{t('searchAllTimeHint')}</span>
                                    </span>
                                    <Switch checked={allTime} onCheckedChange={setAllTime} />
                                </label>
                                {override && !allTime && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="justify-start font-normal h-8 text-xs text-primary active:scale-95 transition-all duration-200"
                                        onClick={followView}
                                    >
                                        {t('searchFollowView')}
                                    </Button>
                                )}
                            </div>
                        }
                    />
                    <button
                        type="button"
                        aria-label={t('close')}
                        onClick={close}
                        className="h-9 w-9 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground shrink-0 active:scale-95 transition-all duration-200"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
