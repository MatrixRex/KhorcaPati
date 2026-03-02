import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BottomNav } from '@/components/shared/BottomNav';
import { GlobalUI } from '@/components/shared/GlobalUI';
import { useBudgetNotifications } from '@/hooks/useBudgetNotifications';
import { useRecurringNotifications } from '@/hooks/useRecurringNotifications';

import Dashboard from '@/pages/Dashboard';
import Expenses from '@/pages/Expenses';
import Items from '@/pages/Items';
import Budgets from '@/pages/Budgets';
import Goals from '@/pages/Goals';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';

/** Requests notification permission once on app start, then runs budget alert checks. */
function NotificationManager() {
  useBudgetNotifications();
  useRecurringNotifications();
  return null;
}

function App() {
  // Ask for permission on first interaction — browsers require a user gesture
  // We request eagerly here; if already granted/denied nothing changes.
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <HashRouter>
      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
        <main className="flex-1 w-full max-w-md mx-auto relative overflow-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/items" element={<Items />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <NotificationManager />
        <GlobalUI />
        <BottomNav />
      </div>
    </HashRouter>
  );
}

export default App;
