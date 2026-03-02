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

export function fireNotification(title: string, body: string) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
        new Notification(title, {
            body,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: title,
            renotify: false,
        } as any);
    } catch (err) {
        console.warn('Notification failed:', err);
    }
}
