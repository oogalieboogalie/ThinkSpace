/**
 * Platform Detection Utility
 * Detects whether the app is running in Tauri (desktop) or web browser
 */


/**
 * Check if running inside Tauri desktop app
 */
export const isTauri = (): boolean => {
    return typeof window !== 'undefined' && '__TAURI__' in window;
};

/**
 * Check if running in web browser (not Tauri)
 */
export const isWeb = (): boolean => {
    return !isTauri();
};

/**
 * Get the current platform name
 */
export const getPlatform = (): 'tauri' | 'web' => {
    return isTauri() ? 'tauri' : 'web';
};

/**
 * Feature availability check
 * Use this to conditionally enable/disable features based on platform
 */
export const features = {
    /** Local file system access (Tauri only) */
    localFileAccess: () => isTauri(),

    /** TKG/Qdrant knowledge graph (Tauri only) */
    temporalKnowledgeGraph: () => isTauri(),

    /** AI Chat (available on both, different backends) */
    aiChat: () => true,

    /** Image generation (available on both) */
    imageGeneration: () => true,

    /** Knowledge base browsing (available on both) */
    knowledgeBaseBrowsing: () => true,

    /** Session save/load (available on both) */
    sessions: () => true,

    /** Offline mode (Tauri only) */
    offlineMode: () => isTauri(),
};
