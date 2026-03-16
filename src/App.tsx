import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { BottomNav } from '@/components/shared/BottomNav';
import { GlobalUI } from '@/components/shared/GlobalUI';
import { useBudgetNotifications } from '@/hooks/useBudgetNotifications';
import { useRecurringNotifications } from '@/hooks/useRecurringNotifications';
import { useUIStore } from '@/stores/uiStore';
import { AnimatePresence, motion } from 'framer-motion';

import Dashboard from '@/pages/Dashboard';
import Expenses from '@/pages/Expenses';
import Items from '@/pages/Items';
import Budgets from '@/pages/Budgets';
import Goals from '@/pages/Goals';
import Loans from '@/pages/Loans';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';

import { ReloadPrompt } from '@/components/shared/ReloadPrompt';
import { WelcomeModal } from '@/components/shared/WelcomeModal';

/** Requests notification permission once on app start, then runs budget alert checks. */
function NotificationManager() {
  useBudgetNotifications();
  useRecurringNotifications();
  return null;
}

function AppContent() {
  const { theme, fontScale } = useUIStore();
  const location = useLocation();

  useEffect(() => {
    // 1. Theme Logic
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    // 2. Font Scale Logic
    root.style.setProperty('--font-scale', fontScale.toString());

  }, [theme, fontScale]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const isAnyDrawerOpen = useUIStore((state) => state.isInEditingMode());
  const isInventoryItemOpen = useUIStore((state) => !!state.selectedInventoryItem);
  const shouldBlur = isAnyDrawerOpen || isInventoryItemOpen;

  return (
    <div className="flex flex-col h-screen bg-transparent text-foreground overflow-hidden">
      <main className={cn(
        "flex-1 w-full max-w-md mx-auto relative overflow-hidden transition-all duration-300",
        shouldBlur ? "blur-[2px] scale-[0.98] opacity-60" : "blur-0 scale-100 opacity-100"
      )}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full h-full"
          >
            <Routes location={location}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/items" element={<Items />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/loans" element={<Loans />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      <NotificationManager />
      <GlobalUI />
      <ReloadPrompt />
      <WelcomeModal />
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;
