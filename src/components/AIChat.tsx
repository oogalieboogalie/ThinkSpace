import React, { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Send, Bot, User, Loader2, Sparkles, RotateCcw, Paperclip, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AIChatProps {
  apiKey: string;
}

const AIChat: React.FC<AIChatProps> = ({ apiKey }) => {
  const defaultMessage = {
    id: '1',
    role: 'assistant' as const,
    content: 'Hi! I\'m your **Digital Tutor** powered by MiniMax M2. I can access your knowledge base files and help you learn. I can:\n\n- **Read files** from your knowledge base\n- **Search** through all your guides\n- Explain complex concepts\n- Create personalized study plans\n- Generate code examples\n- Answer questions about your research\n\n📁 Just ask me to read a file or search for a topic!\n\nWhat would you like to learn today?',
    timestamp: Date.now(),
  };

  const [messages, setMessages] = useState<Message[]>(() => {
    // Load messages from localStorage on mount
    const saved = localStorage.getItem('chat_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [defaultMessage];
      }
    }
    return [defaultMessage];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{name: string, content: string}[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chat_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validExtensions = ['.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.py', '.rs', '.json', '.css', '.html', '.xml', '.yml', '.yaml'];
    const newFiles: {name: string, content: string}[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!validExtensions.includes(fileExt)) {
        alert(`Skipping ${file.name}: Please select text files only (.txt, .md, .js, .ts, .py, etc.)`);
        continue;
      }

      try {
        const content = await file.text();
        newFiles.push({ name: file.name, content });
      } catch (error) {
        alert(`Failed to read ${file.name}: ` + error);
      }
    }

    setAttachedFiles(prev => [...prev, ...newFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || loading) return;

    if (!apiKey) {
      alert('Please enter your MiniMax API key in the sidebar first!');
      return;
    }

    // Build message content with files if attached
    let messageContent = input;
    if (attachedFiles.length > 0) {
      messageContent = `${input}\n\n`;
      attachedFiles.forEach((file, index) => {
        messageContent += `📎 **Attached file ${index + 1}: ${file.name}**\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
      });
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setAttachedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setLoading(true);

    try {
      const response = await invoke<string>('chat_with_minimax', {
        apiKey,
        messages: [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error}. Please check your API key and try again.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    const newDefaultMessage = {
      ...defaultMessage,
      timestamp: Date.now(),
    };
    setMessages([newDefaultMessage]);
    localStorage.setItem('chat_messages', JSON.stringify([newDefaultMessage]));
  };

  const quickPrompts = [
    'Search for ADHD hyperfocus techniques',
    'Read the file on AI text generation SDKs',
    'Search for Tauri app development guides',
    'Create a study plan for learning Rust',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-black border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-500/20 p-2 rounded-lg">
              <Sparkles className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Digital Tutor</h2>
              <p className="text-xs text-muted-foreground">Powered by MiniMax M2</p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="px-3 py-2 bg-card hover:bg-muted border border-border
              rounded-lg text-foreground transition-colors flex items-center gap-2 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Clear Chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="bg-green-500/20 p-2 rounded-lg h-fit">
                <Bot className="w-5 h-5 text-green-400" />
              </div>
            )}

            <div
              className={`max-w-2xl rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-500/20 border border-blue-500/30 text-blue-100'
                  : 'bg-black border border-black text-foreground'
              }`}
            >
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
              <p className="text-xs mt-2 opacity-50">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>

            {message.role === 'user' && (
              <div className="bg-blue-500/20 p-2 rounded-lg h-fit">
                <User className="w-5 h-5 text-primary" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-4">
            <div className="bg-green-500/20 p-2 rounded-lg h-fit">
              <Bot className="w-5 h-5 text-green-400" />
            </div>
            <div className="bg-black border border-black rounded-lg p-4">
              <Loader2 className="w-5 h-5 text-green-400 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <div className="px-6 pb-4">
          <p className="text-xs text-muted-foreground mb-2">Quick prompts:</p>
          <div className="grid grid-cols-2 gap-2">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => setInput(prompt)}
                className="text-left px-3 py-2 bg-card hover:bg-muted border border-border
                  rounded-lg text-xs text-foreground transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-black border-t border-border p-4">
        {/* Attached files indicator */}
        {attachedFiles.length > 0 && (
          <div className="mb-3 space-y-2">
            {attachedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <Paperclip className="w-4 h-4 text-primary" />
                <span className="text-sm text-blue-300 flex-1">{file.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-primary hover:text-blue-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <div className="flex flex-col gap-2 flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your knowledge base..."
              disabled={loading}
              className="w-full px-4 py-3 bg-card border border-border rounded-lg
                focus:outline-none focus:border-green-500 text-foreground resize-none"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              accept=".txt,.md,.js,.ts,.jsx,.tsx,.py,.rs,.json,.css,.html,.xml,.yml,.yaml"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="px-4 bg-card hover:bg-muted disabled:bg-card
                disabled:text-muted-foreground border border-border text-foreground rounded-lg
                transition-colors flex items-center gap-2"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <button
              onClick={sendMessage}
              disabled={loading || (!input.trim() && attachedFiles.length === 0)}
              className="px-6 bg-green-500 hover:bg-green-600 disabled:bg-muted
                disabled:text-muted-foreground text-white rounded-lg transition-colors
                flex items-center gap-2 font-medium"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line • Click 📎 to attach text files
        </p>
      </div>
    </div>
  );
};

export default AIChat;
