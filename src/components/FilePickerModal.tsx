import React, { useState, useEffect } from 'react';
import { getContentStructure, ContentItem } from '../lib/tauri-bridge';
import { FolderOpen, FileText, ChevronRight, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import ReactDOM from 'react-dom';



interface FilePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (path: string) => void;
}

const FilePickerModal: React.FC<FilePickerModalProps> = ({ isOpen, onClose, onSelect }) => {
    const { theme } = useTheme();
    const [content, setContent] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            loadContentStructure();
        }
    }, [isOpen]);

    const loadContentStructure = async () => {
        try {
            setLoading(true);
            const structure = await getContentStructure();
            setContent(structure);
        } catch (error) {
            console.error('Failed to load content:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleFolder = (path: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        setExpandedFolders(newExpanded);
    };

    const handleFileClick = (path: string) => {
        onSelect(path);
        onClose();
    };

    const renderContentTree = (items: ContentItem[], depth = 0) => {
        return items.map((item) => {
            const isExpanded = expandedFolders.has(item.path);

            if (item.type === 'directory') {
                return (
                    <div key={item.path}>
                        <button
                            onClick={() => toggleFolder(item.path)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors
                ${theme === 'soft' ? 'hover:bg-black/5' : 'hover:bg-white/10'}
              `}
                            style={{ paddingLeft: `${depth * 16 + 12}px` }}
                        >
                            <ChevronRight
                                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''} text-muted-foreground`}
                            />
                            <FolderOpen className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm text-foreground truncate">{item.name}</span>
                        </button>
                        {isExpanded && item.children && (
                            <div>{renderContentTree(item.children, depth + 1)}</div>
                        )}
                    </div>
                );
            }

            return (
                <button
                    key={item.path}
                    onClick={() => handleFileClick(item.path)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors group
            ${theme === 'soft' ? 'hover:bg-blue-500/10' : 'hover:bg-primary/20'}
          `}
                    style={{ paddingLeft: `${depth * 16 + 28}px` }}
                >
                    <FileText className={`w-4 h-4 ${theme === 'soft' ? 'text-blue-500' : 'text-primary'} group-hover:scale-110 transition-transform`} />
                    <span className="text-sm text-foreground truncate">{item.name}</span>
                </button>
            );
        });
    };

    // Use Portal to render outside of the current stacking context
    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md h-[600px] z-[9999] flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-white/20
              ${theme === 'soft' ? 'bg-[#EFF1F5]' : 'bg-background/95 backdrop-blur-xl'}
            `}
                    >
                        {/* Header */}
                        <div className={`p-4 border-b flex items-center justify-between
              ${theme === 'soft' ? 'border-gray-200 bg-white/50' : 'border-white/10 bg-black/20'}
            `}>
                            <h3 className="font-semibold text-lg">Load from Knowledge Base</h3>
                            <button
                                onClick={onClose}
                                className={`p-2 rounded-full transition-colors
                  ${theme === 'soft' ? 'hover:bg-black/5 text-gray-500' : 'hover:bg-white/10 text-muted-foreground'}
                `}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <p>Loading knowledge base...</p>
                                </div>
                            ) : content.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
                                    <FolderOpen className="w-12 h-12 mb-4 opacity-50" />
                                    <p>No guides found in the knowledge base.</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {renderContentTree(content)}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className={`p-3 text-xs text-center text-muted-foreground border-t
               ${theme === 'soft' ? 'border-gray-200 bg-white/30' : 'border-white/10 bg-black/10'}
            `}>
                            Select a markdown file to load into the canvas
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default FilePickerModal;
