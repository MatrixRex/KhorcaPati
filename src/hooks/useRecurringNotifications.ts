import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { format } from 'date-fns';
import { getNotified, markNotified, fireNotification } from '@/utils/notifications';

/**
 * Background hook that checks for due recurring payments and fires a notification.
 */
export function useRecurringNotifications() {
    const payments = useLiveQuery(() => db.recurringPayments.toArray());

    useEffect(() => {
        if (!payments) return;
        if (Notification.permission !== 'granted') return;

        const today = format(new Date(), 'yyyy-MM-dd');

        for (const payment of payments) {
            // If nextDueDate is today or in the past (missed)
            if (payment.nextDueDate <= today) {
                const notifiedKey = `recurring_${payment.id}_${payment.nextDueDate}`;
                const notified = getNotified();

                if (!notified.has(notifiedKey)) {
                    fireNotification(
                        `💰 Payment Due: ${payment.title}`,
                        `A payment of ৳${payment.amount.toFixed(0)} for ${payment.category} is due today (${format(new Date(payment.nextDueDate), 'MMM d')}).`
                    );
                    markNotified(notifiedKey);
                }
            }
        }
    }, [payments]);
}
