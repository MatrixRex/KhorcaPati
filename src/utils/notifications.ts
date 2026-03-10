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

const LAST_NOTIF_KEY = 'kp_last_notification_time';

export async function fireNotification(title: string, body: string) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    // --- DEBOUNCE LOGIC (Prevents double-firing from multiple tabs/hooks) ---
    const now = Date.now();
    const lastTime = parseInt(localStorage.getItem(LAST_NOTIF_KEY) || '0');
    const lastTitle = localStorage.getItem('kp_last_notification_title');

    // If same notification sent in the last 2 seconds, skip it
    if (now - lastTime < 2000 && lastTitle === title) {
        console.log('Debounced duplicate notification:', title);
        return;
    }
    localStorage.setItem(LAST_NOTIF_KEY, now.toString());
    localStorage.setItem('kp_last_notification_title', title);
    // ------------------------------------------------------------------------

    const baseUrl = (import.meta as any).env.BASE_URL || '/';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    const iconPath = `${window.location.origin}${cleanBase}icon-512.png`;

    const options = {
        body,
        icon: iconPath,
        badge: iconPath,
        tag: 'khorcapati-alert',
        renotify: true,
        vibrate: [200, 100, 200],
        requireInteraction: true,
        data: { url: window.location.href }
    };

    try {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            if (registration) {
                console.log('Fired SW notification:', title);
                await registration.showNotification(title, options as any);
                return;
            }
        }

        console.log('Fired Legacy notification:', title);
        new Notification(title, options as any);
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

