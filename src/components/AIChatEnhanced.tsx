import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { emitEvent as emit, listenEvent as listen } from '../lib/events';
import { Brain, Send, Sparkles, Bot, Zap, ChevronDown, Loader2, RotateCcw, Wrench, Lightbulb, Pin, Paperclip, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme, Theme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import genesisAvatar from '../assets/genesis-avatar.png';
import userAvatar from '../assets/user-avatar.png';
import hawkeyeLogo from '../assets/hawkeye-logo.png';
import { DeepResearchPreview, ResearchStep } from './DeepResearchPreview';

// Theme-specific code block colors
const getCodeBlockColors = (theme: Theme) => {
  const colors: Record<Theme, { border: string; borderLight: string; headerBg: string; textColor: string; glow: string; bgGradient: string }> = {
    dark: { border: 'rgba(168, 85, 247, 0.5)', borderLight: 'rgba(168, 85, 247, 0.3)', headerBg: 'rgba(88, 28, 135, 0.3)', textColor: '#e9d5ff', glow: 'rgba(168, 85, 247, 0.15)', bgGradient: '#000000' },
    light: { border: 'rgba(100, 100, 120, 0.4)', borderLight: 'rgba(100, 100, 120, 0.2)', headerBg: 'rgba(200, 200, 210, 0.5)', textColor: '#e0e0e8', glow: 'rgba(100, 100, 120, 0.1)', bgGradient: '#000000' },
    cosmic: { border: 'rgba(0, 200, 255, 0.6)', borderLight: 'rgba(0, 200, 255, 0.3)', headerBg: 'rgba(0, 50, 100, 0.4)', textColor: '#7dd3fc', glow: 'rgba(0, 200, 255, 0.2)', bgGradient: '#000000' },
    cream: { border: 'rgba(139, 90, 43, 0.4)', borderLight: 'rgba(139, 90, 43, 0.2)', headerBg: 'rgba(245, 235, 220, 0.6)', textColor: '#d4a574', glow: 'rgba(139, 90, 43, 0.1)', bgGradient: '#000000' },
    soft: { border: 'rgba(150, 150, 170, 0.4)', borderLight: 'rgba(150, 150, 170, 0.2)', headerBg: 'rgba(240, 240, 245, 0.6)', textColor: '#b0b0c0', glow: 'rgba(150, 150, 170, 0.1)', bgGradient: '#000000' },
    hawkeye: { border: 'rgba(255, 180, 0, 0.5)', borderLight: 'rgba(255, 180, 0, 0.3)', headerBg: 'rgba(100, 60, 10, 0.4)', textColor: '#ffd700', glow: 'rgba(255, 180, 0, 0.15)', bgGradient: '#000000' },
    gielinor: { border: 'rgba(255, 180, 0, 0.5)', borderLight: 'rgba(255, 180, 0, 0.3)', headerBg: 'rgba(80, 50, 10, 0.4)', textColor: '#ffff00', glow: 'rgba(255, 200, 0, 0.2)', bgGradient: '#000000' },
    forest: { border: 'rgba(34, 197, 94, 0.5)', borderLight: 'rgba(34, 197, 94, 0.3)', headerBg: 'rgba(20, 80, 40, 0.4)', textColor: '#86efac', glow: 'rgba(34, 197, 94, 0.15)', bgGradient: '#000000' },
    nebula: { border: 'rgba(236, 72, 153, 0.5)', borderLight: 'rgba(236, 72, 153, 0.3)', headerBg: 'rgba(100, 20, 60, 0.4)', textColor: '#f9a8d4', glow: 'rgba(236, 72, 153, 0.15)', bgGradient: '#000000' },
    matrix: { border: 'rgba(0, 255, 136, 0.6)', borderLight: 'rgba(0, 255, 136, 0.3)', headerBg: 'rgba(0, 40, 25, 0.6)', textColor: '#00ff88', glow: 'rgba(0, 255, 136, 0.25)', bgGradient: '#000000' },
  };
  return colors[theme] || colors.dark;
};

// Markdown components factory - takes theme to apply theme-specific styling
const createMarkdownComponents = (theme: Theme) => ({
  code: ({ node, className, children, ...props }: any) => {
    const isInline = props.inline;
    const codeContent = String(children).replace(/\n$/, '');
    const colors = getCodeBlockColors(theme);

    // Detect language from className
    const match = /language-(\w+)/.exec(className || '');
    const lang = match ? match[1] : '';

    // Auto-detect HTML content even if no language specified
    const looksLikeHtml = !lang && (
      codeContent.trim().toLowerCase().startsWith('<!doctype') ||
      codeContent.trim().toLowerCase().startsWith('<html') ||
      codeContent.trim().toLowerCase().startsWith('<head') ||
      codeContent.trim().toLowerCase().startsWith('<body') ||
      (codeContent.includes('<style>') && codeContent.includes('</style>')) ||
      (codeContent.includes('<script>') && codeContent.includes('</script>'))
    );

    const previewableLanguages = ['html', 'htm', 'javascript', 'js', 'css', 'svg'];
    const effectiveLang = lang || (looksLikeHtml ? 'html' : '');
    const isPreviewable = !isInline && (previewableLanguages.includes(effectiveLang.toLowerCase()) || looksLikeHtml);

    const handlePreviewInCanvas = () => {
      let htmlContent = codeContent;

      if (effectiveLang.toLowerCase() === 'javascript' || effectiveLang.toLowerCase() === 'js') {
        htmlContent = `<!DOCTYPE html><html><head><title>JS Preview</title></head><body><script>${codeContent}</script></body></html>`;
      } else if (effectiveLang.toLowerCase() === 'css') {
        htmlContent = `<!DOCTYPE html><html><head><style>${codeContent}</style></head><body><div>CSS Preview</div></body></html>`;
      } else if (effectiveLang.toLowerCase() === 'svg') {
        htmlContent = `<!DOCTYPE html><html><head><style>body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#1a1a2e;}</style></head><body>${codeContent}</body></html>`;
      }

      emit('canvas-split', { code: htmlContent, type: 'html', targetId: 'main' })
        .catch((err) => console.error('Failed to preview in canvas:', err));
    };

    if (isInline) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }

    const showHeader = lang || isPreviewable;

    return (
      // Single container with theme-aware border
      <div className="my-3 rounded-lg overflow-hidden" style={{ border: `1px solid ${colors.border}`, boxShadow: `0 10px 15px -3px ${colors.glow}` }}>
        {/* Header bar */}
        {showHeader && (
          <div className="flex items-center justify-between px-4 py-2" style={{ background: colors.headerBg, borderBottom: `1px solid ${colors.borderLight}` }}>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: colors.textColor }}>
              {lang || (looksLikeHtml ? 'html (detected)' : 'code')}
            </span>
            {isPreviewable && (
              <button
                onClick={handlePreviewInCanvas}
                className="text-xs px-3 py-1 rounded-md font-medium transition-all duration-200"
                style={{ background: colors.borderLight, color: colors.textColor }}
                title="Preview this code in the canvas"
              >
                ▶ Preview
              </button>
            )}
          </div>
        )}
        {/* Code area */}
        <pre className="p-4 overflow-x-auto m-0" style={{ background: colors.bgGradient, border: 'none', borderRadius: 0, margin: 0 }}>
          <code className={`${className} font-mono text-sm leading-relaxed`} style={{ color: colors.textColor, textShadow: `0 0 10px ${colors.glow}`, background: 'transparent', border: 'none', padding: 0 }} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  },
  blockquote: ({ children }: any) => (
    <blockquote style={{
      borderLeftColor: 'rgb(var(--accent))',
      color: 'rgb(var(--muted-foreground))',
      paddingLeft: '1em',
      marginLeft: '0'
    }}>
      {children}
    </blockquote>
  ),
  h1: ({ children }: any) => <h1 style={{ color: 'rgb(var(--foreground))' }}>{children}</h1>,
  h2: ({ children }: any) => <h2 style={{ color: 'rgb(var(--foreground))' }}>{children}</h2>,
  h3: ({ children }: any) => <h3 style={{ color: 'rgb(var(--foreground))' }}>{children}</h3>,
  strong: ({ children }: any) => <strong style={{ color: 'rgb(var(--foreground))', fontWeight: '600' }}>{children}</strong>,
  a: ({ children, href }: any) => (
    <a href={href} style={{ color: 'rgb(var(--accent))', textDecoration: 'underline' }}>
      {children}
    </a>
  ),
  p: ({ children }: any) => <p style={{ color: 'inherit', marginTop: '1em', marginBottom: '1em' }}>{children}</p>,
  ul: ({ children }: any) => <ul style={{ color: 'inherit', marginTop: '1em', marginBottom: '1em' }}>{children}</ul>,
  ol: ({ children }: any) => <ol style={{ color: 'inherit', marginTop: '1em', marginBottom: '1em' }}>{children}</ol>,
  li: ({ children }: any) => <li style={{ color: 'inherit' }}>{children}</li>,
});

