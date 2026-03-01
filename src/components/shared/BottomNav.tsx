import { NavLink } from 'react-router-dom';
import { Home, Receipt, PackageSearch, PieChart, Settings } from 'lucide-react';

const navItems = [
    { path: '/', label: 'Dash', icon: <Home className="w-6 h-6" /> },
    { path: '/expenses', label: 'Expenses', icon: <Receipt className="w-6 h-6" /> },
    { path: '/items', label: 'Items', icon: <PackageSearch className="w-6 h-6" /> },
    { path: '/reports', label: 'Reports', icon: <PieChart className="w-6 h-6" /> },
    { path: '/settings', label: 'Settings', icon: <Settings className="w-6 h-6" /> },
];

export function BottomNav() {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border mt-auto h-16 pointer-events-auto">
            <ul className="flex items-center justify-around h-full">
                {navItems.map((item) => (
                    <li key={item.path} className="w-full">
                        <NavLink
                            to={item.path}
                            className={({ isActive }) =>
                                `flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                                }`
                            }
                        >
                            {item.icon}
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </NavLink>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
