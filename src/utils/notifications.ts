const STORAGE_KEY = 'kp_notifications_notified';

export function getNotified(): Set<string> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch {
        return new Set();
    }
}

export function markNotified(key: string) {
    const set = getNotified();
    set.add(key);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

export async function requestNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;

    if (Notification.permission === 'granted') return true;

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
}

export function fireNotification(title: string, body: string) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    // Use current location to determine base path for icons
    const iconPath = '/KhorcaPati/icon-512.png';

    try {
        // Preference 1: Service Worker (Required for mobile/background)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, {
                    body,
                    icon: iconPath,
                    badge: iconPath,
                    tag: 'khorcapati-alert',
                    renotify: true,
                    vibrate: [200, 100, 200],
                    requireInteraction: true,
                    data: { url: window.location.href }
                } as any);
            });
            return;
        }

        // Preference 2: Legacy Notification (Fallback for Desktop)
        new Notification(title, {
            body,
            icon: iconPath,
            tag: 'khorcapati-alert',
            renotify: true,
        } as any);
    } catch (err) {
        console.warn('Notification failed:', err);
    }
}


export async function sendTestNotification() {
    const granted = await requestNotificationPermission();
    if (granted) {
        fireNotification(
            '🔔 Test Notification',
            'Your notification system is working perfectly! KhorcaPati will keep you updated.'
        );
        return true;
    }
    return false;
}

