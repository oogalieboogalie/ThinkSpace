/**
 * Unified API Layer
 * Automatically routes to Tauri backend or Web API based on platform
 * 
 * Usage:
 *   import { api } from '@/lib/api';
 *   const result = await api.chatWithAI(messages, apiKey);
 * 
 * This works on both desktop (Tauri) and web (Supabase) automatically.
 */

import { invoke } from '@tauri-apps/api/tauri';
import { isTauri } from './platform';
import { webApi, type ChatMessage, type SessionData, type ContentItem } from './webApi';

/**
 * Unified API that works on both Tauri and Web
 */
export const api = {
    /**
     * Chat with AI
     */
    chatWithAI: async (
        messages: ChatMessage[],
        apiKey: string,
        systemPrompt?: string
    ): Promise<string> => {
        if (isTauri()) {
            // Use Tauri backend
            return await invoke<string>('chat_completion_enhanced', {
                apiKey,
                messages,
                systemPrompt,
            });
        } else {
            // Use web API
            return await webApi.chatWithAI(messages, apiKey, systemPrompt);
        }
    },

    /**
     * Generate image
     */
    generateImage: async (prompt: string, apiKey: string): Promise<string> => {
        if (isTauri()) {
            return await invoke<string>('generate_image_minimax', { apiKey, prompt });
        } else {
            return await webApi.generateImage(prompt, apiKey);
        }
    },

    /**
     * Get content structure (knowledge base files)
     */
    getContentStructure: async (): Promise<ContentItem[]> => {
        if (isTauri()) {
            return await invoke<ContentItem[]>('get_content_structure');
        } else {
            return await webApi.getContentStructure();
        }
    },

    /**
     * Read a markdown file
     */
    readMarkdownFile: async (path: string): Promise<string> => {
        if (isTauri()) {
            return await invoke<string>('read_markdown_file', { path });
        } else {
            return await webApi.readMarkdownFile(path);
        }
    },

    /**
     * Search content
     */
    searchContent: async (query: string): Promise<any[]> => {
        if (isTauri()) {
            return await invoke<any[]>('search_content', { query });
        } else {
            return await webApi.searchContent(query);
        }
    },

    /**
     * Save session
     */
    saveSession: async (name: string, data: SessionData, userId?: string): Promise<void> => {
        if (isTauri()) {
            await invoke('save_session', { data });
        } else {
            if (!userId) throw new Error('User ID required for web sessions');
            await webApi.saveSession(name, data, userId);
        }
    },

    /**
     * Load session
     */
    loadSession: async (name: string): Promise<any> => {
        if (isTauri()) {
            return await invoke('load_session', { name });
        } else {
            return await webApi.loadSession(name);
        }
    },

    /**
     * List sessions
     */
    listSessions: async (): Promise<string[]> => {
        if (isTauri()) {
            return await invoke<string[]>('list_sessions');
        } else {
            return await webApi.listSessions();
        }
    },

    /**
     * Store knowledge (TKG on Tauri, Supabase on web)
     */
    storeKnowledge: async (
        content: string,
        title: string,
        nodeType: string,
        importance: number,
        userId: string
    ): Promise<void> => {
        if (isTauri()) {
            await invoke('tkg_store_knowledge', {
                content,
                nodeType,
                importance,
                userId,
            });
        } else {
            await webApi.storeKnowledge(content, title, nodeType, importance, userId);
        }
    },

    /**
     * Download image (Tauri only - web uses right-click save)
     */
    downloadImage: async (url: string, filename: string): Promise<void> => {
        if (isTauri()) {
            await invoke('download_image', { url, filename });
        } else {
            // On web, open image in new tab for manual save
            window.open(url, '_blank');
        }
    },
};

export default api;
