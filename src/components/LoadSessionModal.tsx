import React, { useState, useEffect } from 'react';
import { X, Upload, FileJson, Loader2, Clock } from 'lucide-react';
import { api } from '../lib/api';

interface LoadSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoad: (data: any) => void;
}

const LoadSessionModal: React.FC<LoadSessionModalProps> = ({ isOpen, onClose, onLoad }) => {
    const [sessions, setSessions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadSessions();
        }
    }, [isOpen]);

    const loadSessions = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const list = await api.listSessions();
            setSessions(list);
        } catch (err) {
            console.error('Failed to list sessions:', err);
            setError('Failed to load session list.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoad = async (name: string) => {
        setIsLoading(true);
        try {
            const data = await api.loadSession(name);
            if (!data) {
                throw new Error('Session not found.');
            }
            onLoad(data);
            onClose();
        } catch (err) {
            console.error('Failed to load session:', err);
            setError(`Failed to load session "${name}".`);
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/30 shrink-0">
                    <div className="flex items-center gap-2">
                        <Upload className="w-5 h-5 text-primary" />
                        <h2 className="font-semibold text-lg">Load Session</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                    {isLoading && sessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <p>Loading sessions...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-400">
                            <p>{error}</p>
                            <button
                                onClick={loadSessions}
                                className="mt-2 text-sm underline hover:text-red-300"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileJson className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No saved sessions found.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {sessions.map((session) => (
                                <button
                                    key={session}
                                    onClick={() => handleLoad(session)}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all text-left group"
                                >
                                    <div className="p-2 rounded-md bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                                        <FileJson className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">{session}</div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>Saved Session</span>
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                                        Load
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border/50 bg-muted/30 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoadSessionModal;