// Memoized message component to prevent unnecessary re-renders
const MessageItem = memo(({ message, streamingMessageId, currentStreamedContent, theme, researchSteps, isLatest, textScale }: {
  message: Message;
  streamingMessageId: string | null;
  currentStreamedContent: string;
  theme: Theme;
  researchSteps?: ResearchStep[];
  isLatest?: boolean;
  textScale: number;
}) => {
  const isStreaming = message.id === streamingMessageId;
  const displayContent = isStreaming ? currentStreamedContent : message.content;
  const isCream = theme === 'cream';
  const renderMarkdownContent = (content: string) => {
    // Split content by <think> tags
    const thinkRegex = /<think(?:\s.*?)?>([\s\S]*?)<\/think>/gi;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = thinkRegex.exec(content)) !== null) {
      // Add text before the think block
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.substring(lastIndex, match.index)
        });
      }

      // Add the think block
      parts.push({
        type: 'think',
        content: match[1]
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex)
      });
    }

    // If no think tags found, just render the content
    if (parts.length === 0) {
      return <ReactMarkdown remarkPlugins={[remarkGfm]} components={createMarkdownComponents(theme)}>{content}</ReactMarkdown>;
    }

    return parts.map((part, index) => {
      if (part.type === 'think') {
        return (
          <details key={index} className="mb-4 rounded-lg border border-border/50 bg-muted/30 overflow-hidden group">
            <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors text-xs font-medium text-muted-foreground select-none">
              <Brain className="w-3 h-3" />
              <span>Thinking Process</span>
              <ChevronDown className="w-3 h-3 ml-auto transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border/50 bg-muted/20 font-mono whitespace-pre-wrap">
              {part.content}
            </div>
          </details>
        );
      }
      return (
        <ReactMarkdown key={index} remarkPlugins={[remarkGfm]} components={createMarkdownComponents(theme)}>
          {part.content}
        </ReactMarkdown>
      );
    });
  };

  return (
    <div>
      <div
        className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
      >
        {message.role === 'assistant' && (
          <div className="flex-shrink-0">
            <img
              src={genesisAvatar}
              alt="Genesis AI"
              className="w-10 h-10 rounded-full object-cover border-2 border-primary/20 shadow-sm"
            />
          </div>
        )}

        <div
          className={`max-w-[85%] p-4 rounded-2xl shadow-sm transition-all duration-300 ${theme === 'soft' && message.role === 'user' ? 'neumorphic-outset text-gray-800' : ''
            } ${message.role === 'tool'
              ? 'w-full font-mono text-sm overflow-x-auto'
              : ''
            }`}
          style={{
            backgroundColor: theme === 'soft'
              ? (message.role === 'user' ? '#EFF1F5' : 'transparent')
              : (message.role === 'user' ? 'rgba(var(--primary), 0.2)' :
                message.role === 'tool' ? 'rgba(var(--accent), 0.1)' :
                  'rgba(var(--card), 0.5)'),
            borderColor: theme === 'soft'
              ? 'transparent'
              : (message.role === 'user' ? 'rgba(var(--primary), 0.3)' :
                message.role === 'tool' ? 'rgba(var(--accent), 0.2)' :
                  'rgba(var(--border), 0.5)'),
            color: theme === 'soft'
              ? (message.role === 'user' ? '#1A202C' : '#4A5568')
              : (message.role === 'user' ? (isCream ? 'rgb(var(--foreground))' : 'rgb(var(--primary-foreground))') :
                message.role === 'tool' ? 'rgb(var(--accent-foreground))' :
                  'rgb(var(--foreground))')
          }}
        >
          {message.role === 'tool' && (
            <div className="flex items-center gap-2 mb-2 text-xs" style={{ color: 'rgb(var(--accent))' }}>
              <Wrench className="w-3 h-3" />
              <span>Tool Execution Result</span>
            </div>
          )}

          {message.role === 'assistant' && message.tool_calls && message.tool_calls.length > 0 && (
            <div className="mb-3 p-2 rounded border" style={{ backgroundColor: 'rgba(var(--primary), 0.1)', borderColor: 'rgba(var(--primary), 0.3)' }}>
              <div className="text-xs font-semibold mb-1" style={{ color: 'rgb(var(--primary))' }}>
                🔧 Tool Calls ({message.tool_calls.length}):
              </div>
              {message.tool_calls.map((tool, i) => (
                <div key={i} className="text-xs pl-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  • {tool.function.name}
                </div>
              ))}
              {message.tool_calls.some(t => t.function.name === 'deep_research') && isLatest && researchSteps && (
                <div className="mt-2">
                  <DeepResearchPreview steps={researchSteps} isComplete={false} />
                </div>
              )}
            </div>
          )}


          <div className="prose max-w-none markdown-content" style={{
            color: 'inherit',
            fontSize: `${textScale}em`,
          } as React.CSSProperties}>
            {renderMarkdownContent(displayContent)}
          </div>
          <p className="text-xs mt-2 opacity-50">
            {message.timestamp
              ? new Date(message.timestamp).toLocaleTimeString()
              : new Date().toLocaleTimeString()}
            {isStreaming && (
              <span className="ml-2 animate-pulse">• Typing...</span>
            )}
          </p>
        </div>

        {message.role === 'user' && (
          <div className="flex-shrink-0">
            <img
              src={userAvatar}
              alt="User"
              className="w-10 h-10 rounded-full object-cover border-2 border-primary/20 shadow-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
});

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  // Content used when sending back to the model (may include hidden context like <think> blocks or attachments).
  modelContent?: string;
  timestamp?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface AttachedFile {
  name: string;
  content: string;
}

interface CanvasSnippetContext {
  text: string;
  source?: string;
  canvasId?: string;
}

type AIProvider = 'minimax' | 'grok';

interface AIChatEnhancedProps {
  apiKey: string;
  onSendToCanvas?: (content: string) => void;
}

const AIChatEnhanced: React.FC<AIChatEnhancedProps> = ({ apiKey, onSendToCanvas }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const tavilyApiKey = localStorage.getItem('tavily_api_key') || '';
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(() => {
    return (localStorage.getItem('selected_ai_provider') as AIProvider) || 'minimax';
  });
  const grokApiKey = localStorage.getItem('grok_api_key') || '';

  useEffect(() => {
    localStorage.setItem('selected_ai_provider', selectedProvider);
  }, [selectedProvider]);

  const defaultMessage = {
    id: '1',
    role: 'assistant' as const,
    content: `Hi! I'm your **Enhanced Digital Tutor** powered by MiniMax M2 with **agent capabilities**! 🚀

I can now:

🧮 **Use Tools**
- Calculate math expressions
- Search your knowledge base
- Generate study guides
- List available resources
- **Web search** (with Tavily API)
- **Write files** to your knowledge base!
- **Create 3D CAD models** (using Manifold)! 🧊

💭 **Show My Thinking**
- You'll see my reasoning process
- Understand how I solve problems
- Learn my problem-solving approach

📚 **Chat with Context**
- Multi-turn conversations with memory
- Tool calling when needed
- Structured study guide generation

**Try asking:**
- "Calculate (25 + 75) * 3 / 2"
- "Search for information about ADHD"
- "Create a beginner study guide for Rust"
- "What markdown files are available?"
- "Search the web for latest AI trends 2025"
- "Write a study note to research/my-new-guide.md"

What would you like to explore today?`,
    timestamp: new Date().toISOString(),
  };

  const [messages, setMessages] = useState<Message[]>(() => {
    // Use user-specific key if available, otherwise fallback to guest
    const storageKey = user?.id ? `chat_messages_${user.id}` : 'chat_messages_guest';
    const saved = localStorage.getItem(storageKey);
    console.log('💾 Loading messages from localStorage:', storageKey, saved);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log('✅ Parsed messages:', parsed);
        return parsed;
      } catch (error) {
        console.error('❌ Failed to parse saved messages:', error);
        return [defaultMessage];
      }
    }
    console.log('📝 No saved messages, using default');
    return [defaultMessage];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showThinking] = useState(true);
  const [currentThinking, setCurrentThinking] = useState<string[]>([]);
  const [toolCallsCount, setToolCallsCount] = useState(0);
  const [iterationsCount, setIterationsCount] = useState(0);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [currentStreamedContent, setCurrentStreamedContent] = useState('');
  const streamingMessageIdRef = useRef<string | null>(null);
  const currentStreamedContentRef = useRef<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [, setIsComposing] = useState(false);
  const [lastStudyGuide, setLastStudyGuide] = useState<string>('');
  const [, setLastBrainstorm] = useState<string>('');
  const [researchSteps, setResearchSteps] = useState<ResearchStep[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [canvasSnippet, setCanvasSnippet] = useState<CanvasSnippetContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const [appMode, setAppMode] = useState<'developer' | 'student'>('developer');
  const [textScale, setTextScale] = useState<number>(() => {
    const savedScale = parseFloat(localStorage.getItem('chat_text_scale') || '1');
    if (!Number.isFinite(savedScale)) return 1;
    return Math.min(1.6, Math.max(0.8, savedScale));
  });

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();

      setTextScale((prev) => {
        const delta = e.deltaY < 0 ? 0.05 : -0.05;
        const next = Math.min(1.6, Math.max(0.8, parseFloat((prev + delta).toFixed(2))));
        localStorage.setItem('chat_text_scale', next.toString());
        return next;
      });
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    invoke<any>('get_app_mode')
      .then((info) => {
        const mode = info?.mode === 'student' ? 'student' : 'developer';
        setAppMode(mode);

        if (mode === 'student') {
          setEnabledTools((prev) => ({
            ...prev,
            write_file_batch: false,
            run_terminal_command: false,
          }));
        }
      })
      .catch((err) => {
        console.warn('Failed to load app mode:', err);
      });
  }, []);

  const sendLastAssistantToCanvas = useCallback(() => {
    if (!onSendToCanvas) return;
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (lastAssistant) {
      onSendToCanvas(lastAssistant.content);
    }
  }, [messages, onSendToCanvas]);

  // Tool toggling state with localStorage persistence
  const [enabledTools, setEnabledTools] = useState<Record<string, boolean>>(() => {
    const defaults = {
      'calculate': true,
      'search_knowledge': true,
      'read_file': true,
      'list_markdown_files': true,
      'create_study_guide': true,
      'write_file': true,
      'web_search': true,
      'brainstorm_with_grok': true,
      'consult_agent': true,
      'scan_codebase': true,
      'start_debate': true,
      'write_file_batch': true,
      'run_terminal_command': true,
      'tkg_search': true,
      'tkg_store': true,
      'deep_research': true,
    };

    const saved = localStorage.getItem('enabled_tools');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge saved with defaults to ensure new tools appear
        return { ...defaults, ...parsed };
      } catch (error) {
        console.error('Failed to parse enabled tools:', error);
      }
    }
    return defaults;
  });

  // Save enabled tools to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('enabled_tools', JSON.stringify(enabledTools));
    console.log('💾 Saved enabled tools:', enabledTools);
  }, [enabledTools]);

  // Handle tool toggle

  useEffect(() => {
    streamingMessageIdRef.current = streamingMessageId;
  }, [streamingMessageId]);

  // Update ref synchronously with state
  const setCurrentStreamedContentSync = (updater: string | ((prev: string) => string)) => {
    const newValue = typeof updater === 'function' ? (updater as (prev: string) => string)(currentStreamedContentRef.current) : updater;
    currentStreamedContentRef.current = newValue;
    setCurrentStreamedContent(newValue);
  };

  const handleStop = async () => {
    await emit('stop-generation');
    setLoading(false);
    setStreamingMessageId(null);
  };

  const scrollToBottom = (instant = false) => {
    if (scrollContainerRef.current) {
      const { scrollHeight, clientHeight } = scrollContainerRef.current;
      scrollContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: instant ? 'auto' : 'smooth'
      });
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // Consider "at bottom" if within 50px of the bottom
    const isBottom = scrollHeight - scrollTop - clientHeight < 50;
    isAtBottomRef.current = isBottom;
  };

  // Debounced localStorage save to prevent excessive writes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const storageKey = user?.id ? `chat_messages_${user.id}` : 'chat_messages_guest';
      console.log('💾 Saving messages to localStorage:', storageKey, messages.length, 'messages');
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }, 500); // Save only after 500ms of inactivity

    return () => clearTimeout(timeoutId);
  }, [messages, user?.id]); // Re-run when messages or user changes

  useEffect(() => {
    // Only auto-scroll if we were already at the bottom
    if (isAtBottomRef.current) {
      scrollToBottom(true); // Use instant scroll for updates to prevent jitter
    }
  }, [messages, currentThinking]);

  // Receive highlighted DojoCanvas text as grounding context for the next message
  useEffect(() => {
    const unlistenPromise = listen<CanvasSnippetContext>('canvas-snippet', (event) => {
      const text = (event.payload?.text || '').toString().trim();
      if (!text) return;
      setCanvasSnippet({
        text,
        source: event.payload?.source,
        canvasId: event.payload?.canvasId,
      });
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Listen for streaming events
  useEffect(() => {
    const unlistenPromise = listen<{
      content: string;
      is_thinking: boolean;
      done: boolean;
      tool_calls?: ToolCall[];
    }>('chat-stream', (event) => {
      const chunk = event.payload;

      if (chunk.content) {
        setCurrentStreamedContentSync((prev) => prev + chunk.content);
      }

      if (chunk.tool_calls && chunk.tool_calls.length > 0) {
        // Update tool call count
        setToolCallsCount((prev) => prev + chunk.tool_calls!.length);

        const messageId = streamingMessageIdRef.current;
        if (messageId) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, tool_calls: chunk.tool_calls }
                : msg
            )
          );
        }

      }

      if (chunk.done) {
        // Stream complete - save the message
        const messageId = streamingMessageIdRef.current;
        const content = currentStreamedContentRef.current; //  Use ref with sync updates

        if (messageId) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, content: content, modelContent: content, tool_calls: chunk.tool_calls ?? msg.tool_calls }
                : msg
            )
          );
        }
        setLoading(false);
        setStreamingMessageId(null);
        setCurrentStreamedContentSync('');
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []); // Remove dependencies to prevent infinite loop

  // Listen for study guide tool results emitted from the backend and mirror to canvas
  useEffect(() => {
    const unlistenPromise = listen<string>('study-guide-generated', (event) => {
      if (event.payload && event.payload.trim()) {
        setLastStudyGuide((prev) => prev + event.payload);
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [onSendToCanvas]);

  // Listen for brainstorm outputs from Grok and make them pinnable
  useEffect(() => {
    const unlistenPromise = listen<string>('brainstorm-generated', (event) => {
      if (event.payload && event.payload.trim()) {
        setLastBrainstorm(event.payload);
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Listen for deep research progress
  useEffect(() => {
    const unlistenPromise = listen<ResearchStep>('research-progress', (event) => {
      setResearchSteps(prev => [...prev, event.payload]);
    });
    return () => { unlistenPromise.then(f => f()); };
  }, []);

  // Helper to process canvas updates (reused by JSON parser and native tool)
  const processCanvasUpdate = useCallback((update: any) => {
    let mediaUrl: string | null = null;
    let mediaTarget: 'main' | 'left' | undefined;

    const normalizeTarget = (raw: any): 'main' | 'left' | undefined => {
      if (raw === 'left' || raw === 'main') return raw;
      return undefined;
    };

    const openLeftIfNeeded = (target?: 'main' | 'left') => {
      if (target === 'left') {
        emit('canvas-open-left');
      }
    };

    // 0. Check for clear_canvas command (optionally targeted)
    if (update?.clear_canvas) {
      const clearTarget = normalizeTarget(update.clear_canvas.target ?? update.clear_canvas.targetId);
      if (clearTarget === 'left') {
        openLeftIfNeeded('left');
        setTimeout(() => emit('canvas-clear', { targetId: 'left' }), 150);
      } else if (clearTarget === 'main') {
        emit('canvas-clear', { targetId: 'main' });
      }
      console.log('🧹 Clearing canvas requested by AI');
      if (!clearTarget) {
        emit('canvas-clear');
      }
    }

    // 1. Check standard preview format
    if (update?.preview) {
      const previewTarget = normalizeTarget(update.preview.target ?? update.preview.targetId);
      openLeftIfNeeded(previewTarget);
      if (update.preview.url) {
        mediaUrl = update.preview.url;
        mediaTarget = previewTarget;
      } else if (update.preview.code && (update.preview.type === 'threejs' || update.preview.type === 'manifold')) {
        console.log(`🎨 Splitting canvas for ${update.preview.type} code`);
        const payload: any = {
          code: update.preview.code,
          type: update.preview.type
        };
        if (previewTarget) payload.targetId = previewTarget;

        if (previewTarget === 'left') {
          setTimeout(() => emit('canvas-split', payload), 200);
        } else {
          emit('canvas-split', payload);
        }
      }
    }

    // 2. Check add_block format
    if (update?.add_block) {
      const blockTarget = normalizeTarget(update.add_block.target ?? update.add_block.targetId);
      openLeftIfNeeded(blockTarget);
      console.log('📦 Canvas block update:', update.add_block);

      // If it's a YouTube video, treat it as a split screen media
      if (update.add_block.type === 'youtube' && update.add_block.content) {
        mediaUrl = update.add_block.content;
        mediaTarget = blockTarget;
      } else {
        // For other blocks (tables, code, text), emit a generic update
        const payload: any = { block: update.add_block };
        if (blockTarget) payload.targetId = blockTarget;
        if (blockTarget === 'left') {
          setTimeout(() => emit('canvas-update', payload), 200);
        } else {
          emit('canvas-update', payload);
        }
      }
    }

    if (mediaUrl) {
      const payload: any = { url: mediaUrl };
      if (mediaTarget) payload.targetId = mediaTarget;

      const doSplit = () =>
        emit('canvas-split', payload)
          .then(() => console.log('✅ Canvas split event emitted'))
          .catch(err => {
            console.error('Failed to emit split event, falling back to window:', err);
            invoke('open_media_window', { url: mediaUrl, label: `media-${Date.now()}` });
          });

      if (mediaTarget === 'left') {
        openLeftIfNeeded('left');
        setTimeout(doSplit, 200);
      } else {
        doSplit();
      }
    }
  }, []);


  // NOTE: native-canvas-update listener REMOVED
  // DojoCanvas.tsx now exclusively handles canvas events to prevent race conditions.
  // processCanvasUpdate is still used by the JSON fallback parser below.

  // Listen for JSON commands in assistant messages (Legacy/Fallback)
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && !loading && !streamingMessageId) {
      // Look for ALL JSON blocks
      const jsonRegex = /```json\n([\s\S]*?)\n```/g;
      let match;

      while ((match = jsonRegex.exec(lastMessage.content)) !== null) {
        try {
          const data = JSON.parse(match[1]);
          if (data.canvas_update) {
            processCanvasUpdate(data.canvas_update);
          }
        } catch (e) {
          console.error('Failed to parse JSON command:', e);
        }
      }
    }
  }, [messages, loading, streamingMessageId, processCanvasUpdate]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validExtensions = ['.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.py', '.rs', '.json', '.css', '.html', '.xml', '.yml', '.yaml'];
    const maxBytesPerFile = 256 * 1024;
    const newFiles: AttachedFile[] = [];

    for (const file of Array.from(files)) {
      const fileExt = '.' + (file.name.split('.').pop() || '').toLowerCase();

      if (!validExtensions.includes(fileExt)) {
        alert(`Skipping ${file.name}: Please attach text-based files only (.txt, .md, .json, .ts, etc.)`);
        continue;
      }

      if (file.size > maxBytesPerFile) {
        alert(`Skipping ${file.name}: File is too large (${Math.round(file.size / 1024)}KB). Max ${Math.round(maxBytesPerFile / 1024)}KB.`);
        continue;
      }

      try {
        let content = await file.text();
        if (fileExt === '.json') {
          try {
            content = JSON.stringify(JSON.parse(content), null, 2);
          } catch {
            // Keep raw content if it's not valid JSON
          }
        }
        newFiles.push({ name: file.name, content });
      } catch (error) {
        alert(`Failed to read ${file.name}: ${String(error)}`);
      }
    }

    if (newFiles.length > 0) {
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async () => {
    if (loading) return;
    const hasUserText = Boolean(input.trim());
    const hasContext = attachedFiles.length > 0 || Boolean(canvasSnippet?.text?.trim());
    if (!hasUserText && !hasContext) return;

    const isTauriEnv = typeof window !== 'undefined' && (window as any).__TAURI__;
    const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL;
    const usesGateway = Boolean(gatewayUrl);

    // Check API key based on selected provider (only when not using gateway)
    const currentApiKey = selectedProvider === 'minimax' ? apiKey : grokApiKey;
    if (!usesGateway && !currentApiKey) {
      alert(`Please enter your ${selectedProvider === 'minimax' ? 'MiniMax' : 'Grok'} API key in settings first!`);
      return;
    }

    const contextParts: string[] = [];

    if (canvasSnippet?.text?.trim()) {
      const meta: string[] = [];
      if (canvasSnippet.canvasId) meta.push(`canvas: ${canvasSnippet.canvasId}`);
      if (canvasSnippet.source) meta.push(`source: ${canvasSnippet.source}`);
      const metaSuffix = meta.length ? ` (${meta.join(', ')})` : '';
      contextParts.push(`### Highlighted canvas text${metaSuffix}\n\n${canvasSnippet.text}`);
    }

    if (attachedFiles.length > 0) {
      attachedFiles.forEach((file, index) => {
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        const lang = /^[a-z0-9_+-]+$/i.test(ext) ? ext : '';
        contextParts.push(`### Attached file ${index + 1}: ${file.name}\n\n\`\`\`${lang}\n${file.content}\n\`\`\``);
      });
    }

    const basePrompt =
      input.trim() ||
      'Use the provided context. If no question is asked, summarize it and suggest next steps.';

    const messageContentForModel =
      contextParts.length > 0
        ? `${basePrompt}\n\n---\n\n[Context]\n\n${contextParts.join('\n\n')}\n\n[/Context]`
        : basePrompt;

    const uiMeta: string[] = [];
    if (canvasSnippet?.text?.trim()) {
      uiMeta.push(`Canvas selection${canvasSnippet.canvasId ? ` (${canvasSnippet.canvasId})` : ''}`);
    }
    if (attachedFiles.length > 0) {
      uiMeta.push(`Attached: ${attachedFiles.map((f) => f.name).join(', ')}`);
    }

    const uiContent = [input.trim(), uiMeta.length ? `\n\n_${uiMeta.join(' • ')}_` : ''].filter(Boolean).join('');

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: uiContent,
      modelContent: messageContentForModel,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setAttachedFiles([]);
    setCanvasSnippet(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setLoading(true);
    setCurrentThinking([]);
    setResearchSteps([]);
    setToolCallsCount(0);
    setIterationsCount(0);

    try {
      // Create streaming message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        modelContent: '',
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingMessageId(assistantMessage.id);
      setCurrentStreamedContent('');

      const toolConfig = appMode === 'student'
        ? { ...enabledTools, write_file_batch: false, run_terminal_command: false }
        : enabledTools;

      if (usesGateway) {
        const { webApi } = await import('../lib/webApi');
        await webApi.chatWithAIStream(
          [...messages, userMessage]
            .filter((m) => m.role !== 'tool')
            .map((m) => ({
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.modelContent ?? m.content,
            })),
          {
            enabledTools: toolConfig,
            maxIterations: 50,
            userName: localStorage.getItem('user_name') || user?.email || 'Guest',
          }
        );
      } else if (isTauriEnv) {
        // Tauri desktop - use full streaming agent with tools
        await invoke('chat_with_agent_stream', {
          provider: selectedProvider,
          apiKey: currentApiKey,
          tavilyKey: tavilyApiKey || null,
          grokKey: grokApiKey || null,
          geminiKey: null,
          enabledTools: toolConfig,
          userId: user?.id || 'guest',
          userName: localStorage.getItem('user_name') || user?.email || 'Guest',
          messages: [...messages, userMessage]
            .filter((m) => m.role !== 'tool')
            .map((m) => ({
              role: m.role,
              content: m.modelContent ?? m.content,
              timestamp: m.timestamp ? new Date(m.timestamp).toISOString() : undefined,
            })),
          maxIterations: 50,
        });
      } else {
        // Web browser fallback - non-streaming
        const { webApi } = await import('../lib/webApi');
        const response = await webApi.chatWithAI(
          [...messages, userMessage].map((m) => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.modelContent ?? m.content,
          })),
          currentApiKey
        );

        // Update the assistant message with the response
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id
              ? { ...msg, content: response, modelContent: response }
              : msg
          )
        );
        setStreamingMessageId(null);
        setLoading(false);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error}. Please check your API key and try again.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    // Update input with the composed text
    const target = e.target as HTMLTextAreaElement;
    setInput(target.value);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  }, [sendMessage]);

  const clearChat = useCallback(() => {
    const newDefaultMessage = {
      ...defaultMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages([newDefaultMessage]);
    setCurrentThinking([]);
    setAttachedFiles([]);
    setCanvasSnippet(null);
    const storageKey = user?.id ? `chat_messages_${user.id}` : 'chat_messages_guest';
    localStorage.setItem(storageKey, JSON.stringify([newDefaultMessage]));
  }, [defaultMessage, user?.id]);

  const quickPrompts = [
    'Calculate (125 + 75) * 3 / 2',
    'Search for ADHD optimization techniques',
    'Create a beginner study guide for Tauri',
    'List available markdown files',
    'Search the web for latest startup trends 2025',
    'Write a file to research/my-test-guide.md',
  ];

  return (
    <div className="flex flex-col h-full rounded-2xl border border-border/60 bg-card/70 backdrop-blur p-2 gap-2">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as AIProvider)}
                className="font-semibold text-sm bg-transparent border-none focus:ring-0 cursor-pointer hover:text-primary transition-colors appearance-none pr-4"
                style={{ color: 'inherit' }}
              >
                <option value="minimax" className="bg-card text-foreground">Minimax M2</option>
                <option value="grok" className="bg-card text-foreground">Grok 4.1</option>
              </select>
              <ChevronDown className="w-3 h-3 opacity-50 pointer-events-none -ml-4" />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Online & Ready
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">

          <button
            onClick={sendLastAssistantToCanvas}
            disabled={!onSendToCanvas}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
            title="Send last response to canvas"
          >
            <Wrench className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (onSendToCanvas && lastStudyGuide.trim()) {
                onSendToCanvas(lastStudyGuide);
              }
            }}
            disabled={!onSendToCanvas || !lastStudyGuide.trim()}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
            title={lastStudyGuide ? 'Pin the most recent study guide to the canvas' : 'No study guide received yet'}
          >
            <Pin className="w-4 h-4" />
          </button>

          <div className="h-6 w-px bg-border/50 mx-1" />

          <button
            onClick={() => setSelectedProvider(prev => prev === 'minimax' ? 'grok' : 'minimax')}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            title={`Switch to ${selectedProvider === 'minimax' ? 'Grok' : 'MiniMax'}`}
          >
            {selectedProvider === 'minimax' ? <Zap className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
          </button>

          <button
            onClick={clearChat}
            className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors text-muted-foreground"
            title="Clear Chat"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      {(toolCallsCount > 0 || iterationsCount > 0) && (
        <div className="px-4 pt-2 flex gap-4 text-xs">
          <div className="flex items-center gap-2 text-primary">
            <Wrench className="w-3 h-3" />
            <span>{toolCallsCount} tool{toolCallsCount !== 1 ? 's' : ''} used</span>
          </div>
          <div className="flex items-center gap-2 text-primary">
            <span className="w-3 h-3 flex items-center justify-center">🔄</span>
            <span>{iterationsCount} iteration{iterationsCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div
        className="flex-1 overflow-hidden flex flex-col relative transition-all duration-300 mancala-panel rounded-2xl p-6"
      >
        {/* Hawkeye Theme Background Logo */}
        {theme === 'hawkeye' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-10">
            <img src={hawkeyeLogo} alt="Hawkeye Logo" className="w-96 h-96 object-contain" />
          </div>
        )}

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar relative z-10"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)'
          }}
        >
          {messages.map((message, index) => (
            <MessageItem
              key={message.id}
              message={message}
              streamingMessageId={streamingMessageId}
              currentStreamedContent={currentStreamedContent}
              theme={theme}
              researchSteps={researchSteps}
              isLatest={index === messages.length - 1}
              textScale={textScale}
            />
          ))}

          {/* Current Thinking Display */}
          {loading && showThinking && currentThinking.length > 0 && (
            <div className="flex gap-4 animate-fade-in">
              <div className="p-2 rounded-lg h-fit border animate-pulse" style={{ backgroundColor: 'rgba(var(--accent), 0.2)', borderColor: 'rgba(var(--accent), 0.2)' }}>
                <Lightbulb className="w-5 h-5" style={{ color: 'rgb(var(--accent))' }} />
              </div>
              <div className="border rounded-lg p-4 flex-1 shadow-lg" style={{
                backgroundColor: theme === 'cosmic' ? 'rgb(255 235 153)' : 'rgba(var(--accent), 0.05)',
                borderColor: 'rgba(var(--accent), 0.3)',
                boxShadow: '0 0 20px rgba(var(--accent), 0.1)'
              }}>
                <div className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'rgb(var(--accent))' }}>
                  <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'rgb(var(--accent))' }}></span>
                  <span>Internal Reasoning</span>
                </div>
                <div className="space-y-3">
                  {currentThinking.map((think, idx) => (
                    <div
                      key={idx}
                      className="text-sm pl-4 border-l-2 italic leading-relaxed animate-slide-in"
                      style={{
                        animationDelay: `${idx * 100}ms`,
                        color: theme === 'cosmic' ? 'rgb(30 30 30)' : 'rgb(var(--foreground))',
                        borderLeftColor: 'rgba(var(--accent), 0.4)'
                      }}
                    >
                      {think}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {loading && streamingMessageId && (
            <div className="flex gap-4">
              <div className="bg-green-500/20 p-2 rounded-lg h-fit border border-green-500/20">
                <Bot className="w-5 h-5 text-green-400" />
              </div>
              <div className="bg-card border border-border rounded-lg p-4 min-w-[200px]">
                {/* Thinking State - no content received yet */}
                {!currentStreamedContent && (
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5 text-primary animate-pulse" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Thinking
                        <span className="inline-flex ml-1">
                          <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                          <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                          <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                        </span>
                      </p>
                      {toolCallsCount > 0 && (
                        <p className="text-xs text-amber-400 flex items-center gap-1 mt-1">
                          <Wrench className="w-3 h-3" />
                          {toolCallsCount} tool{toolCallsCount !== 1 ? 's' : ''} used
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Streaming State - content is being received */}
                {currentStreamedContent && (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-green-400 animate-spin" />
                    <div>
                      <p className="text-sm text-foreground">Generating response...</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {currentStreamedContent.length} chars
                        {toolCallsCount > 0 && ` • ${toolCallsCount} tool${toolCallsCount !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <div className="px-6 pb-4">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            Try these enhanced prompts:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => setInput(prompt)}
                className="text-left px-3 py-2 bg-card hover:bg-muted border border-border
                  rounded-lg text-xs text-foreground transition-colors hover:border-primary/30"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}


      {/* Input Area */}
      <div className="p-4 pt-0">
        <form
          onSubmit={handleSubmit}
          className="relative flex flex-col gap-2 p-2 rounded-xl border transition-all duration-300 neumorphic-input border-none"
        >
          {loading && (
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-20">
              <button
                type="button"
                onClick={handleStop}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2"
              >
                <div className="w-2 h-2 bg-white rounded-sm animate-pulse" />
                <span className="text-xs font-bold">Stop Generating</span>
              </button>
            </div>
          )}
          {(canvasSnippet || attachedFiles.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 px-2 pt-1">
              {canvasSnippet?.text?.trim() && (
                <div className="flex items-center gap-2 px-2 py-1 rounded-md border border-primary/20 bg-primary/10 text-primary-foreground/90 max-w-full">
                  <Pin className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs text-foreground/80 truncate">
                    {canvasSnippet.canvasId ? `Canvas (${canvasSnippet.canvasId})` : 'Canvas'}
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-[360px] hidden sm:inline">
                    {canvasSnippet.text.replace(/\s+/g, ' ').slice(0, 120)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCanvasSnippet(null)}
                    className="text-muted-foreground hover:text-foreground"
                    title="Remove canvas context"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {attachedFiles.map((file, index) => {
                const ext = (file.name.split('.').pop() || '').toUpperCase();
                return (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-2 px-2 py-1 rounded-md border border-border/60 bg-card/70 max-w-full"
                    title={file.name}
                  >
                    <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-foreground/80 truncate max-w-[220px]">{file.name}</span>
                    {ext && ext.length <= 8 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                        {ext}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-muted-foreground hover:text-foreground"
                      title="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              accept=".txt,.md,.js,.ts,.jsx,.tsx,.py,.rs,.json,.css,.html,.xml,.yml,.yaml"
              className="hidden"
            />
            <button
              type="button"
              className="p-3 mb-1 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              title="Attach file"
              disabled={loading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything... I can use tools and show my thinking!"
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-lg resize-none focus:outline-none focus:border-primary bg-transparent max-h-[200px]"
              style={{
                backgroundColor: theme === 'soft' ? 'transparent' : 'rgba(var(--muted), 0.5)',
                borderColor: theme === 'soft' ? 'transparent' : 'rgba(var(--border), 0.5)',
                color: theme === 'soft' ? '#1A202C' : 'rgb(var(--foreground))'
              }}
              rows={1}
            />
            <Button
              type="submit"
              disabled={loading || (!input.trim() && attachedFiles.length === 0 && !canvasSnippet?.text?.trim())}
              className="px-4 py-6 mb-0.5 transition-all font-medium"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default AIChatEnhanced;
