import * as React from 'react';
import { cn } from '@/lib/utils';
import { DateRangeFilter } from './DateRangeFilter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { DevBadge } from './DevBadge';

interface PageContainerProps {
    title: string;
    children: React.ReactNode;
    headerAction?: React.ReactNode;
    showDateFilter?: boolean;
    showBackButton?: boolean;
    onBack?: () => void;
    className?: string;
    contentClassName?: string;
    scrollable?: boolean;
    devId?: string;
}

export function PageContainer({
    title,
    children,
    headerAction,
    showDateFilter = false,
    showBackButton = false,
    onBack,
    className,
    contentClassName,
    scrollable = true,
    devId,
}: PageContainerProps) {
    const navigate = useNavigate();
    const handleBack = onBack || (() => navigate(-1));
    const location = useLocation();

    const getAutoDevId = (path: string) => {
        switch (path) {
            case '/': return 'p:dashboard';
            case '/expenses': return 'p:expenses';
            case '/items': return 'p:items';
            case '/budgets': return 'p:budgets';
            case '/goals': return 'p:goals';
            case '/loans': return 'p:loans';
            case '/reports': return 'p:reports';
            case '/settings': return 'p:settings';
            default: return `p:${path.replace(/^\//, '')}`;
        }
    };
    const autoDevId = devId || getAutoDevId(location.pathname);

    return (
        <div className={cn("flex flex-col h-full w-full", className)}>
            {/* Consistent Header */}
            <header className="flex items-center justify-between px-container h-header shrink-0 glass sticky top-0 z-40 border-b-0 shadow-2xl shadow-black/5">
                <div className="flex items-center gap-2 overflow-hidden">
                    {showBackButton && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleBack}
                            className="h-9 w-9 -ml-2 shrink-0 hover:bg-accent/50 active:scale-95 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    )}
                    <h1 className="text-xl font-black tracking-tight text-foreground font-heading truncate">{title}</h1>
                    <DevBadge id={autoDevId} className="ml-1.5" />
                </div>
                <div className="flex items-center gap-2">
                    {headerAction}
                    {showDateFilter && <DateRangeFilter />}
                </div>
            </header>

            {/* Content Area */}
            <main
                className={cn(
                    "flex-1 px-[var(--container-padding)] pb-[var(--bottom-nav-height)]",
                    scrollable ? "overflow-y-auto" : "overflow-hidden",
                    contentClassName
                )}
            >
                <div className="py-4">
                    {children}
                </div>
            </main>
        </div>
    );
}

export function SharedCard({ children, className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            className={cn(
                "glass-card p-4",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
