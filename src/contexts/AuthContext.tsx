import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseClient } from '../lib/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    supabase: SupabaseClient | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    configureAuth: (url: string, key: string) => Promise<boolean>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize Supabase client lazily from localStorage to avoid double-init
    const [supabase, setSupabase] = useState<SupabaseClient | null>(() => {
        const savedUrl = localStorage.getItem('supabase_url') || import.meta.env.VITE_SUPABASE_URL;
        const savedKey = localStorage.getItem('supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (savedUrl && savedKey) {
            try {
                return createSupabaseClient(savedUrl, savedKey);
            } catch (e) {
                console.error("Failed to create Supabase client from stored credentials:", e);
                return null;
            }
        }
        return null;
    });

    useEffect(() => {
        let mounted = true;

        const initSession = async () => {
            if (!supabase) {
                if (mounted) setIsLoading(false);
                return;
            }

            try {
                const { data: { session: currentSession }, error } = await supabase.auth.getSession();

                if (error) throw error;

                if (mounted) {
                    setSession(currentSession);
                    setUser(currentSession?.user ?? null);
                }

                const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                    if (mounted) {
                        setSession(session);
                        setUser(session?.user ?? null);
                    }
                });

                return () => {
                    subscription.unsubscribe();
                };
            } catch (error) {
                console.error('Failed to initialize Supabase session:', error);
                // If session init fails, we might want to clear invalid credentials or just let the user re-login
                if (mounted) {
                    // Optional: localStorage.removeItem('supabase_url');
                    // Optional: localStorage.removeItem('supabase_key');
                    // setSupabase(null); 
                }
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        const cleanupPromise = initSession();

        return () => {
            mounted = false;
            // Cleanup subscription if it was created
            cleanupPromise.then(cleanup => cleanup && cleanup());
        };
    }, [supabase]);

    const configureAuth = async (url: string, key: string) => {
        try {
            const client = createSupabaseClient(url, key);
            // Verify credentials by trying to get session
            const { error } = await client.auth.getSession();
            if (error) throw error;

            localStorage.setItem('supabase_url', url);
            localStorage.setItem('supabase_key', key);

            setSupabase(client);
            return true;
        } catch (error) {
            console.error('Invalid Supabase credentials:', error);
            return false;
        }
    };

    const signOut = async () => {
        if (supabase) {
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                supabase,
                isLoading,
                isAuthenticated: !!user,
                configureAuth,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
