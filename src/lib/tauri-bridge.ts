/**
 * Tauri Bridge - Provides unified API that works in both Tauri desktop and web browser
 * Uses Tauri APIs when available, falls back to browser alternatives
 */

// Check if we're running in Tauri
export const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;

// Storage keys for web mode
const STORAGE_PREFIX = 'tkg_guide_';
const GUIDES_INDEX_KEY = 'tkg_guides_index';

/**
 * Get list of saved guides (for file picker)
 */
export async function getContentStructure(): Promise<ContentItem[]> {
    if (isTauri) {
        const { invoke } = await import('@tauri-apps/api/tauri');
        return await invoke<ContentItem[]>('get_content_structure');
    }

    // Web mode: return list of guides from localStorage
    const indexJson = localStorage.getItem(GUIDES_INDEX_KEY);
    const savedGuides = indexJson ? JSON.parse(indexJson) : [];

    // Build structure with a "Saved Guides" folder
    const structure: ContentItem[] = [];

    if (savedGuides.length > 0) {
        structure.push({
            name: 'Saved Guides',
            path: 'saved-guides',
            type: 'directory',
            children: savedGuides.map((name: string) => ({
                name: name.endsWith('.md') ? name : `${name}.md`,
                path: `${STORAGE_PREFIX}${name}`,
                type: 'file' as const,
            })),
        });
    }

    // Also include any bundled/default guides if you have them
    // For now, show a helpful placeholder if empty
    if (structure.length === 0) {
        structure.push({
            name: 'No saved guides yet',
            path: '_empty',
            type: 'file',
        });
    }

    return structure;
}

/**
 * Save markdown content to a file
 */
export async function saveMarkdownFile(path: string, content: string): Promise<void> {
    if (isTauri) {
        const { invoke } = await import('@tauri-apps/api/tauri');
        await invoke('save_markdown_file', { path, content });
        return;
    }

    // Web mode: save to localStorage
    const filename = path.replace(/^generated-guides\//, '').replace(/\.md$/, '');
    const storageKey = `${STORAGE_PREFIX}${filename}`;

    // Save the content
    localStorage.setItem(storageKey, content);

    // Update the index
    const indexJson = localStorage.getItem(GUIDES_INDEX_KEY);
    const savedGuides: string[] = indexJson ? JSON.parse(indexJson) : [];
    if (!savedGuides.includes(filename)) {
        savedGuides.push(filename);
        localStorage.setItem(GUIDES_INDEX_KEY, JSON.stringify(savedGuides));
    }

    console.log(`📝 [Web] Saved guide "${filename}" to localStorage`);
}

/**
 * Read markdown content from a file
 */
export async function readMarkdownFile(path: string): Promise<string> {
    if (isTauri) {
        const { invoke } = await import('@tauri-apps/api/tauri');
        return await invoke<string>('read_markdown_file', { path });
    }

    // Web mode: read from localStorage
    // Handle both storage key format and plain filename
    const storageKey = path.startsWith(STORAGE_PREFIX) ? path : `${STORAGE_PREFIX}${path.replace(/\.md$/, '')}`;
    const content = localStorage.getItem(storageKey);

    if (!content) {
        throw new Error(`Guide not found: ${path}`);
    }

    console.log(`📖 [Web] Loaded guide from localStorage`);
    return content;
}

/**
 * Open URL in external browser
 */
export async function openExternal(url: string): Promise<void> {
    if (isTauri) {
        const { open } = await import('@tauri-apps/api/shell');
        await open(url);
        return;
    }

    // Web mode: just open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Open a media window (Tauri-specific, no-op on web)
 */
export async function openMediaWindow(url: string, label: string): Promise<void> {
    if (isTauri) {
        const { invoke } = await import('@tauri-apps/api/tauri');
        await invoke('open_media_window', { url, label });
        return;
    }

    // Web mode: just open in new tab (can't create native windows)
    window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Delete a saved guide
 */
export async function deleteMarkdownFile(path: string): Promise<void> {
    if (isTauri) {
        const { invoke } = await import('@tauri-apps/api/tauri');
        await invoke('delete_markdown_file', { path });
        return;
    }

    // Web mode: remove from localStorage
    const filename = path.replace(/^generated-guides\//, '').replace(/\.md$/, '');
    const storageKey = path.startsWith(STORAGE_PREFIX) ? path : `${STORAGE_PREFIX}${filename}`;

    localStorage.removeItem(storageKey);

    // Update the index
    const indexJson = localStorage.getItem(GUIDES_INDEX_KEY);
    if (indexJson) {
        const savedGuides: string[] = JSON.parse(indexJson);
        const updated = savedGuides.filter(g => g !== filename);
        localStorage.setItem(GUIDES_INDEX_KEY, JSON.stringify(updated));
    }

    console.log(`🗑️ [Web] Deleted guide "${filename}" from localStorage`);
}

// Type definitions
export interface ContentItem {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: ContentItem[];
}
