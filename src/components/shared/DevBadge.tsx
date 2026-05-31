import * as React from 'react';
import { cn } from '@/lib/utils';

interface DevBadgeProps {
  id: string;
  className?: string;
}

export function DevBadge({ id, className }: DevBadgeProps) {
  const [copied, setCopied] = React.useState(false);

  // Only render in development mode
  if (!import.meta.env.DEV) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <span
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold select-none cursor-pointer transition-all duration-200 active:scale-95 border shrink-0",
        copied
          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
          : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/20 hover:border-amber-500/40",
        className
      )}
      title="Click to copy ID"
    >
      {copied ? "copied!" : id}
    </span>
  );
}
