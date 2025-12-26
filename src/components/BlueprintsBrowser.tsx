import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Folder, RefreshCw, ChevronRight, FileCode, FileText, Image } from 'lucide-react';

interface BlueprintFile {
    name: string;
    path: string;
    is_dir: boolean;
    size?: number;
}

interface BlueprintsBrowserProps {
    onLoadFile: (content: string, type: string) => void;
}

const BlueprintsBrowser: React.FC<BlueprintsBrowserProps> = ({ onLoadFile }) => {
    const [files, setFiles] = useState<BlueprintFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPath, setCurrentPath] = useState<string | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<{ name: string, path: string | null }[]>([{ name: 'Blueprints', path: null }]);

    const loadFiles = async (path: string | null = null) => {
        setLoading(true);
        try {
            const result = await invoke<BlueprintFile[]>('list_blueprint_files', { path });
            setFiles(result);
        } catch (error) {
            console.error('Failed to list files:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFiles(currentPath);
    }, [currentPath]);

    const handleNavigate = (path: string | null, name: string) => {
        setCurrentPath(path);
        if (path === null) {
            setBreadcrumbs([{ name: 'Blueprints', path: null }]);
        } else {
            // Simple breadcrumb logic
            const index = breadcrumbs.findIndex(b => b.path === path);
            if (index !== -1) {
                setBreadcrumbs(breadcrumbs.slice(0, index + 1));
            } else {
                setBreadcrumbs([...breadcrumbs, { name, path }]);
            }
        }
    };

    const handleFileClick = async (file: BlueprintFile) => {
        if (file.is_dir) {
            handleNavigate(file.path, file.name);
        } else {
            setLoading(true);
            try {
                const content = await invoke<string>('read_blueprint_file', { path: file.path });
                // Determine type
                let type = 'markdown';
                if (file.name.endsWith('.html')) type = 'html';
                else if (file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.tsx')) type = 'javascript';
                else if (file.name.endsWith('.css')) type = 'css';
                else if (file.name.endsWith('.json')) type = 'json';

                onLoadFile(content, type);
            } catch (e) {
                console.error('Failed to read file:', e);
                alert('Failed to read file: ' + e);
            } finally {
                setLoading(false);
            }
        }
    };

    const getIcon = (file: BlueprintFile) => {
        if (file.is_dir) return <Folder className="w-4 h-4 text-blue-400" />;
        if (file.name.endsWith('.html') || file.name.endsWith('.tsx') || file.name.endsWith('.jsx')) return <FileCode className="w-4 h-4 text-orange-400" />;
        if (file.name.endsWith('.css')) return <Image className="w-4 h-4 text-pink-400" />;
        return <FileText className="w-4 h-4 text-gray-400" />;
    };

    return (
        <div className="flex flex-col h-full bg-background/50 backdrop-blur-sm">
            {/* Header */}
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <h2 className="font-semibold text-sm">Blueprints</h2>
                <button onClick={() => loadFiles(currentPath)} className="p-1 hover:bg-muted rounded" title="Refresh">
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Breadcrumbs */}
            <div className="px-4 py-2 text-xs flex items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-border/30 scrollbar-hide">
                {breadcrumbs.map((b, i) => (
                    <React.Fragment key={i}>
                        {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                        <button
                            onClick={() => handleNavigate(b.path, b.name)}
                            className={`hover:text-primary transition-colors ${i === breadcrumbs.length - 1 ? 'font-bold text-foreground' : 'text-muted-foreground'}`}
                        >
                            {b.name}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {files.length === 0 && !loading && (
                    <div className="text-center text-muted-foreground text-xs py-8 opacity-70">
                        <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        No blueprints found.
                        <br />Ask the AI to save something!
                    </div>
                )}

                <div className="space-y-1">
                    {files.map((file) => (
                        <button
                            key={file.path}
                            onClick={() => handleFileClick(file)}
                            className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 rounded-lg text-sm text-left transition-colors group"
                        >
                            {getIcon(file)}
                            <span className="truncate flex-1 text-foreground/90">{file.name}</span>
                            {!file.is_dir && (
                                <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 px-1 rounded">
                                    Load
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BlueprintsBrowser;
