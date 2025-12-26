import React, { useRef, useState } from 'react';
import { emitEvent as emit, listenEvent as listen } from '../lib/events';
import { saveMarkdownFile, readMarkdownFile, openExternal, openMediaWindow } from '../lib/tauri-bridge';
import { Copy, Check, Maximize2, Trash2, Save, Loader2, FolderOpen, X } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { useTheme } from '../contexts/ThemeContext';

import FilePickerModal from './FilePickerModal';
import ThreeJSPreview from './ThreeJSPreview';
import ManifoldPreview from './ManifoldPreview';
import PreviewErrorBoundary from './PreviewErrorBoundary';
import YouTubeEmbed from './YouTubeEmbed';

interface DojoCanvasProps {
  content?: string;
  isResizing?: boolean;
  onToggleSecondary?: () => void;
  showSecondary?: boolean;
  canvasId?: string;
  onContentChange?: (content: string) => void;
  onMediaChange?: (media: { type: string; content: string }) => void;
  slotLabel?: string;
}

const DEFAULT_CONTENT = `# Dojo Canvas

This is your ** visual canvas **.

It can be used for:

  - Study guide preview
    - AI - generated lesson layouts
      - Live markdown rendering
        - Visual content blocks later
          - Interactive components in the future

Right now this is the default display.
`;

const HtmlPreview: React.FC<{ content: string }> = ({ content }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const urlRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    // Clean up previous URL before creating new one
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }

    if (!content || content.trim().length === 0) {
      setError('No HTML content provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📄 HtmlPreview: Creating blob URL for content of length:', content.length);
      const blob = new Blob([content], { type: 'text/html' });
      const objectUrl = URL.createObjectURL(blob);
      urlRef.current = objectUrl;
      setUrl(objectUrl);
      setLoading(false);
      console.log('✅ HtmlPreview: Blob URL created:', objectUrl);
    } catch (e) {
      console.error('❌ HtmlPreview: Failed to create blob:', e);
      setError(`Failed to create preview: ${e}`);
      setLoading(false);
    }

    return () => {
      // Cleanup on unmount - delay slightly to allow iframe to finish
      const urlToRevoke = urlRef.current;
      if (urlToRevoke) {
        setTimeout(() => {
          URL.revokeObjectURL(urlToRevoke);
          console.log('🧹 HtmlPreview: Revoked blob URL:', urlToRevoke);
        }, 1000);
      }
    };
  }, [content]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-500/10 text-red-400 p-4">
        <div className="text-center">
          <p className="font-medium">Preview Error</p>
          <p className="text-sm opacity-75 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (loading || !url) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }

  return (
    <iframe
      src={url}
      className="w-full h-full border-none bg-white"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      title="HTML Preview"
      onLoad={() => console.log('✅ HtmlPreview: iframe loaded successfully')}
      onError={() => {
        console.error('❌ HtmlPreview: iframe failed to load');
        setError('Failed to load HTML content in iframe');
      }}
    />
  );
};

