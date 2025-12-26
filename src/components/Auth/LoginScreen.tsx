import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Key, LogIn, UserPlus, Server } from 'lucide-react';

export const LoginScreen: React.FC = () => {
    const { supabase, configureAuth, isLoading } = useAuth();
    const [isConfiguring, setIsConfiguring] = useState(!supabase);
    const [isSignUp, setIsSignUp] = useState(false);

    // Config State
    const [url, setUrl] = useState('');
    const [key, setKey] = useState('');

    // Auth State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const success = await configureAuth(url, key);
        if (success) {
            setIsConfiguring(false);
        } else {
            setError('Invalid Supabase credentials. Please check your URL and Key.');
        }
        setLoading(false);
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;

        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                // Password Validation
                if (password.length < 12) {
                    throw new Error('Password must be at least 12 characters long.');
                }
                if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
                    throw new Error('Password must contain at least one special character.');
                }

                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;

                if (data.session) {
                    // Auto-login successful (Email confirmation disabled)
                    // No need to set error, the AuthContext listener will redirect
                } else {
                    // Email confirmation required
                    setError('Check your email for the confirmation link!');
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
            <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-8 text-center border-b border-border bg-muted/30">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">
                        {isConfiguring ? 'Connect to Cloud' : (isSignUp ? 'Create Account' : 'Welcome Back')}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {isConfiguring
                            ? 'Enter your Supabase credentials to enable secure, multi-user memory.'
                            : 'Sign in to access your personalized Genesis instance.'}
                    </p>
                </div>

                {/* Form */}
                <div className="p-8">
                    {error && (
                        <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    {isConfiguring ? (
                        <form onSubmit={handleConfig} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Supabase URL</label>
                                <div className="relative">
                                    <Server className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                        placeholder="https://xyz.supabase.co"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Anon Key</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="password"
                                        value={key}
                                        onChange={(e) => setKey(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? 'Connecting...' : 'Connect'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleAuth} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                    placeholder="alex@example.com"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                                ) : (
                                    isSignUp ? <><UserPlus className="w-4 h-4" /> Create Account</> : <><LogIn className="w-4 h-4" /> Sign In</>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Footer Actions */}
                    <div className="mt-6 pt-6 border-t border-border flex justify-between text-sm">
                        {!isConfiguring && (
                            <button
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="text-primary hover:underline"
                            >
                                {isSignUp ? 'Already have an account?' : 'Create an account'}
                            </button>
                        )}
                        <button
                            onClick={() => setIsConfiguring(!isConfiguring)}
                            className="text-muted-foreground hover:text-foreground ml-auto"
                        >
                            {isConfiguring ? 'Back to Login' : 'Configure Server'}
                        </button>
                    </div>

                    {/* Guest Mode Bypass */}
                    <div className="mt-4 pt-4 border-t border-border text-center">
                        <button
                            onClick={() => {
                                localStorage.setItem('guest_mode', 'true');
                                window.location.reload();
                            }}
                            className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                            Or continue as Guest (Local Mode)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
