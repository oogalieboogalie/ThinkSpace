import React, { useState } from 'react';
import { BookOpen, Image, Settings, MessageSquare, Zap, Upload, ChevronLeft, ChevronRight, Folder, Bot, Save } from 'lucide-react';

interface InvisibleSidebarProps {
  onNavigate: (view: string) => void;
  currentView: string;
  onOpenSettings: () => void;
  onOpenSessions: () => void;
  onSaveSession: () => void;
}

const InvisibleSidebar: React.FC<InvisibleSidebarProps> = ({ onNavigate, currentView, onOpenSettings, onOpenSessions, onSaveSession }) => {
  const [collapsed, setCollapsed] = useState(false);
  // Removed visibility logic to make it static/visible
  // const [isVisible, setIsVisible] = useState(false);
  // const [isHovering, setIsHovering] = useState(false);

  const navigation = [
    { id: 'browse', icon: BookOpen, label: 'Browse Guides', color: 'blue' },
    { id: 'blueprints', icon: Folder, label: 'Blueprints', color: 'cyan' },
    { id: 'chat-enhanced', icon: MessageSquare, label: 'Agent Chat', color: 'purple' },
    { id: 'agent-manager', icon: Bot, label: 'Agent Registry', color: 'fuchsia' },
    // { id: 'study-guide', icon: FileText, label: 'Study Guides', color: 'pink' },
    { id: 'visual', icon: Image, label: 'Visual Learning', color: 'yellow' },
    // { id: 'search', icon: Search, label: 'Quick Search', color: 'orange' },
    { id: 'embed', icon: Upload, label: 'File Embedder', color: 'teal' },
    // { id: 'progress', icon: Brain, label: 'Progress', color: 'blue' },
    // { id: 'kanban', icon: Layout, label: 'Board', color: 'indigo' },
    // { id: 'timer', icon: Timer, label: 'Hyperfocus', color: 'green' },
  ];

  return (
    <>
      {/* Sidebar Container */}
      <div
        style={{
          // Removed fixed positioning
          position: 'relative',
          width: collapsed ? '60px' : '240px',
          zIndex: 50,
          transition: 'width 0.3s ease-out',
          flexShrink: 0, // Prevent shrinking in flex container
        }}
      >
        <div
          className={`
            glass-panel
            border-r border-border/50
            h-full flex flex-col
            transition-all duration-500 ease-out
            z-50
          `}
          style={{
            background: `linear-gradient(135deg, rgba(var(--background), 0.85) 0%, rgba(var(--card), 0.6) 100%)`,
            boxShadow: `
              inset 1px 1px 0 rgba(255, 255, 255, 0.05),
              inset -1px 0 0 rgba(var(--primary), 0.05),
              15px 0 40px -5px rgba(0,0,0,0.2)
            `,
          }}
        >
          {/* Header */}
          <div className="p-3 border-b border-border/30">
            <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center animate-pulse">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              {!collapsed && (
                <div>
                  <h1 className="text-sm font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Menu
                  </h1>
                </div>
              )}
              <button
                onClick={() => setCollapsed(!collapsed)}
                className={`p-1.5 hover:bg-muted/20 rounded-lg transition-all ${collapsed ? 'absolute -right-3 top-6 bg-card border border-border shadow-sm' : 'ml-auto'}`}
                title={collapsed ? 'Expand' : 'Collapse'}
              >
                {collapsed ? (
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 ${collapsed ? 'p-2' : 'p-3'} space-y-1 overflow-y-auto`}>
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`
                    w-full flex items-center rounded-xl
                    transition-all duration-300 group
                    ${isActive ? 'scale-105' : 'hover:scale-102 hover:bg-muted/10'}
                  `}
                  style={{
                    padding: collapsed ? '8px' : '6px 8px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  <div
                    className={`
                      flex items-center justify-center
                      transition-all duration-300
                      ${collapsed ? 'w-8 h-8' : 'w-7 h-7 rounded-lg'}
                    `}
                  >
                    <Icon
                      className={`
                        transition-all duration-300
                        ${collapsed ? 'w-5 h-5' : 'w-5 h-5'}
                        ${isActive ? 'text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]' : 'text-muted-foreground group-hover:text-foreground'}
                      `}
                    />
                  </div>

                  {!collapsed && (
                    <span
                      className={`
                        font-medium transition-all duration-300 ml-2
                        ${isActive ? 'text-primary font-bold' : 'text-muted-foreground group-hover:text-foreground'}
                      `}
                    >
                      {item.label}
                    </span>
                  )}

                  {isActive && !collapsed && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_rgba(var(--primary),0.8)]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className={`${collapsed ? 'p-2' : 'p-3'} border-t border-border/30 space-y-1`}>
            <button
              onClick={onSaveSession}
              className="w-full flex items-center rounded-xl hover:bg-muted/10 transition-all duration-300 group"
              style={{
                padding: collapsed ? '8px' : '6px 8px',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
              title={collapsed ? 'Save Session Snapshot' : undefined}
            >
              <Save className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
              {!collapsed && (
                <span className="text-muted-foreground group-hover:text-foreground font-medium ml-2">Save Session</span>
              )}
            </button>
            <button
              onClick={onOpenSessions}
              className="w-full flex items-center rounded-xl hover:bg-muted/10 transition-all duration-300 group"
              style={{
                padding: collapsed ? '8px' : '6px 8px',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
              title={collapsed ? 'Load Session' : undefined}
            >
              <Upload className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
              {!collapsed && (
                <span className="text-muted-foreground group-hover:text-foreground font-medium ml-2">Load Session</span>
              )}
            </button>
            <button
              onClick={onOpenSettings}
              className="w-full flex items-center rounded-xl hover:bg-muted/10 transition-all duration-300 group"
              style={{
                padding: collapsed ? '8px' : '6px 8px',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
              title={collapsed ? 'Settings' : undefined}
            >
              <Settings className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
              {!collapsed && (
                <span className="text-muted-foreground group-hover:text-foreground font-medium ml-2">Settings</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default InvisibleSidebar;
