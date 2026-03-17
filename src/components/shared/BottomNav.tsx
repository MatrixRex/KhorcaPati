import { NavLink } from 'react-router-dom';
import { Home, Receipt, PackageSearch, PieChart, SquareMenu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export function BottomNav() {
    const { t } = useTranslation();

    const navItems = [
        { path: '/', label: t('dash'), icon: Home },
        { path: '/expenses', label: t('records'), icon: Receipt },
        { path: '/items', label: t('items'), icon: PackageSearch },
        { path: '/reports', label: t('reports'), icon: PieChart },
        { path: '/settings', label: t('settings'), icon: SquareMenu },
    ];

    return (
        <nav className="absolute bottom-0 left-0 right-0 z-50 glass backdrop-blur-xl border-t-0 h-nav pointer-events-auto shadow-2xl shadow-black/10">
            <ul className="flex items-center justify-around h-full w-full mx-auto">
                {navItems.map((item) => (
                    <li key={item.path} className="flex-1">
                        <NavLink
                            to={item.path}
                            className={({ isActive }) =>
                                cn(
                                    "flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300 relative group",
                                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {/* Active Tab Mountain Glow */}
                                    {isActive && (
                                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-16 bg-primary/30 blur-[32px] rounded-[100%] -z-10 animate-reveal pointer-events-none" />
                                    )}
                                    
                                    <div className={cn(
                                        "p-1.5 rounded-xl transition-all duration-300 relative z-10",
                                        isActive ? "bg-primary/15 scale-110 shadow-lg shadow-primary/10" : "group-hover:bg-accent/50"
                                    )}>
                                        <item.icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
                                    </div>
                                    <span className={cn(
                                        "text-[11px] font-bold tracking-tight transition-all duration-300 relative z-10",
                                        isActive ? "opacity-100 translate-y-0 text-primary" : "opacity-70 group-hover:opacity-100"
                                    )}>
                                        {item.label}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
