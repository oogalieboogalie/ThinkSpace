import { useState, useEffect, useRef } from 'react';
import { agentRegistry } from '../services/AgentRegistry';
import { Agent } from '../types/agent';
import {
  Plus, Trash2, Edit2, Save, X, Bot, Download, Clock,
  Layout, Search, PenTool, ShieldCheck, BarChart, Zap,
  Code, Shield, Play, Briefcase, Scale, Megaphone, Lock,
  Headphones, Users, Database, DollarSign, Layers, BookOpen, Globe,
  Video
} from 'lucide-react';
import { Button } from './ui/button';
import { PRESET_AGENTS } from '../lib/presetAgents';

const ROLE_THEMES: Record<string, { icon: any; color: string; gradient: string }> = {
  planner: {
    icon: Layout,
    color: 'text-blue-400',
    gradient: 'from-blue-500/20 to-cyan-500/20'
  },
  researcher: {
    icon: Search,
    color: 'text-purple-400',
    gradient: 'from-purple-500/20 to-pink-500/20'
  },
  writer: {
    icon: PenTool,
    color: 'text-orange-400',
    gradient: 'from-orange-500/20 to-red-500/20'
  },
  reviewer: {
    icon: ShieldCheck,
    color: 'text-green-400',
    gradient: 'from-green-500/20 to-emerald-500/20'
  },
  analyzer: {
    icon: BarChart,
    color: 'text-yellow-400',
    gradient: 'from-yellow-500/20 to-amber-500/20'
  },
  coordinator: {
    icon: Zap,
    color: 'text-indigo-400',
    gradient: 'from-indigo-500/20 to-blue-500/20'
  },
  // New Roles
  engineer: {
    icon: Code,
    color: 'text-cyan-400',
    gradient: 'from-cyan-500/20 to-blue-500/20'
  },
  protector: {
    icon: Shield,
    color: 'text-red-400',
    gradient: 'from-red-500/20 to-rose-500/20'
  },
  executor: {
    icon: Play,
    color: 'text-emerald-400',
    gradient: 'from-emerald-500/20 to-green-500/20'
  },
  quant: {
    icon: BarChart,
    color: 'text-teal-400',
    gradient: 'from-teal-500/20 to-cyan-500/20'
  },
  legal: {
    icon: Scale,
    color: 'text-slate-400',
    gradient: 'from-slate-500/20 to-gray-500/20'
  },
  marketing: {
    icon: Megaphone,
    color: 'text-pink-400',
    gradient: 'from-pink-500/20 to-rose-500/20'
  },
  security: {
    icon: Lock,
    color: 'text-red-500',
    gradient: 'from-red-600/20 to-orange-600/20'
  },
  support: {
    icon: Headphones,
    color: 'text-sky-400',
    gradient: 'from-sky-500/20 to-blue-500/20'
  },
  'data-science': {
    icon: Database,
    color: 'text-violet-400',
    gradient: 'from-violet-500/20 to-purple-500/20'
  },
  strategist: {
    icon: Layers,
    color: 'text-fuchsia-400',
    gradient: 'from-fuchsia-500/20 to-pink-500/20'
  },
  finance: {
    icon: DollarSign,
    color: 'text-green-500',
    gradient: 'from-green-500/20 to-emerald-500/20'
  },
  architect: {
    icon: Layers,
    color: 'text-amber-400',
    gradient: 'from-amber-500/20 to-orange-500/20'
  },
  curator: {
    icon: BookOpen,
    color: 'text-stone-400',
    gradient: 'from-stone-500/20 to-neutral-500/20'
  },
  translator: {
    icon: Globe,
    color: 'text-blue-300',
    gradient: 'from-blue-400/20 to-indigo-400/20'
  },
  creative: {
    icon: Video,
    color: 'text-rose-400',
    gradient: 'from-rose-500/20 to-pink-500/20'
  },
  default: {
    icon: Bot,
    color: 'text-primary',
    gradient: 'from-primary/20 to-accent/20'
  }
};

