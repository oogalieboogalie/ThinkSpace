import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { emitEvent, listenEvent as listen } from './lib/events';
import { api } from './lib/api';
import { X, CheckCircle, AlertCircle, Save, Upload, Download, Loader2 } from 'lucide-react';
import SaveSessionModal from './components/SaveSessionModal';
import LoadSessionModal from './components/LoadSessionModal';
import { invoke } from '@tauri-apps/api/tauri';
import AIChatEnhanced from './components/AIChatEnhanced';
import ThemeSwitcher from './components/ThemeSwitcher';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useAuth } from './contexts/AuthContext';
import AppBackground from './components/AppBackground';
import InvisibleSidebar from './components/InvisibleSidebar';
import MatrixRainBackground from './components/MatrixRainBackground';


// Lazy load heavy components
const LandingPage = lazy(() => import('./components/LandingPage'));
const ContentBrowser = lazy(() => import('./components/ContentBrowser'));
const StudyGuideGenerator = lazy(() => import('./components/StudyGuideGenerator'));
const VisualLearning = lazy(() => import('./components/VisualLearning'));
const SearchPanel = lazy(() => import('./components/SearchPanel'));
const ProgressTracker = lazy(() => import('./components/ProgressTracker'));
const HyperfocusTimer = lazy(() => import('./components/HyperfocusTimer'));
const FileEmbedder = lazy(() => import('./components/FileEmbedding/FileEmbedder'));
const CascadeBrainstorm = lazy(() => import('./components/CascadeBrainstorm'));
const BlueprintsBrowser = lazy(() => import('./components/BlueprintsBrowser'));
const DojoCanvas = lazy(() => import('./components/DojoCanvas'));
const OnboardingWizard = lazy(() => import('./components/OnboardingWizard'));
const AgentManager = lazy(() => import('./components/AgentManager'));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-full w-full">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

type View = 'landing' | 'browse' | 'chat-enhanced' | 'study-guide' | 'visual' | 'search' | 'embed' | 'progress' | 'timer' | 'cascade' | 'app' | 'canvas' | 'blueprints' | 'agent-manager';

