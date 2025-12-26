/**
 * Cross-platform event system that works in both Tauri and web browsers
 * Uses Tauri events when available, falls back to browser CustomEvents
 */

// Check if we're in Tauri
const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;

// Event listeners storage for web
const webListeners = new Map<string, Set<(payload: any) => void>>();

/**
 * Emit an event that works in both Tauri and web
 */
export async function emitEvent(eventName: string, payload?: any): Promise<void> {
    if (isTauri) {
        const { emit } = await import('@tauri-apps/api/event');
        await emit(eventName, payload);
    } else {
        // Web browser - use CustomEvent
        const event = new CustomEvent(eventName, { detail: payload });
        window.dispatchEvent(event);

        // Also notify any direct listeners
        const listeners = webListeners.get(eventName);
        if (listeners) {
            listeners.forEach(listener => listener(payload));
        }
    }
}

/**
 * Listen for events in both Tauri and web
 * Returns an unlisten function
 */
export async function listenEvent<T = any>(
    eventName: string,
    callback: (event: { payload: T }) => void
): Promise<() => void> {
    if (isTauri) {
        const { listen } = await import('@tauri-apps/api/event');
        return await listen(eventName, callback);
    } else {
        // Web browser - use CustomEvent
        const handler = (e: Event) => {
            const customEvent = e as CustomEvent;
            callback({ payload: customEvent.detail });
        };

        window.addEventListener(eventName, handler);

        // Also store in our map for direct emits
        if (!webListeners.has(eventName)) {
            webListeners.set(eventName, new Set());
        }
        const wrappedCallback = (payload: T) => callback({ payload });
        webListeners.get(eventName)!.add(wrappedCallback);

        // Return unlisten function
        return () => {
            window.removeEventListener(eventName, handler);
            webListeners.get(eventName)?.delete(wrappedCallback);
        };
    }
}

/**
 * One-time event listener
 */
export async function onceEvent<T = any>(
    eventName: string,
    callback: (event: { payload: T }) => void
): Promise<() => void> {
    if (isTauri) {
        const { once } = await import('@tauri-apps/api/event');
        return await once(eventName, callback);
    } else {
        const unlisten = await listenEvent<T>(eventName, (event) => {
            callback(event);
            unlisten();
        });
        return unlisten;
    }
}