// Sub-component for individual card logic
const PredictiveAgentCard = ({
  agent,
  onEdit,
  onDelete
}: {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (id: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0, width: 0 });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const theme = ROLE_THEMES[agent.role] || ROLE_THEMES.default;
  const Icon = theme.icon;

  const handleMouseEnter = () => {
    // Start prediction timer
    timerRef.current = setTimeout(() => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        setCoords({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          width: rect.width
        });
        setIsExpanded(true);
      }
    }, 350); // 0.35s per user request
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsExpanded(false);
  };

  return (
    <>
      <div
        ref={cardRef}
        className="relative h-28 group" // Slightly taller for better presence
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* 1. Default Minimal State (Always visible in background) */}
        <div className={`
        absolute inset-0 
        flex flex-col items-start justify-between p-4 text-left
        bg-card/30 backdrop-blur-md border border-white/10 rounded-2xl
        transition-all duration-500 ease-out
        shadow-[0_4px_20px_-5px_rgba(0,0,0,0.3)]
        ${isExpanded ? 'opacity-0 scale-95' : 'opacity-100 group-hover:bg-card/50 group-hover:border-white/20 group-hover:shadow-primary/10 group-hover:shadow-2xl'}
      `}>
          {/* Header: Icon + Name + Role */}
          <div className="flex items-start gap-3 w-full">
            <div className={`shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center ${theme.color} border border-white/5 group-hover:scale-110 transition-transform duration-500`}>
              <Icon className="w-5 h-5 drop-shadow-[0_0_8px_currentColor]" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h3 className="font-bold text-sm text-foreground/90 truncate w-full tracking-tight">
                {agent.name}
              </h3>
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60 font-mono mt-0.5 truncate">
                {agent.role}
              </div>
            </div>
          </div>

          {/* Details / Description */}
          <div className="w-full mt-auto">
            <div className="h-[1px] w-8 bg-white/5 mb-2" />
            <p className="text-[10px] text-muted-foreground/60 line-clamp-2 leading-relaxed font-medium">
              {agent.description}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Predictive "Pop-out" State - Rendered FIXED to escape clipping */}
      {isExpanded && (
        <div
          className="fixed z-[100] overflow-hidden bg-card/90 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-300 ease-out"
          style={{
            left: coords.x,
            top: coords.y,
            width: coords.width * 1.3,
            minWidth: '280px',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'auto'
          }}
          onMouseEnter={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            setIsExpanded(true);
          }}
          onMouseLeave={() => setIsExpanded(false)}
        >
          <div className={`flex flex-col h-full bg-gradient-to-b ${theme.gradient} to-transparent p-5`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-card/50 border border-white/10 ${theme.color} shadow-lg`}>
                  <Icon className="w-5 h-5 drop-shadow-[0_0_8px_currentColor]" />
                </div>
                <div className="text-left">
                  <div className="font-black text-base leading-tight text-foreground tracking-tight">{agent.name}</div>
                  <div className={`text-[10px] uppercase tracking-[0.2em] ${theme.color} font-mono font-bold mt-0.5`}>{agent.role}</div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-4">
              <p className="text-xs text-foreground/70 leading-relaxed line-clamp-5 font-medium italic">
                "{agent.description}"
              </p>

              {/* Quick Info Bits */}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50 font-mono bg-black/20 w-fit px-2 py-1 rounded-md border border-white/5">
                <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> v{agent.version}</span>
                <span className="opacity-30">|</span>
                <span className="truncate max-w-[100px]">{agent.id}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10">
              <button
                onClick={() => onEdit(agent)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-foreground text-xs font-bold transition-all duration-200 active:scale-95`}
                title="Edit Agent"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Construct
              </button>
              <button
                onClick={() => onDelete(agent.id)}
                className="flex-none p-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/10 transition-all duration-200 active:scale-95"
                title="Delete Agent"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default function AgentManager() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<Partial<Agent>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = () => {
    setLoading(true);
    const allAgents = agentRegistry.getAllAgents();
    setAgents(allAgents);
    setLoading(false);
  };


  const handleCreateNew = () => {
    setCurrentAgent({
      id: `custom-agent-${Date.now()}`,
      name: '',
      role: 'planner',
      description: '',
      systemPrompt: '',
      version: '1.0.0',
    });
    setIsEditing(true);
  };

  const handleImportPresets = async () => {
    if (confirm(`This will import ${PRESET_AGENTS.length} preset agents. Continue?`)) {
      for (const agent of PRESET_AGENTS) {
        await agentRegistry.registerAgent(agent);
      }
      loadAgents();
      // Use a custom toast or smaller alert in real app, generic alert for now
      // alert('Agents imported successfully!'); 
    }
  };

  const handleEdit = (agent: Agent) => {
    setCurrentAgent({ ...agent });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    // In a predictive UI, maybe double check isn't needed? 
    // Keeping it for safety.
    if (confirm('Are you sure you want to delete this agent?')) {
      await agentRegistry.removeAgent(id);
      loadAgents();
    }
  };

  const handleSave = async () => {
    if (!currentAgent.name || !currentAgent.systemPrompt) {
      alert('Name and System Prompt are required');
      return;
    }

    const agentToSave: Agent = {
      id: currentAgent.id || `agent-${Date.now()}`,
      name: currentAgent.name,
      description: currentAgent.description || '',
      role: currentAgent.role as Agent['role'] || 'planner',
      systemPrompt: currentAgent.systemPrompt,
      version: currentAgent.version || '1.0.0',
      createdAt: currentAgent.createdAt || Date.now(),
    };

    await agentRegistry.registerAgent(agentToSave);
    setIsEditing(false);
    loadAgents();
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Initializing Agent Registry...</div>;
  }

  const handleReset = async () => {
    if (confirm('⚠️ This will DELETE all custom agents and restore the original 38 presets. Are you sure?')) {
      await agentRegistry.resetToDefaults();
      loadAgents();
    }
  };

  return (
    <div className="h-full flex flex-col bg-background/50 backdrop-blur-sm p-8 overflow-hidden">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-pink-400 tracking-tight">
            Agent Registry
          </h1>
          <p className="text-muted-foreground mt-2 font-light">
            Focus heavily on the name. Hover to expand consciousness.
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="destructive" onClick={handleReset} className="flex items-center gap-2 shadow-lg shadow-destructive/20">
            <Trash2 className="w-4 h-4" />
            Reset to Defaults
          </Button>
          <Button onClick={handleCreateNew} className="flex items-center gap-2 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            New Construct
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full bg-card/80 border border-border/50 rounded-2xl p-8 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20 text-primary">
                <Edit2 className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold">
                {currentAgent.createdAt ? 'Refine Construct' : 'Initialize Construct'}
              </h2>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)} className="rounded-full hover:bg-destructive/10 hover:text-destructive">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-muted-foreground">Identity Name</label>
                <input
                  className="w-full p-3 rounded-lg bg-secondary/30 border border-border/50 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/30"
                  value={currentAgent.name || ''}
                  onChange={e => setCurrentAgent(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. The Architect"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-muted-foreground">Functional Role</label>
                <select
                  className="w-full p-3 rounded-lg bg-secondary/30 border border-border/50 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  value={currentAgent.role || 'planner'}
                  onChange={e => setCurrentAgent(prev => ({ ...prev, role: e.target.value as any }))}
                >
                  <option value="planner">Planner (Strategy)</option>
                  <option value="researcher">Researcher (Discovery)</option>
                  <option value="writer">Writer (Creation)</option>
                  <option value="reviewer">Reviewer (Quality)</option>
                  <option value="analyzer">Analyzer (Data)</option>
                  <option value="coordinator">Coordinator (Flow)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-muted-foreground">Directive Description</label>
                <textarea
                  className="w-full h-32 p-3 rounded-lg bg-secondary/30 border border-border/50 focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
                  value={currentAgent.description || ''}
                  onChange={e => setCurrentAgent(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief summary of capability..."
                />
              </div>
            </div>

            <div className="flex flex-col h-full">
              <label className="block text-sm font-semibold mb-2 text-muted-foreground">System Consciousness (Prompt)</label>
              <textarea
                className="flex-1 p-4 rounded-lg bg-black/20 border border-border/50 focus:ring-2 focus:ring-primary/50 outline-none font-mono text-xs leading-relaxed transition-all resize-none"
                value={currentAgent.systemPrompt || ''}
                onChange={e => setCurrentAgent(prev => ({ ...prev, systemPrompt: e.target.value }))}
                placeholder="You are..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-8 mt-4 border-t border-white/5">
            <Button variant="ghost" onClick={() => setIsEditing(false)}>Discard</Button>
            <Button onClick={handleSave} className="flex items-center gap-2 px-8">
              <Save className="w-4 h-4" />
              Save Construct
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Horizontal Tab Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-6 mb-2 no-scrollbar scroll-smooth shrink-0">
            <button
              onClick={() => setActiveTab('all')}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all duration-300 whitespace-nowrap
                ${activeTab === 'all'
                  ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]'
                  : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:border-white/20'}
              `}
            >
              <Bot className="w-4 h-4" />
              <span className="text-sm font-bold">All Constructs</span>
              <span className="text-[10px] font-mono opacity-50 bg-black/20 px-1.5 py-0.5 rounded-md">
                {agents.length}
              </span>
            </button>

            {Object.keys(ROLE_THEMES).filter(role => role !== 'default').map(role => {
              const roleAgents = agents.filter(a => a.role === role);
              if (roleAgents.length === 0) return null;

              const theme = ROLE_THEMES[role];
              const Icon = theme.icon;
              const isActive = activeTab === role;

              return (
                <button
                  key={role}
                  onClick={() => setActiveTab(role)}
                  className={`
                    flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all duration-300 whitespace-nowrap
                    ${isActive
                      ? `bg-gradient-to-br ${theme.gradient} border-white/20 ${theme.color} shadow-lg`
                      : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:border-white/20'}
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'drop-shadow-[0_0_8px_currentColor]' : ''}`} />
                  <span className="text-sm font-bold capitalize">{role}s</span>
                  <span className="text-[10px] font-mono opacity-50 bg-black/20 px-1.5 py-0.5 rounded-md">
                    {roleAgents.length}
                  </span>
                </button>
              );
            })}

            {/* Other Category Tab */}
            {agents.filter(a => !Object.keys(ROLE_THEMES).includes(a.role)).length > 0 && (
              <button
                onClick={() => setActiveTab('other')}
                className={`
                  flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all duration-300 whitespace-nowrap
                  ${activeTab === 'other'
                    ? 'bg-white/20 border-white/30 text-foreground shadow-lg'
                    : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:border-white/20'}
                `}
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-bold">Other</span>
                <span className="text-[10px] font-mono opacity-50 bg-black/20 px-1.5 py-0.5 rounded-md">
                  {agents.filter(a => !Object.keys(ROLE_THEMES).includes(a.role)).length}
                </span>
              </button>
            )}
          </div>

          {/* Filtered Grid View */}
          <div className="flex-1 overflow-y-auto pb-20 px-2">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {agents
                .filter(agent => {
                  if (activeTab === 'all') return true;
                  if (activeTab === 'other') return !Object.keys(ROLE_THEMES).includes(agent.role);
                  return agent.role === activeTab;
                })
                .map(agent => (
                  <PredictiveAgentCard
                    key={agent.id}
                    agent={agent}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
