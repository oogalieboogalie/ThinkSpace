/**
 * Web API Layer
 * Provides web-based alternatives to Tauri invoke() commands
 * Used when the app is running in a browser instead of Tauri desktop
 */

import { createSupabaseClient } from './supabase';
import { emitEvent, listenEvent } from './events';

// Get Supabase client (uses env vars)
const getSupabase = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) {
        throw new Error('Supabase credentials not configured');
    }
    return createSupabaseClient(url, key);
};

// ============================================
// TYPES
// ============================================

export interface ContentItem {
    name: string;
    path: string;
    isDirectory: boolean;
    children?: ContentItem[];
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface SessionData {
    name: string;
    chat?: ChatMessage[];
    mainCanvas?: string;
    leftCanvas?: string;
    visuals?: any[];
}

// ============================================
// WEB API IMPLEMENTATION
// ============================================

export const webApi = {
    /**
     * Chat with AI via direct MiniMax API call
     * For web, we use the API key loaded from Supabase app_config
     */
    chatWithAI: async (
        messages: ChatMessage[],
        _apiKey: string,
        systemPrompt?: string
    ): Promise<string> => {
        const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL;
        if (!gatewayUrl) {
            throw new Error('AI gateway not configured. Please set VITE_AI_GATEWAY_URL.');
        }

        // Build messages array
        const fullMessages: ChatMessage[] = [];
        if (systemPrompt) {
            fullMessages.push({ role: 'system', content: systemPrompt });
        }
        fullMessages.push(...messages);

        const supabase = getSupabase();
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session?.access_token) {
            throw new Error('Please sign in to use the chat feature.');
        }

        // Call gateway API
        const response = await fetch(`${gatewayUrl}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionData.session.access_token}`,
            },
            body: JSON.stringify({
                messages: fullMessages,
                max_tokens: 8192,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('AI gateway error:', errorText);
            throw new Error(`AI gateway error: ${response.status}`);
        }

        const result = await response.json();
        return result.content || 'No response generated';
    },

    /**
     * Chat with AI via gateway streaming endpoint.
     * Emits events like chat-stream, native-canvas-update, and agent-consulted.
     */
    chatWithAIStream: async (
        messages: ChatMessage[],
        options?: {
            enabledTools?: Record<string, boolean>;
            maxIterations?: number;
            userName?: string;
        }
    ): Promise<void> => {
        const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL;
        if (!gatewayUrl) {
            throw new Error('AI gateway not configured. Please set VITE_AI_GATEWAY_URL.');
        }

        const supabase = getSupabase();
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session?.access_token) {
            throw new Error('Please sign in to use the chat feature.');
        }

        const controller = new AbortController();
        let unlistenStop: (() => void) | null = null;
        try {
            unlistenStop = await listenEvent('stop-generation', () => {
                controller.abort();
            });
        } catch (_err) {
            unlistenStop = null;
        }

        try {
            const response = await fetch(`${gatewayUrl}/chat/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionData.session.access_token}`,
                },
                body: JSON.stringify({
                    messages,
                    enabled_tools: options?.enabledTools,
                    max_iterations: options?.maxIterations,
                    user_name: options?.userName,
                }),
                signal: controller.signal,
            });

