import React, { useState } from 'react';
import { X, Save, CheckSquare, Square } from 'lucide-react';

interface SaveSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, options: { chat: boolean; mainCanvas: boolean; leftCanvas: boolean; visuals: boolean }) => void;
}

const SaveSessionModal: React.FC<SaveSessionModalProps> = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [options, setOptions] = useState({
        chat: true,
        mainCanvas: true,
        leftCanvas: true,
        visuals: true,
    });

    if (!isOpen) return null;

    const toggleOption = (key: keyof typeof options) => {
        setOptions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = () => {
        if (!name.trim()) return;
        onSave(name, options);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/30">
                    <div className="flex items-center gap-2">
                        <Save className="w-5 h-5 text-primary" />
                        <h2 className="font-semibold text-lg">Save Session Snapshot</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Session Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Quantum Physics Study"
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-muted-foreground">Include in Snapshot</label>

                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { key: 'chat', label: 'Chat History', desc: 'Preserve the conversation context' },
                                { key: 'mainCanvas', label: 'Main Canvas', desc: 'Content from the right editor' },
                                { key: 'leftCanvas', label: 'Scratchpad', desc: 'Content from the left editor' },
                                { key: 'visuals', label: 'Visuals & Media', desc: 'Three.js scenes and active videos' },
                            ].map((item) => (
                                <button
                                    key={item.key}
                                    onClick={() => toggleOption(item.key as keyof typeof options)}
                                    className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors text-left"
                                >
                                    <div className={`mt-0.5 ${options[item.key as keyof typeof options] ? 'text-primary' : 'text-muted-foreground'}`}>
                                        {options[item.key as keyof typeof options] ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm">{item.label}</div>
                                        <div className="text-xs text-muted-foreground">{item.desc}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border/50 bg-muted/30 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Save Snapshot
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SaveSessionModal;
