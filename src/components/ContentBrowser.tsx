import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { FolderOpen, FileText, ChevronRight, BookMarked } from 'lucide-react';

interface ContentItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: ContentItem[];
}

const ContentBrowser: React.FC = () => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadContentStructure();
  }, []);

  // Listen for file changes from the backend
  useEffect(() => {
    const unlisten = listen('content-changed', () => {
      console.log('Content changed, reloading...');
      loadContentStructure();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const loadContentStructure = async () => {
    try {
      setLoading(true);
      const structure = await invoke<ContentItem[]>('get_content_structure');
      setContent(structure);
    } catch (error) {
      console.error('Failed to load content:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFile = async (path: string) => {
    try {
      setLoading(true);
      setSelectedFile(path);
      const content = await invoke<string>('read_markdown_file', { path });
      setFileContent(content);
    } catch (error) {
      console.error('Failed to load file:', error);
      setFileContent('Error loading file content.');
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

  const renderContentTree = (items: ContentItem[], depth = 0) => {
    return items.map((item) => {
      const isExpanded = expandedFolders.has(item.path);

      if (item.type === 'directory') {
        return (
          <div key={item.path}>
            <button
              onClick={() => toggleFolder(item.path)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/20 rounded-lg text-left transition-colors"
              style={{ paddingLeft: `${depth * 16 + 12}px` }}
            >
              <ChevronRight
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
              <FolderOpen className="w-4 h-4 text-warning" />
              <span className="text-sm text-foreground">{item.name}</span>
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
          onClick={() => loadFile(item.path)}
          className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/20 rounded-lg text-left transition-colors
            ${selectedFile === item.path ? 'bg-primary/20 border-l-2 border-primary' : ''}
          `}
          style={{ paddingLeft: `${depth * 16 + 28}px` }}
        >
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-sm text-foreground">{item.name}</span>
        </button>
      );
    });
  };

  return (
    <div className="flex h-full bg-transparent gap-2 p-2">
      {/* File Tree */}
      <div className="w-80 glass-panel border-r-0 overflow-y-auto m-2 rounded-xl">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-primary" />
            Your Knowledge Base
          </h2>
          <p className="text-xs text-muted-foreground mt-1">259+ guides organized by topic</p>
        </div>

        <div className="p-2">
          {loading && !content.length ? (
            <div className="text-center py-8 text-muted-foreground">Loading guides...</div>
          ) : (
            renderContentTree(content)
          )}
        </div>
      </div>

      {/* Content Viewer */}
      <div className="flex-1 overflow-y-auto">
        {selectedFile ? (
          <div className="max-w-4xl mx-auto p-8">
            <div className="glass-card rounded-lg p-8">
              <div className="markdown-content max-w-none">
                {loading ? (
                  <div className="text-muted-foreground">Loading content...</div>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(fileContent) }} />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <BookMarked className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold text-muted-foreground mb-2">
                Select a guide to start learning
              </h3>
              <p className="text-muted-foreground">
                Browse the knowledge base on the left
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Simple markdown to HTML converter (you can replace with a library later)
function renderMarkdown(markdown: string): string {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Code blocks
  html = html.replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>');

  // Inline code
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');

  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';

  return html;
}

export default ContentBrowser;
