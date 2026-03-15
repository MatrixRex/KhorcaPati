import * as React from 'react';
import { cn } from '@/lib/utils';
import { DateRangeFilter } from './DateRangeFilter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

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
}: PageContainerProps) {
    const navigate = useNavigate();
    const handleBack = onBack || (() => navigate(-1));

    return (
        <div className={cn("flex flex-col h-full w-full", className)}>
            {/* Consistent Header */}
            <header className="flex items-center justify-between px-container h-header shrink-0 glass sticky top-0 z-30 border-t-0 border-x-0">
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
                    <h1 className="text-xl font-bold tracking-tight text-foreground/90 truncate">{title}</h1>
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
                "rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden p-4",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