            if (!response.ok || !response.body) {
                const errorText = await response.text();
                throw new Error(`AI gateway error: ${response.status} ${errorText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let eventName = 'message';
            let dataLines: string[] = [];
            let done = false;

            while (!done) {
                const { value, done: streamDone } = await reader.read();
                if (streamDone) break;
                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trimEnd();
                    if (trimmed.startsWith('event:')) {
                        eventName = trimmed.slice(6).trim() || 'message';
                    } else if (trimmed.startsWith('data:')) {
                        dataLines.push(trimmed.slice(5).trim());
                    } else if (trimmed === '') {
                        if (dataLines.length > 0) {
                            const data = dataLines.join('\n');
                            let payload: any = data;
                            try {
                                payload = JSON.parse(data);
                            } catch (_err) {
                                payload = data;
                            }

                            if (eventName && eventName !== 'message') {
                                void emitEvent(eventName, payload);
                            }

                            if (eventName === 'chat-stream' && payload?.done) {
                                done = true;
                                break;
                            }
                        }
                        eventName = 'message';
                        dataLines = [];
                    }
                }
            }
        } catch (err: any) {
            if (err?.name === 'AbortError') {
                return;
            }
            throw err;
        } finally {
            if (unlistenStop) {
                unlistenStop();
            }
        }
    },

    /**
     * Generate image via Supabase Edge Function
     * Handles rate limiting and returns usage info
     */
    generateImage: async (prompt: string, _apiKey: string): Promise<string> => {
        const supabase = getSupabase();

        const { data, error } = await supabase.functions.invoke('generate-image', {
            body: { prompt },
        });

        if (error) {
            console.error('Image Edge Function error:', error);
            throw new Error(error.message || 'Image generation unavailable');
        }

        // Handle rate limit response
        if (data.error === 'rate_limit') {
            throw new Error(`${data.message} (${data.current}/${data.limit} today)`);
        }

        if (data.error) {
            throw new Error(data.error);
        }

        // Log usage info
        if (data.usage) {
            console.log(`🖼️ Image usage: ${data.usage.remaining} remaining (${data.usage.tier} tier)`);
        }

        return data.imageUrl;
    },

    /**
     * Get content structure from Supabase Storage
     * Reads the knowledge-base bucket for shared guides
     */
    getContentStructure: async (): Promise<ContentItem[]> => {
        const supabase = getSupabase();

        const { data, error } = await supabase.storage
            .from('knowledge-base')
            .list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });

        if (error) {
            console.error('Failed to list content:', error);
            return [];
        }

        // Transform to ContentItem format
        return (data || []).map(item => ({
            name: item.name,
            path: item.name,
            isDirectory: item.id === null, // Folders have null id
        }));
    },

    /**
     * Read a markdown file from Supabase Storage
     */
    readMarkdownFile: async (path: string): Promise<string> => {
        const supabase = getSupabase();

        const { data, error } = await supabase.storage
            .from('knowledge-base')
            .download(path);

        if (error) {
            console.error('Failed to read file:', error);
            return 'Error loading file content.';
        }

        return await data.text();
    },

    /**
     * Search content (basic text search in database)
     */
    searchContent: async (query: string): Promise<any[]> => {
        const supabase = getSupabase();

        // Search in user_knowledge table
        const { data, error } = await supabase
            .from('user_knowledge')
            .select('*')
            .textSearch('content', query, { type: 'websearch' })
            .limit(20);

        if (error) {
            console.error('Search error:', error);
            return [];
        }

        return data || [];
    },

    // ============================================
    // SESSION MANAGEMENT
    // ============================================

    /**
     * Save session to Supabase
     */
    saveSession: async (name: string, sessionData: SessionData, userId: string): Promise<void> => {
        const supabase = getSupabase();

        const { error } = await supabase
            .from('user_sessions')
            .upsert({
                user_id: userId,
                name,
                session_data: sessionData,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,name',
            });

        if (error) {
            throw new Error(`Failed to save session: ${error.message}`);
        }
    },

    /**
     * Load session from Supabase
     */
    loadSession: async (name: string): Promise<SessionData | null> => {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('user_sessions')
            .select('session_data')
            .eq('name', name)
            .single();

        if (error) {
            console.error('Failed to load session:', error);
            return null;
        }

        return data?.session_data || null;
    },

    /**
     * List all sessions for current user
     */
    listSessions: async (): Promise<string[]> => {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('user_sessions')
            .select('name')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Failed to list sessions:', error);
            return [];
        }

        return (data || []).map(s => s.name);
    },

    // ============================================
    // KNOWLEDGE MANAGEMENT
    // ============================================

    /**
     * Store knowledge to Supabase (web alternative to TKG)
     */
    storeKnowledge: async (
        content: string,
        title: string,
        nodeType: string,
        importance: number,
        userId: string
    ): Promise<void> => {
        const supabase = getSupabase();

        const { error } = await supabase
            .from('user_knowledge')
            .insert({
                user_id: userId,
                title,
                content,
                node_type: nodeType,
                importance,
            });

        if (error) {
            throw new Error(`Failed to store knowledge: ${error.message}`);
        }
    },

    /**
     * Query knowledge from Supabase
     */
    queryKnowledge: async (query: string, limit = 10): Promise<any[]> => {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('user_knowledge')
            .select('*')
            .textSearch('content', query)
            .order('importance', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Knowledge query error:', error);
            return [];
        }

        return data || [];
    },

    // ============================================
    // IMAGE MANAGEMENT
    // ============================================

    /**
     * Save generated image metadata
     */
    saveImage: async (
        prompt: string,
        imageUrl: string,
        style: string,
        userId: string
    ): Promise<void> => {
        const supabase = getSupabase();

        const { error } = await supabase
            .from('user_images')
            .insert({
                user_id: userId,
                prompt,
                image_url: imageUrl,
                style,
            });

        if (error) {
            throw new Error(`Failed to save image: ${error.message}`);
        }
    },

    /**
     * Get user's saved images
     */
    getImages: async (): Promise<any[]> => {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('user_images')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Failed to get images:', error);
            return [];
        }

        return data || [];
    },

    // ============================================
    // TKG (TEMPORAL KNOWLEDGE GRAPH) VIA EDGE FUNCTIONS
    // ============================================

    /**
     * Query knowledge from TKG via Edge Function
     * Uses JWT for authentication - user can only see their own data
     */
    tkgQuery: async (query: string, limit = 5): Promise<any[]> => {
        const supabase = getSupabase();

        const { data, error } = await supabase.functions.invoke('tkg-query', {
            body: { query, limit },
        });

        if (error) {
            console.error('TKG Query error:', error);
            throw new Error(error.message || 'Failed to query knowledge');
        }

        if (data.error) {
            throw new Error(data.error);
        }

        return data.results || [];
    },

    /**
     * Store knowledge to TKG via Edge Function
     * Uses JWT for authentication - data is stored with user's ID
     */
    tkgStore: async (content: string, nodeType = 'FACT', importance = 0.5): Promise<{ id: string }> => {
        const supabase = getSupabase();

        const { data, error } = await supabase.functions.invoke('tkg-store', {
            body: { content, nodeType, importance },
        });

        if (error) {
            console.error('TKG Store error:', error);
            throw new Error(error.message || 'Failed to store knowledge');
        }

        if (data.error) {
            throw new Error(data.error);
        }

        return { id: data.id };
    },
};

export default webApi;