const DojoCanvas: React.FC<DojoCanvasProps> = ({
  content: initialContent = DEFAULT_CONTENT,
  isResizing = false,
  onToggleSecondary,
  showSecondary = false,
  canvasId = 'main',
  onContentChange,
  onMediaChange,
}) => {
  const { theme, wallpaper } = useTheme();
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [notebookMode, setNotebookMode] = useState(true);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [mediaPane, setMediaPane] = useState<{ type: 'url' | 'threejs' | 'manifold' | 'html' | 'youtube'; content: string } | null>(null);
  const mediaIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Sync content changes to parent
  React.useEffect(() => {
    if (onContentChange) {
      onContentChange(content);
    }
  }, [content, onContentChange]);

  // Sync media changes to parent
  React.useEffect(() => {
    if (onMediaChange && mediaPane) {
      onMediaChange({ type: mediaPane.type, content: mediaPane.content });
    }
  }, [mediaPane, onMediaChange]);

  // Listen for split-screen media requests and canvas updates
  React.useEffect(() => {
    console.log(`🎯 DojoCanvas[${canvasId}]: Mounting event listeners`);

    const unlistenSplitPromise = listen<{ url?: string; code?: string; type?: 'url' | 'threejs' | 'manifold' | 'html' | 'youtube'; targetId?: string }>('canvas-split', (event) => {
      const { url, code, type, targetId } = event.payload;

      console.log(`📨 DojoCanvas[${canvasId}]: Received 'canvas-split' event`, {
        targetId,
        type,
        hasUrl: !!url,
        hasCode: !!code,
        codeLength: code?.length || 0
      });

      // Filter by targetId if provided, otherwise default to 'main'
      if (targetId && targetId !== canvasId) {
        console.log(`⏭️ DojoCanvas[${canvasId}]: Skipping - targetId '${targetId}' doesn't match`);
        return;
      }
      if (!targetId && canvasId !== 'main') {
        console.log(`⏭️ DojoCanvas[${canvasId}]: Skipping - no targetId and we're not 'main'`);
        return;
      }

      console.log(`✅ DojoCanvas[${canvasId}]: Processing canvas-split event`);

      if (type === 'threejs' && code) {
        console.log(`🎨 DojoCanvas[${canvasId}]: Setting mediaPane to threejs`);
        setMediaPane({ type: 'threejs', content: code });
      } else if (type === 'manifold' && code) {
        console.log(`🧊 DojoCanvas[${canvasId}]: Setting mediaPane to manifold`);
        setMediaPane({ type: 'manifold', content: code });
      } else if (type === 'html' && code) {
        console.log(`📄 DojoCanvas[${canvasId}]: Setting mediaPane to html (${code.length} chars)`);
        setMediaPane({ type: 'html', content: code });
      } else if (type === 'youtube' && url) {
        console.log(`📺 DojoCanvas[${canvasId}]: Setting mediaPane to youtube: ${url}`);
        setMediaPane({ type: 'youtube', content: url });
      } else if (url) {
        // Auto-detect YouTube if type not specified but URL looks like it
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          console.log(`📺 DojoCanvas[${canvasId}]: Auto-detected YouTube URL: ${url}`);
          setMediaPane({ type: 'youtube', content: url });
        } else {
          console.log(`🔗 DojoCanvas[${canvasId}]: Setting mediaPane to url: ${url}`);
          setMediaPane({ type: 'url', content: url });
        }
      } else {
        console.log(`⚠️ DojoCanvas[${canvasId}]: canvas-split event had no valid content`);
      }
    });



    const unlistenClearPromise = listen<{ targetId?: string }>('canvas-clear', (event) => {
      const { targetId } = event.payload || {};

      console.log(`📨 DojoCanvas[${canvasId}]: Received 'canvas-clear' event`, { targetId });

      // Filter by targetId if provided, otherwise default to 'main'
      if (targetId && targetId !== canvasId) {
        console.log(`⏭️ DojoCanvas[${canvasId}]: Skipping clear - targetId doesn't match`);
        return;
      }
      if (!targetId && canvasId !== 'main') {
        console.log(`⏭️ DojoCanvas[${canvasId}]: Skipping clear - no targetId and we're not 'main'`);
        return;
      }

      console.log(`🧹 DojoCanvas[${canvasId}]: Clearing canvas content and mediaPane`);
      setContent('');
      setMediaPane(null);
    });

    const unlistenNativePromise = listen<{ preview?: any; add_block?: any; clear_canvas?: any }>('native-canvas-update', (event) => {
      const { preview, add_block, clear_canvas } = event.payload;
      const targetId = preview?.target || add_block?.target || clear_canvas?.target;

      console.log(`📨 DojoCanvas[${canvasId}]: Received 'native-canvas-update' event`, {
        targetId,
        hasPreview: !!preview,
        hasAddBlock: !!add_block,
        hasClearCanvas: !!clear_canvas,
        previewType: preview?.type,
        addBlockType: add_block?.type
      });

      // Filter by targetId
      if (targetId && targetId !== canvasId) {
        console.log(`⏭️ DojoCanvas[${canvasId}]: Skipping native update - targetId doesn't match`);
        return;
      }
      if (!targetId && canvasId !== 'main') {
        console.log(`⏭️ DojoCanvas[${canvasId}]: Skipping native update - no targetId and we're not 'main'`);
        return;
      }

      console.log(`✅ DojoCanvas[${canvasId}]: Processing native-canvas-update`);

      if (clear_canvas) {
        console.log(`🧹 DojoCanvas[${canvasId}]: Clearing canvas via native update`);
        setContent('');
        setMediaPane(null);
      }

      if (add_block) {
        if (add_block.type === 'md') {
          console.log(`📝 DojoCanvas[${canvasId}]: Adding markdown block (${add_block.content?.length || 0} chars)`);
          setContent((prev) => prev + '\n\n' + add_block.content);
        } else if (add_block.type === 'html') {
          console.log(`📄 DojoCanvas[${canvasId}]: Adding HTML block as media pane (${add_block.content?.length || 0} chars)`);
          setMediaPane({ type: 'html', content: add_block.content });
        } else if (add_block.type === 'text' || add_block.type === 'markdown') {
          console.log(`📝 DojoCanvas[${canvasId}]: Adding text/markdown block (${add_block.content?.length || 0} chars)`);
          setContent((prev) => prev + '\n\n' + add_block.content);
        }
      }

      if (preview) {
        const { type, code, url } = preview;
        if (type === 'threejs' && code) {
          console.log(`🎨 DojoCanvas[${canvasId}]: Native preview -> threejs`);
          setMediaPane({ type: 'threejs', content: code });
        } else if (type === 'manifold' && code) {
          console.log(`🧊 DojoCanvas[${canvasId}]: Native preview -> manifold`);
          setMediaPane({ type: 'manifold', content: code });
        } else if (type === 'html' && code) {
          console.log(`📄 DojoCanvas[${canvasId}]: Native preview -> html (${code.length} chars)`);
          setMediaPane({ type: 'html', content: code });
        } else if (type === 'youtube' && url) {
          console.log(`📺 DojoCanvas[${canvasId}]: Native preview -> youtube: ${url}`);
          setMediaPane({ type: 'youtube', content: url });
        } else if (url) {
          // Auto-detect YouTube
          if (url.includes('youtube.com') || url.includes('youtu.be')) {
            console.log(`📺 DojoCanvas[${canvasId}]: Native preview -> youtube (auto-detected): ${url}`);
            setMediaPane({ type: 'youtube', content: url });
          } else {
            console.log(`🔗 DojoCanvas[${canvasId}]: Native preview -> url: ${url}`);
            setMediaPane({ type: 'url', content: url });
          }
        } else {
          console.log(`⚠️ DojoCanvas[${canvasId}]: Native preview had no valid content`, preview);
        }
      }
    });

    return () => {
      console.log(`🔌 DojoCanvas[${canvasId}]: Unmounting event listeners`);
      unlistenSplitPromise.then((unlisten) => unlisten());
      unlistenClearPromise.then((unlisten) => unlisten());
      unlistenNativePromise.then((unlisten) => unlisten());
    };
  }, [canvasId]);

  // Capture highlighted text so it can be sent to chat as grounding context
  React.useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';
      if (text && text.length > 3) {
        setSelectedText(text);
      } else {
        setSelectedText('');
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Update local content when prop changes, but only if it's not the default
  // This allows the parent to push content, but also allows local loading
  React.useEffect(() => {
    console.log('?? DojoCanvas prop effect running. initialContent:', initialContent.slice(0, 20) + '...');
    if (initialContent !== DEFAULT_CONTENT) {
      console.log('?? Overwriting local content with prop content');
      setContent(initialContent);
    }
  }, [initialContent]);

  const handleSave = async () => {
    if (!content || content === DEFAULT_CONTENT) return;

    const filename = window.prompt('Enter a filename for this guide (e.g., "rust-basics"):');
    if (!filename) return;

    // Ensure filename ends with .md
    const safeFilename = filename.endsWith('.md') ? filename : `${filename}.md`;
    const path = `generated-guides/${safeFilename}`;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      await saveMarkdownFile(path, content);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save file:', error);
      setSaveStatus('error');
      alert('Failed to save file. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadFile = async (path: string) => {
    try {
      const fileContent = await readMarkdownFile(path);
      setContent(fileContent);
    } catch (error) {
      console.error('Failed to load file:', error);
      alert('Failed to load file. Please try again.');
    }
  };

  const isNotebookContent = content.startsWith('#') || content.includes('Study Guide');

  return (
    <div className="h-full flex flex-col gap-4 p-2 relative rounded-2xl border border-border/60 bg-card/70 backdrop-blur">
      <FilePickerModal
        isOpen={showFilePicker}
        onClose={() => setShowFilePicker(false)}
        onSelect={handleLoadFile}
      />

      {/* Header Controls */}
      <div className="flex items-center justify-end gap-3 flex-wrap">
        {/* Dual Canvas Toggle */}
        {onToggleSecondary && (
          <button
            onClick={onToggleSecondary}
            className={`
              flex items-center justify-center w-8 h-8 rounded-lg transition-all
              ${showSecondary
                ? 'bg-primary text-primary-foreground shadow-md'
                : theme === 'soft'
                  ? 'bg-white/50 hover:bg-white/80 text-gray-700'
                  : 'bg-primary/10 hover:bg-primary/20 text-primary'}
            `}
            title={showSecondary ? "Close Split View" : "Open Split View"}
          >
            <span className="text-lg font-bold leading-none mb-0.5">{showSecondary ? '−' : '+'}</span>
          </button>
        )}

        <button
          onClick={() => setShowFilePicker(true)}
          className={`
             flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
             ${theme === 'soft'
              ? 'bg-white/50 hover:bg-white/80 text-gray-700 shadow-sm'
              : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20'}
           `}
          title="Load guide"
        >
          <FolderOpen className="w-3 h-3" />
          Load Guide
        </button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Notebook view</span>
          <button
            type="button"
            onClick={() => setNotebookMode((prev) => !prev)}
            className={`
        relative inline-flex h-5 w-9 items-center rounded-full border border-border
        bg-background/80 transition-all duration-200
        ${notebookMode ? 'bg-primary/20' : 'bg-background/80'}
      `}
            title={notebookMode ? 'Switch to plain view' : 'Switch to notebook paper'}
          >
            <span
              className={`
          inline-block h-4 w-4 transform rounded-full bg-card shadow-sm transition-transform duration-200
          ${notebookMode ? 'translate-x-4' : 'translate-x-1'}
        `}
            />
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || !content || content === DEFAULT_CONTENT}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
            ${theme === 'soft'
              ? 'bg-white/50 hover:bg-white/80 text-gray-700 shadow-sm'
              : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20'}
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          title="Save to Generated Guides"
        >
          {isSaving ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : saveStatus === 'success' ? (
            <Check className="w-3 h-3" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          {isSaving ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : 'Save Guide'}
        </button>

        <div className="h-6 w-px bg-border/50 mx-1" />

        <button
          onClick={() => setContent('')}
          className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-md transition-colors"
          title="Clear Canvas"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          onClick={copyToClipboard}
          className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors"
          title="Copy to clipboard"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Main canvas surface */}
      <div
        className={`
        flex-1
        overflow-hidden
        ${isResizing ? 'transition-none' : 'transition-all duration-300'}
        ${wallpaper ? 'bg-background/40 backdrop-blur-md border border-white/10 shadow-2xl' : 'mancala-panel'}
        rounded-[30px]
        flex flex-col
      `}
      >
        {/* Split Screen Media Pane - Full height for HTML, half for others */}
        {mediaPane && (
          <div className={`${mediaPane.type === 'html' ? 'h-full' : 'h-1/2'} border-b border-border/50 relative bg-black/90 flex flex-col animate-in slide-in-from-top duration-300`}>
            <div className="absolute top-2 right-2 z-10 flex gap-2">
              {mediaPane.type === 'url' && (
                <button
                  onClick={() => openMediaWindow(mediaPane.content, `media-${Date.now()}`)}
                  className="p-1.5 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/80 transition-all"
                  title="Pop out to window"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setMediaPane(null)}
                className="p-1.5 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-red-500/80 transition-all"
                title="Close media"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {mediaPane.type === 'url' ? (
              <>
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-black/70">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        mediaIframeRef.current?.contentWindow?.history.back();
                      } catch (err) {
                        console.error('Failed to navigate back in iframe:', err);
                      }
                    }}
                    className="px-2 py-1 rounded bg-white/10 text-white/80 hover:bg-white/20 hover:text-white text-xs"
                    title="Back"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        mediaIframeRef.current?.contentWindow?.history.forward();
                      } catch (err) {
                        console.error('Failed to navigate forward in iframe:', err);
                      }
                    }}
                    className="px-2 py-1 rounded bg-white/10 text-white/80 hover:bg-white/20 hover:text-white text-xs"
                    title="Forward"
                  >
                    Forward
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        mediaIframeRef.current?.contentWindow?.location.reload();
                      } catch (err) {
                        console.error('Failed to reload iframe:', err);
                      }
                    }}
                    className="px-2 py-1 rounded bg-white/10 text-white/80 hover:bg-white/20 hover:text-white text-xs"
                    title="Reload"
                  >
                    Reload
                  </button>

                  <div className="flex-1 min-w-0 px-2">
                    <span className="text-xs text-white/60 truncate block" title={mediaPane.content}>
                      {mediaPane.content}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openExternal(mediaPane.content).catch((err) => console.error('Failed to open externally:', err))}
                    className="px-2 py-1 rounded bg-white/10 text-white/80 hover:bg-white/20 hover:text-white text-xs"
                    title="Open in default browser"
                  >
                    Open External
                  </button>
                </div>
                <iframe
                  ref={mediaIframeRef}
                  src={mediaPane.content}
                  className="flex-1 w-full border-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </>
            ) : mediaPane.type === 'manifold' ? (
              <PreviewErrorBoundary fallbackMessage="3D Manifold preview failed to render">
                <ManifoldPreview code={mediaPane.content} />
              </PreviewErrorBoundary>
            ) : mediaPane.type === 'html' ? (
              <PreviewErrorBoundary fallbackMessage="HTML preview failed to render">
                <HtmlPreview content={mediaPane.content} />
              </PreviewErrorBoundary>
            ) : mediaPane.type === 'youtube' ? (
              <YouTubeEmbed url={mediaPane.content} />
            ) : (
              <PreviewErrorBoundary fallbackMessage="Three.js preview failed to render">
                <ThreeJSPreview code={mediaPane.content} />
              </PreviewErrorBoundary>
            )}
          </div>
        )}

        {/* Hide markdown content when HTML preview is fullscreen */}
        {(!mediaPane || mediaPane.type !== 'html') && (
          <div className={`w-full overflow-auto p-4 custom-scrollbar ${mediaPane ? 'h-1/2' : 'h-full'}`}>
            {/* Auto-detect study guide output */}
            <MarkdownRenderer
              content={content}
              canvasId={canvasId === 'left' ? 'left' : 'main'}
              variant={notebookMode && isNotebookContent ? 'notebook' : 'default'}
            />
          </div>
        )}
      </div>

      {/* Selection -> Chat context helper */}
      {selectedText && (
        <div className="fixed bottom-4 right-4 z-20 flex items-center gap-2 bg-card border border-border shadow-lg px-3 py-2 rounded-lg">
          <span className="text-xs text-muted-foreground max-w-xs line-clamp-2">
            Selection ready for chat context
          </span>
          <button
            onClick={() => {
              emit('canvas-snippet', { text: selectedText, source: 'Dojo Canvas', canvasId }).catch((err) =>
                console.error('Failed to emit canvas snippet', err)
              );
              setSelectedText('');
              window.getSelection()?.removeAllRanges();
            }}
            className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Use in Chat
          </button>
          <button
            onClick={() => {
              setSelectedText('');
              window.getSelection()?.removeAllRanges();
            }}
            className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default DojoCanvas;