function AppContent() {
  const { user, signOut, supabase } = useAuth();
  const { theme } = useTheme();
  // Only show landing page in Tauri by default, not on web
  const isTauriEnv = typeof window !== 'undefined' && (window as any).__TAURI__;
  const [showLanding, setShowLanding] = useState(isTauriEnv);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem('onboarding_complete') !== 'true';
  });
  const [activeView, setActiveView] = useState<Exclude<View, 'landing' | 'app'>>('browse');
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [isResizingCanvas, setIsResizingCanvas] = useState(false);
  const layoutRef = useRef<HTMLDivElement>(null);

  const handleNavigate = (view: string) => {
    if (view === 'app' || view === 'landing') {
      setShowLanding(view === 'landing');
    } else {
      setShowLanding(false);
      setActiveView(view as Exclude<View, 'landing' | 'app'>);
    }
  };
  const [apiKey, setApiKey] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [tempTavilyApiKey, setTempTavilyApiKey] = useState('');
  const [tempGrokApiKey, setTempGrokApiKey] = useState('');
  const [tempQdrantApiKey, setTempQdrantApiKey] = useState('');
  const [tempQdrantHost, setTempQdrantHost] = useState('');
  const [tempQdrantCollection, setTempQdrantCollection] = useState('TheDojoKnowledge');
  const [tempCohereApiKey, setTempCohereApiKey] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [qdrantTestStatus, setQdrantTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [qdrantTestMessage, setQdrantTestMessage] = useState('');
  
  // Profile Management State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [canvasContent, setCanvasContent] = useState<string>('');
  /* const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  }); */
  useEffect(() => {
    const unlistenPromise = listen<string>('study-guide-generated', (event) => {
      if (event.payload) {
        setCanvasContent((prev) => prev + event.payload);
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    const unlistenPromise = listen<string>('brainstorm-generated', (event) => {
      if (event.payload && event.payload.trim()) {
        setCanvasContent(event.payload);
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    const unlistenPromise = listen<string>('agent-consulted', (event) => {
      if (event.payload && event.payload.trim()) {
        setCanvasContent(event.payload);
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    const unlistenPromise = listen('canvas-open-left', () => {
      console.log('📖 Opening left canvas via event');
      setShowLeftCanvas(true);
    });
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    const unlistenPromise = listen<{
      preview?: { target?: string; targetId?: string };
      add_block?: { target?: string; targetId?: string };
      clear_canvas?: { target?: string; targetId?: string };
    }>('native-canvas-update', (event) => {
      const payload = event.payload || {};
      const { preview, add_block, clear_canvas } = payload;
      const target =
        preview?.target ??
        preview?.targetId ??
        add_block?.target ??
        add_block?.targetId ??
        clear_canvas?.target ??
        clear_canvas?.targetId;

      if (target === 'left') {
        setShowLeftCanvas((prev) => {
          if (!prev) {
            // Left canvas is unmounted; queue updates until it mounts.
            pendingLeftCanvasEventsRef.current.push(payload);
            console.log('📖 Auto-opening left canvas due to native update');
          }
          return true;
        });
      }
    });
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    const unlistenPromise = listen<{ block: { type: string; content: string; lang?: string }; targetId?: string }>('canvas-update', (event) => {
      const { block, targetId } = event.payload;

      if (block) {
        console.log('🎨 Global canvas update received:', block);
        const { type, content: blockContent } = block;

        // Determine which canvas to update
        const isLeft = targetId === 'left';
        const contentRef = isLeft ? leftCanvasContentRef : mainCanvasContentRef;
        const setContent = isLeft ? setLeftCanvasContent : setCanvasContent;

        // Use the ref's current value to ensure we have the latest edits
        let currentContent = contentRef.current || '';

        if (!currentContent.endsWith('\n')) currentContent += '\n';

        if (type === 'image') {
          currentContent += `\n![Generated Image](${blockContent})\n`;
        } else if (type === 'code') {
          currentContent += `\n\`\`\`${block.lang || ''}\n${blockContent}\n\`\`\`\n`;
        } else {
          currentContent += `\n${blockContent}\n`;
        }

        // Update both ref and state
        contentRef.current = currentContent;
        setContent(currentContent);

        // Auto-open left canvas if it's targeted
        if (isLeft && !showLeftCanvas) {
          setShowLeftCanvas(true);
        }
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    // Load saved API keys from localStorage
    const saved = localStorage.getItem('minimax_api_key');
    if (saved) {
      setApiKey(saved);
      setTempApiKey(saved);
    }

    const tavilySaved = localStorage.getItem('tavily_api_key');
    if (tavilySaved) {
      setTempTavilyApiKey(tavilySaved);
    }

    const grokSaved = localStorage.getItem('grok_api_key');
    if (grokSaved) {
      setTempGrokApiKey(grokSaved);
    }

    const qdrantApiKeySaved = localStorage.getItem('qdrant_api_key');
    if (qdrantApiKeySaved) {
      setTempQdrantApiKey(qdrantApiKeySaved);
    }

    const qdrantHostSaved = localStorage.getItem('qdrant_host');
    if (qdrantHostSaved) {
      setTempQdrantHost(qdrantHostSaved);
    }

    const qdrantCollectionSaved = localStorage.getItem('qdrant_collection');
    if (qdrantCollectionSaved) {
      setTempQdrantCollection(qdrantCollectionSaved);
    }

    const cohereSaved = localStorage.getItem('cohere_api_key');
    if (cohereSaved) {
      setTempCohereApiKey(cohereSaved);
    }

    const initializeTKG = async () => {
      const qdrantKey = localStorage.getItem('qdrant_api_key');
      const qdrantHost = localStorage.getItem('qdrant_host');
      const qdrantCollection = localStorage.getItem('qdrant_collection') || 'TheDojoKnowledge';
      const cohereKey = localStorage.getItem('cohere_api_key');

      if (qdrantKey && qdrantHost && cohereKey) {
        // Extract port from host URL if present, otherwise use default 6334
        const portMatch = qdrantHost.match(/:(\d+)/);
        const qdrantPort = portMatch ? parseInt(portMatch[1], 10) : 6334;

        try {
          await invoke('tkg_initialize', {
            qdrantHost: qdrantHost,
            qdrantPort: qdrantPort,
            qdrantCollection: qdrantCollection,
            qdrantApiKey: qdrantKey,
            cohereApiKey: cohereKey,
          });
          console.log('✅ TKG initialized automatically from saved credentials');
        } catch (error) {
          console.error('Failed to auto-initialize TKG:', error);
        }
      }
    };

    initializeTKG();
  }, []);

  // Fetch Cloud Config on Login
  useEffect(() => {
    const fetchCloudConfig = async () => {
      if (!user || !supabase) return;

      try {
        console.log('☁️ Fetching cloud configuration...');
        const { data, error } = await supabase
          .from('app_config')
          .select('key, value');

        if (error) {
          console.error('Failed to fetch cloud config:', error);
          return;
        }

        if (data) {
          console.log(`✅ Loaded ${data.length} config keys from cloud`);

          data.forEach(item => {
            switch (item.key) {
              case 'minimax_api_key':
                setApiKey(item.value);
                setTempApiKey(item.value);
                localStorage.setItem('minimax_api_key', item.value);
                break;
              case 'tavily_api_key':
                setTempTavilyApiKey(item.value);
                localStorage.setItem('tavily_api_key', item.value);
                break;
              case 'grok_api_key':
                setTempGrokApiKey(item.value);
                localStorage.setItem('grok_api_key', item.value);
                break;
              case 'qdrant_api_key':
                setTempQdrantApiKey(item.value);
                localStorage.setItem('qdrant_api_key', item.value);
                break;
              case 'qdrant_host':
                setTempQdrantHost(item.value);
                localStorage.setItem('qdrant_host', item.value);
                break;
              case 'cohere_api_key':
                setTempCohereApiKey(item.value);
                localStorage.setItem('cohere_api_key', item.value);
                break;
            }
          });

          // Re-initialize TKG with new keys
          // We can't easily call initializeTKG here because it's inside the other effect
          // But saving to localStorage might trigger a reload or we can rely on next app start
          // ideally we should trigger it here.
        }
      } catch (err) {
        console.error('Error in cloud config fetch:', err);
      }
    };

    fetchCloudConfig();
  }, [user, supabase]);

  /* useEffect(() => {
    // Save sidebar collapsed state
    localStorage.setItem('sidebar_collapsed', sidebarCollapsed.toString());
  }, [sidebarCollapsed]); */

  const [showLeftCanvas, setShowLeftCanvas] = useState(false);
  const [leftCanvasWidth, setLeftCanvasWidth] = useState(350);
  const [leftCanvasContent, setLeftCanvasContent] = useState(`# Scratchpad

Use this space for quick notes.`);
  const [isResizingLeftCanvas, setIsResizingLeftCanvas] = useState(false);

  // Session Snapshot State
  const [isSaveSessionModalOpen, setIsSaveSessionModalOpen] = useState(false);
  const [isLoadSessionModalOpen, setIsLoadSessionModalOpen] = useState(false);
  const mainCanvasContentRef = useRef<string>('');
  const leftCanvasContentRef = useRef<string>('');
  const mainMediaRef = useRef<{ type: string; content: string } | null>(null);
  const leftMediaRef = useRef<{ type: string; content: string } | null>(null);
  const pendingLeftCanvasEventsRef = useRef<Array<{ preview?: any; add_block?: any; clear_canvas?: any }>>([]);
  const sendToCanvas = (payload: string, target: 'main' | 'left' = 'main') => {
    if (target === 'left') {
      setShowLeftCanvas(true);
      setLeftCanvasContent(payload);
    } else {
      setCanvasContent(payload);
    }
  };

  useEffect(() => {
    if (!showLeftCanvas || pendingLeftCanvasEventsRef.current.length === 0) return;

    const pending = [...pendingLeftCanvasEventsRef.current];
    pendingLeftCanvasEventsRef.current = [];

    const timeoutId = setTimeout(() => {
      pending.forEach((payload) => {
        emitEvent('native-canvas-update', payload).catch((err) => {
          console.error('Failed to replay left canvas update:', err);
        });
      });
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [showLeftCanvas]);

  const handleSaveSession = async (name: string, options: { chat: boolean; mainCanvas: boolean; leftCanvas: boolean; visuals: boolean }) => {
    try {
      const sessionData: any = {
        name,
        timestamp: new Date().toISOString(),
        chat: null,
        main_canvas: null,
        left_canvas: null,
        visuals: null,
      };

      if (options.chat) {
        const chatStorageKey = user?.id ? `chat_messages_${user.id}` : 'chat_messages_guest';
        const savedChat = localStorage.getItem(chatStorageKey) || localStorage.getItem('chat_messages_enhanced');
        if (savedChat) {
          sessionData.chat = JSON.parse(savedChat);
        }
      }

      if (options.mainCanvas) {
        sessionData.main_canvas = mainCanvasContentRef.current;
      }

      if (options.leftCanvas) {
        sessionData.left_canvas = leftCanvasContentRef.current;
      }

      if (options.visuals) {
        sessionData.visuals = {
          main: mainMediaRef.current || null,
          left: leftMediaRef.current || null,
        };
      }

      if (!user?.id) {
        alert('Please sign in to save sessions.');
        return;
      }
      await api.saveSession(name, sessionData, user.id);
      alert('Session snapshot saved successfully!');
    } catch (error) {
      console.error('Failed to save session:', error);
      alert('Failed to save session: ' + error);
    }
  };

  const handleLoadSession = (data: any) => {
    try {
      // 1. Restore Chat
      if (data.chat) {
        const chatStorageKey = user?.id ? `chat_messages_${user.id}` : 'chat_messages_guest';
        localStorage.setItem(chatStorageKey, JSON.stringify(data.chat));
        localStorage.setItem('chat_messages_enhanced', JSON.stringify(data.chat));
        // Force reload chat component or notify it? 
        // For now, a simple window reload might be cleanest to reset all state, 
        // but let's try to do it gracefully if possible.
        // Actually, AIChatEnhanced reads from localStorage on mount.
        // We might need to trigger a re-mount of the chat component.
        // Or we can just reload the page which is safer for full state restoration.
        if (confirm('Session loaded. Reload app to apply chat history?')) {
          window.location.reload();
          return;
        }
      }

      // 2. Restore Canvases
      if (data.main_canvas) {
        setCanvasContent(data.main_canvas);
      }

      if (data.left_canvas) {
        setLeftCanvasContent(data.left_canvas);
        if (!showLeftCanvas) setShowLeftCanvas(true);
      }

      // 3. Restore Visuals (per slot)
      const restoreVisual = (media: any, targetId: 'main' | 'left') => {
        if (!media) return;
        const payload: any = {
          targetId,
        };
        if (media.type === 'threejs' || media.type_ === 'threejs') {
          payload.type = 'threejs';
          payload.code = media.content;
        } else {
          payload.url = media.content;
        }
        setTimeout(() => {
          import('./lib/events').then(({ emitEvent }) => emitEvent('canvas-split', payload));
        }, 300);
      };

      if (data.visuals) {
        // New format
        restoreVisual(data.visuals.main, 'main');
        if (data.visuals.left) {
          if (!showLeftCanvas) setShowLeftCanvas(true);
          restoreVisual(data.visuals.left, 'left');
        }

        // Back-compat single visual payload
        if (!data.visuals.main && !data.visuals.left && (data.visuals.type_ || data.visuals.content)) {
          const target = showLeftCanvas ? 'left' : 'main';
          restoreVisual({ type: data.visuals.type_, content: data.visuals.content }, target);
        }
      }

      alert(`Session "${data.name}" loaded!`);

    } catch (error) {
      console.error('Failed to restore session:', error);
      alert('Failed to restore session: ' + error);
    }
  };


  const handleExportProfile = async () => {
    try {
      const { profileService } = await import('./services/ProfileService');
      const jsonString = await profileService.exportProfile();
      
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `user_profile_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export profile. Check console for details.');
    }
  };

  const handleImportProfile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm('This will overwrite your existing API Keys and merge Agents. Continue?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImportStatus('importing');
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const jsonString = e.target?.result as string;
          const { profileService } = await import('./services/ProfileService');
          await profileService.importProfile(jsonString);
          
          setImportStatus('success');
          alert('Profile imported successfully! Reloading to apply changes...');
          window.location.reload();
        } catch (error) {
          console.error('Import processing failed:', error);
          setImportStatus('error');
          alert('Failed to import profile: Invalid file format.');
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Import failed:', error);
      setImportStatus('error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Canvas resizing handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!layoutRef.current) return;
      const rect = layoutRef.current.getBoundingClientRect();
      const min = 260;

      if (isResizingCanvas) {
        // Right Canvas Resizing
        const max = Math.max(320, rect.width - (showLeftCanvas ? leftCanvasWidth : 0) - 360);
        const newWidth = Math.min(Math.max(rect.right - e.clientX, min), max);
        setCanvasWidth(newWidth);
      } else if (isResizingLeftCanvas) {
        // Left Canvas Resizing
        const max = Math.max(320, rect.width - canvasWidth - 360);
        const newWidth = Math.min(Math.max(e.clientX - rect.left, min), max);
        setLeftCanvasWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingCanvas(false);
      setIsResizingLeftCanvas(false);
    };

    if (isResizingCanvas || isResizingLeftCanvas) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingCanvas, isResizingLeftCanvas, showLeftCanvas, leftCanvasWidth, canvasWidth]);



  const testApiKey = async () => {
    if (!tempApiKey.trim()) {
      setTestStatus('error');
      setTestMessage('Please enter an API key');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Testing connection...');

    const isTauriEnv = typeof window !== 'undefined' && (window as any).__TAURI__;

    try {
      if (isTauriEnv) {
        // Tauri desktop
        await invoke('chat_with_minimax', {
          apiKey: tempApiKey,
          messages: [{ role: 'user', content: 'Hi' }]
        });
      } else {
        // Web browser - test directly
        const { webApi } = await import('./lib/webApi');
        await webApi.chatWithAI(
          [{ role: 'user', content: 'Hi' }],
          tempApiKey
        );
      }
      setTestStatus('success');
      setTestMessage('Connection successful!');
    } catch (error) {
      setTestStatus('error');
      setTestMessage(`Failed: ${error}`);
    }
  };

  const testQdrantConnection = async () => {
    if (!tempQdrantApiKey.trim() || !tempQdrantHost.trim()) {
      setQdrantTestStatus('error');
      setQdrantTestMessage('Please enter Qdrant API key and host');
      return;
    }

    setQdrantTestStatus('testing');
    setQdrantTestMessage('Testing Qdrant connection...');

    try {
      // Extract port from host URL if present
      const portMatch = tempQdrantHost.match(/:(\d+)/);
      const qdrantPort = portMatch ? parseInt(portMatch[1], 10) : 6334;

      // Remove port from host for the API call
      const cleanHost = tempQdrantHost.replace(/:(\d+)/, '');

      const response = await invoke<string>('tkg_test_connection', {
        qdrantHost: cleanHost,
        qdrantPort: qdrantPort,
        qdrantCollection: tempQdrantCollection || 'TheDojoKnowledge',
        qdrantApiKey: tempQdrantApiKey,
      });

      const result = JSON.parse(response);
      if (result.success) {
        setQdrantTestStatus('success');
        setQdrantTestMessage(result.message);
      } else {
        setQdrantTestStatus('error');
        setQdrantTestMessage(result.error || 'Connection failed');
      }
    } catch (error) {
      setQdrantTestStatus('error');
      setQdrantTestMessage(`Failed: ${error}`);
    }
  };

  const saveApiKey = () => {
    if (testStatus === 'success') {
      setApiKey(tempApiKey);
      localStorage.setItem('minimax_api_key', tempApiKey);

      if (tempTavilyApiKey) {
        localStorage.setItem('tavily_api_key', tempTavilyApiKey);
      }

      if (tempGrokApiKey) {
        localStorage.setItem('grok_api_key', tempGrokApiKey);
      }

      if (tempQdrantApiKey) {
        localStorage.setItem('qdrant_api_key', tempQdrantApiKey);
      }

      if (tempQdrantHost) {
        localStorage.setItem('qdrant_host', tempQdrantHost);
      }

      if (tempQdrantCollection) {
        localStorage.setItem('qdrant_collection', tempQdrantCollection);
      }

      if (tempCohereApiKey) {
        localStorage.setItem('cohere_api_key', tempCohereApiKey);
      }

      // Initialize TKG with credentials
      if (tempQdrantApiKey && tempQdrantHost && tempCohereApiKey) {
        // Extract port from host URL if present, otherwise use default 6334
        const portMatch = tempQdrantHost.match(/:(\d+)/);
        const qdrantPort = portMatch ? parseInt(portMatch[1], 10) : 6334;

        // Remove port from host for consistency (TKG code uses qdrant_host + "/collections")
        const cleanHost = tempQdrantHost.replace(/:(\d+)/, '');

        console.log('🔌 Initializing TKG with:');
        console.log('  Host:', cleanHost);
        console.log('  Port:', qdrantPort);
        console.log('  Collection:', tempQdrantCollection);

        invoke('tkg_initialize', {
          qdrantHost: cleanHost + ':' + qdrantPort,  // Include port in host
          qdrantPort: qdrantPort,
          qdrantCollection: tempQdrantCollection,
          qdrantApiKey: tempQdrantApiKey,
          cohereApiKey: tempCohereApiKey,
        }).catch((error) => {
          console.error('Failed to initialize TKG:', error);
        });
      }

      setTimeout(() => setShowSettings(false), 1000);
    }
  };



  return (
    <>
      {showLanding ? (
        <Suspense fallback={<PageLoader />}>
          <LandingPage onNavigate={handleNavigate} />
        </Suspense>
      ) : (
        <>
          <AppBackground />
          {theme === 'matrix' && <MatrixRainBackground />}
          <div className="flex h-screen bg-transparent">
            <InvisibleSidebar
              onNavigate={handleNavigate}
              currentView={activeView}
              onOpenSettings={() => setShowSettings(true)}
              onOpenSessions={() => setIsLoadSessionModalOpen(true)}
              onSaveSession={() => setIsSaveSessionModalOpen(true)}
            />
            {/* Hidden SVG for gradient definitions */}
            <svg width="0" height="0" style={{ position: 'absolute' }}>
              <defs>
                <linearGradient id="gradient-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="gradient-green" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#34d399', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="gradient-purple" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#a855f7', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#c084fc', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="gradient-yellow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#eab308', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#fbbf24', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="gradient-pink" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#E94B7D', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#ec4899', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="gradient-orange" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#f97316', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#FF6B35', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="gradient-teal" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#14b8a6', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#2dd4bf', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="gradient-cosmic" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#00BFFF', stopOpacity: 1 }} />
                  <stop offset="50%" style={{ stopColor: '#9370DB', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#228B22', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="gradient-slate" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#94a3b8', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#cbd5e1', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
            </svg>

            {/* Settings Modal */}
            {showSettings && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-card border border-border rounded-lg w-full max-w-md mx-4 shadow-2xl max-h-[85vh] flex flex-col">
                  {/* Header - Fixed */}
                  <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
                    <h2 className="text-xl font-bold text-foreground">Settings</h2>
                    <button
                      onClick={() => setShowSettings(false)}
                      className="hover:opacity-80 transition-opacity text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Content - Scrollable */}
                  <div className="p-6 overflow-y-auto space-y-4">
                    {/* Account Management */}
                    <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border">
                      <h3 className="text-sm font-medium mb-2 text-foreground">Account</h3>
                      {!user ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                            Guest Mode (Local Only)
                          </div>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure? You will be returned to the login screen.')) {
                                localStorage.removeItem('guest_mode');
                                window.location.reload();
                              }
                            }}
                            className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-sm font-medium transition-colors"
                          >
                            Sign In / Create Account
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <div className="w-2 h-2 rounded-full bg-green-500/50" />
                            {user.email}
                          </div>
                          <button
                            onClick={() => signOut()}
                            className="w-full py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-md text-sm font-medium transition-colors"
                          >
                            Sign Out
                          </button>
                        </div>
                      )}


                    </div>

                    {/* Theme Selection */}
                    <div>
                      <label className="text-sm mb-2 block text-foreground">
                        App Theme
                      </label>
                      <ThemeSwitcher />
                    </div>

                    {/* Session Snapshot */}
                    <div className="mt-4 pt-4 border-t border-border">
                      <button
                        onClick={() => {
                          setShowSettings(false); // Close settings
                          setIsSaveSessionModalOpen(true); // Open save modal
                        }}
                        className="w-full py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save Session Snapshot
                      </button>
                      <button
                        onClick={() => {
                          setShowSettings(false); // Close settings
                          setIsLoadSessionModalOpen(true); // Open load modal
                        }}
                        className="w-full mt-2 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Load Session
                      </button>
                    </div>

                    {/* API Key Section */}
                    <div>
                      <label className="text-sm mb-2 block text-foreground">
                        MiniMax API Key
                      </label>
                      <input
                        type="password"
                        value={tempApiKey}
                        onChange={(e) => {
                          setTempApiKey(e.target.value);
                          setTestStatus('idle');
                        }}
                        placeholder="Enter your API key..."
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      />
                      <p className="text-xs mt-1 text-muted-foreground">
                        Get your key from{' '}
                        <a
                          href="https://www.minimaxi.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'rgb(var(--color-accent-blue))' }}
                          className="hover:opacity-80 transition-opacity"
                        >
                          minimaxi.com
                        </a>
                      </p>
                    </div>

                    {/* Tavily API Key Section */}
                    <div>
                      <label className="text-sm mb-2 block text-foreground">
                        Tavily Web Search API Key
                      </label>
                      <input
                        type="password"
                        value={tempTavilyApiKey}
                        onChange={(e) => {
                          setTempTavilyApiKey(e.target.value);
                        }}
                        placeholder="Enter your Tavily API key..."
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      />
                      <p className="text-xs mt-1 text-muted-foreground">
                        Get your key from{' '}
                        <a
                          href="https://tavily.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:opacity-80 transition-opacity"
                          style={{ color: 'rgb(var(--primary))' }}
                        >
                          tavily.com
                        </a>
                        {' '}• Enables web search in AI Chat
                      </p>
                    </div>

                    {/* Grok API Key Section */}
                    <div>
                      <label className="text-sm mb-2 block text-foreground">
                        Grok API Key (x.ai)
                      </label>
                      <input
                        type="password"
                        value={tempGrokApiKey}
                        onChange={(e) => {
                          setTempGrokApiKey(e.target.value);
                        }}
                        placeholder="Enter your Grok API key..."
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      />
                      <p className="text-xs mt-1 text-muted-foreground">
                        Get your key from{' '}
                        <a
                          href="https://x.ai/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:opacity-80 transition-opacity"
                          style={{ color: 'rgb(var(--primary))' }}
                        >
                          x.ai
                        </a>
                        {' '}• Lightning-fast responses with real-time X (Twitter) data
                      </p>
                    </div>

                    {/* Qdrant API Key Section */}
                    <div>
                      <label className="text-sm mb-2 block text-foreground">
                        Qdrant API Key & Host
                      </label>
                      <input
                        type="password"
                        value={tempQdrantApiKey}
                        onChange={(e) => {
                          setTempQdrantApiKey(e.target.value);
                        }}
                        placeholder="Enter your Qdrant API key..."
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground mb-2"
                      />
                      <input
                        type="text"
                        value={tempQdrantHost}
                        onChange={(e) => {
                          setTempQdrantHost(e.target.value);
                        }}
                        placeholder="Qdrant host with port (e.g., https://xyz123.qdrant.io:6334)"
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      />
                      <input
                        type="text"
                        value={tempQdrantCollection}
                        onChange={(e) => {
                          setTempQdrantCollection(e.target.value);
                        }}
                        placeholder="Collection name (default: TheDojoKnowledge)"
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground mt-2"
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={testQdrantConnection}
                          disabled={qdrantTestStatus === 'testing'}
                          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50 text-sm font-medium"
                        >
                          {qdrantTestStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                        </button>
                        {qdrantTestStatus !== 'idle' && (
                          <span className={`text-sm ${qdrantTestStatus === 'success' ? 'text-green-400' :
                            qdrantTestStatus === 'error' ? 'text-red-400' :
                              'text-blue-400'
                            }`}>
                            {qdrantTestMessage}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-1 text-muted-foreground">
                        Get your key from{' '}
                        <a
                          href="https://cloud.qdrant.io/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:opacity-80 transition-opacity"
                          style={{ color: 'rgb(var(--primary))' }}
                        >
                          cloud.qdrant.io
                        </a>
                        {' '}• Vector database for semantic memory
                      </p>
                    </div>

                    {/* Cohere API Key Section */}
                    <div>
                      <label className="text-sm mb-2 block text-foreground">
                        Cohere API Key
                      </label>
                      <input
                        type="password"
                        value={tempCohereApiKey}
                        onChange={(e) => {
                          setTempCohereApiKey(e.target.value);
                        }}
                        placeholder="Enter your Cohere API key..."
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      />
                      <p className="text-xs mt-1 text-muted-foreground">
                        Get your key from{' '}
                        <a
                          href="https://cohere.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:opacity-80 transition-opacity"
                          style={{ color: 'rgb(var(--primary))' }}
                        >
                          cohere.com
                        </a>
                        {' '}• Embeddings API for semantic understanding (~$0.10/1M tokens)
                      </p>
                    </div>

                    {/* Test Status */}
                    {testStatus !== 'idle' && (
                      <div
                        className={`p-3 rounded-lg flex items-center gap-2 ${testStatus === 'testing'
                          ? 'bg-blue-500/10 text-blue-400'
                          : testStatus === 'success'
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-red-500/10 text-red-400'
                          }`}
                      >
                        {testStatus === 'success' && <CheckCircle className="w-5 h-5" />}
                        {testStatus === 'error' && <AlertCircle className="w-5 h-5" />}
                        <span className="text-sm">{testMessage}</span>
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={testApiKey}
                        disabled={testStatus === 'testing'}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                    font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                      </button>
                      <button
                        onClick={saveApiKey}
                        disabled={testStatus !== 'success'}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg
                    font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Save
                      </button>

                    </div>

                    {/* Portable Profile Section */}
                    <div className="mt-8 pt-6 border-t border-border">
                        <h4 className="font-semibold text-lg mb-2">Portable Profile 🎒</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Export your API Keys and Agents to a single file. Import this file on another machine to sync your setup instantly.
                        </p>
                        
                        <div className="flex gap-3">
                           <button
                             onClick={handleExportProfile}
                             className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg font-medium transition-colors"
                           >
                             <Download className="w-4 h-4" />
                             Export Profile
                           </button>
                           
                           <div className="relative">
                             <input
                               ref={fileInputRef}
                               type="file"
                               accept=".json"
                               onChange={handleImportProfile}
                               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                             />
                             <button
                               className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg font-medium transition-colors"
                             >
                               {importStatus === 'importing' ? (
                                 <span className="animate-spin">⌛</span>
                               ) : (
                                 <Upload className="w-4 h-4" />
                               )}
                               Import Profile
                             </button>
                           </div>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">


              <Suspense fallback={<PageLoader />}>
                {activeView === 'browse' && <ContentBrowser />}
                {activeView === 'chat-enhanced' && (
                  <div className="flex h-full overflow-hidden flex-col gap-3" ref={layoutRef}>


                    <div className="flex-1 min-h-0 flex overflow-hidden">
                      {/* Left Canvas (Secondary) */}
                      {showLeftCanvas && (
                        <>
                          <div
                            className="border-r border-border flex-shrink-0 relative z-0 pl-2"
                            style={{ width: `${leftCanvasWidth}px`, minWidth: 260, maxWidth: '40vw' }}
                          >
                            <DojoCanvas
                              content={leftCanvasContent}
                              canvasId="left"
                              onContentChange={(c) => leftCanvasContentRef.current = c}
                              onMediaChange={(m) => leftMediaRef.current = m}
                              slotLabel="Slot C - Secondary Notebook"
                            />
                          </div>
                          <div
                            className="w-1.5 bg-border cursor-col-resize flex-shrink-0 hover:bg-primary/50 transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setIsResizingLeftCanvas(true);
                            }}
                            title="Drag to resize left canvas"
                          />
                        </>
                      )}

                      {/* Chat Area */}
                      <div className={`flex-1 min-w-[320px] relative z-10 ${!showLeftCanvas ? 'pl-2' : ''}`}>
                        <AIChatEnhanced
                          apiKey={apiKey}
                          onSendToCanvas={sendToCanvas}
                        />
                      </div>

                      {/* Right Canvas (Main) */}
                      <div
                        className="w-1.5 bg-border cursor-col-resize flex-shrink-0 hover:bg-primary/50 transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setIsResizingCanvas(true);
                        }}
                        title="Drag to resize canvas"
                      />
                      <div
                        className="border-l border-border flex-shrink-0 relative z-0 pr-2"
                        style={{ width: `${canvasWidth}px`, minWidth: 260, maxWidth: '80vw' }}
                      >
                        <DojoCanvas
                          content={canvasContent}
                          onToggleSecondary={() => setShowLeftCanvas(!showLeftCanvas)}
                          showSecondary={showLeftCanvas}
                          canvasId="main"
                          onContentChange={(c) => mainCanvasContentRef.current = c}
                          onMediaChange={(m) => mainMediaRef.current = m}
                          slotLabel="Slot A - Primary Notebook"
                        />
                      </div>
                    </div>
                  </div>
                )}
                {activeView === 'study-guide' && (
                  <StudyGuideGenerator
                    apiKey={apiKey}
                    onSendToCanvas={sendToCanvas}
                  />
                )}
                {activeView === 'visual' && <VisualLearning apiKey={apiKey} />}
                {activeView === 'search' && <SearchPanel />}
                {activeView === 'embed' && <FileEmbedder />}
                {activeView === 'progress' && <ProgressTracker />}
                {activeView === 'timer' && <HyperfocusTimer />}
                {activeView === 'cascade' && <CascadeBrainstorm />}
                {activeView === 'blueprints' && (
                  <div className="flex-1 overflow-hidden p-6">
                    <div className="h-full bg-card/50 border border-border rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
                      <BlueprintsBrowser onLoadFile={(content, type) => {
                        let payload = content;
                        if (type === 'html') payload = '```html\n' + content + '\n```';
                        else if (type === 'javascript') payload = '```javascript\n' + content + '\n```';
                        else if (type === 'css') payload = '```css\n' + content + '\n```';
                        else if (type === 'json') payload = '```json\n' + content + '\n```';

                        sendToCanvas(payload);
                        setActiveView('chat-enhanced');
                      }} />
                    </div>
                  </div>
                )}
                {activeView === 'canvas' && <DojoCanvas />}
                {activeView === 'agent-manager' && <AgentManager />}
              </Suspense>
            </div>
          </div>
        </>
      )}
      {/* Onboarding Wizard */}
      <Suspense fallback={null}>
        {showOnboarding && user && (
          <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
        )}
      </Suspense>

      <SaveSessionModal
        isOpen={isSaveSessionModalOpen}
        onClose={() => setIsSaveSessionModalOpen(false)}
        onSave={handleSaveSession}
      />
      <LoadSessionModal
        isOpen={isLoadSessionModalOpen}
        onClose={() => setIsLoadSessionModalOpen(false)}
        onLoad={handleLoadSession}
      />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
