/**
 * Tool Toolbar Component
 * Toggle tools on/off to control AI capabilities and costs
 */

import React, { useState } from 'react';
import { Calculator, Search, BookOpen, FileText, Globe, PenTool, MessageSquare, Database, Wrench, ChevronDown, ChevronUp, FolderTree, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  costLevel: 'low' | 'medium' | 'high';
  enabled: boolean;
}

interface ToolToolbarProps {
  enabledTools: Record<string, boolean>;
  onToggleTool: (toolId: string, enabled: boolean) => void;
  className?: string;
  mode?: 'default' | 'header';
}

const ToolToolbar: React.FC<ToolToolbarProps> = ({
  enabledTools,
  onToggleTool,
  className = '',
  mode = 'default'
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [headerOpen, setHeaderOpen] = useState(false);

  const tools: Tool[] = [
    {
      id: 'calculate',
      name: 'Calculator',
      description: 'Math calculations',
      icon: Calculator,
      costLevel: 'low',
      enabled: enabledTools.calculate || false
    },
    {
      id: 'search_knowledge',
      name: 'Knowledge Search',
      description: 'Search your knowledge base',
      icon: Search,
      costLevel: 'low',
      enabled: enabledTools.search_knowledge || false
    },
    {
      id: 'read_file',
      name: 'File Reader',
      description: 'Read knowledge base files',
      icon: FileText,
      costLevel: 'low',
      enabled: enabledTools.read_file || false
    },
    {
      id: 'list_markdown_files',
      name: 'List Files',
      description: 'List available files',
      icon: Database,
      costLevel: 'low',
      enabled: enabledTools.list_markdown_files || false
    },
    {
      id: 'scan_codebase',
      name: 'Scan Codebase',
      description: 'Scan project structure',
      icon: FolderTree,
      costLevel: 'low',
      enabled: enabledTools.scan_codebase || false
    },
    {
      id: 'start_debate',
      name: 'Start Debate',
      description: 'Debate a topic with AI',
      icon: MessageSquare,
      costLevel: 'medium',
      enabled: enabledTools.start_debate || false
    },
    {
      id: 'write_file_batch',
      name: 'Batch Write',
      description: 'Write multiple files',
      icon: PenTool,
      costLevel: 'medium',
      enabled: enabledTools.write_file_batch || false
    },
    {
      id: 'run_terminal_command',
      name: 'Terminal',
      description: 'Run shell commands',
      icon: Wrench,
      costLevel: 'high',
      enabled: enabledTools.run_terminal_command || false
    },
    {
      id: 'tkg_search',
      name: 'Memory Search',
      description: 'Search long-term memory',
      icon: Database,
      costLevel: 'low',
      enabled: enabledTools.tkg_search || false
    },
    {
      id: 'tkg_store',
      name: 'Memory Store',
      description: 'Save to long-term memory',
      icon: Database,
      costLevel: 'low',
      enabled: enabledTools.tkg_store || false
    },
    {
      id: 'create_study_guide',
      name: 'Study Guide',
      description: 'Generate study guides',
      icon: BookOpen,
      costLevel: 'medium',
      enabled: enabledTools.create_study_guide || false
    },
    {
      id: 'write_file',
      name: 'Write File',
      description: 'Create files in knowledge base',
      icon: PenTool,
      costLevel: 'medium',
      enabled: enabledTools.write_file || false
    },
    {
      id: 'web_search',
      name: 'Web Search',
      description: 'Search the web (Tavily)',
      icon: Globe,
      costLevel: 'high',
      enabled: enabledTools.web_search || false
    },
    {
      id: 'deep_research',
      name: 'Deep Research',
      description: 'Autonomous research agent',
      icon: Globe,
      costLevel: 'high',
      enabled: enabledTools.deep_research || false
    },
    {
      id: 'consult_agent',
      name: 'Consult Agent',
      description: 'Ask a registered agent for input',
      icon: Bot,
      costLevel: 'high',
      enabled: enabledTools.consult_agent || false
    },
    {
      id: 'brainstorm_with_grok',
      name: 'Grok Brainstorm',
      description: 'Get Grok perspective',
      icon: MessageSquare,
      costLevel: 'high',
      enabled: enabledTools.brainstorm_with_grok || false
    }
  ];

  const getCostColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getCostBadge = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low':
        return 'Low Cost';
      case 'medium':
        return 'Medium Cost';
      case 'high':
        return 'High Cost';
    }
  };

  const enabledCount = Object.values(enabledTools).filter(Boolean).length;
  const totalCost = tools.filter(t => t.enabled).reduce((sum, tool) => {
    const cost = tool.costLevel === 'low' ? 1 : tool.costLevel === 'medium' ? 2 : 3;
    return sum + cost;
  }, 0);

  // Header Mode Layout
  if (mode === 'header') {
    return (
      <div className={`flex items-center ${className}`}>
        <button
          onClick={() => setHeaderOpen(!headerOpen)}
          className={`
            p-2 rounded-lg transition-all duration-300 mr-2
            ${headerOpen ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}
          `}
          title="Toggle AI Tools"
        >
          <Wrench className="w-4 h-4" />
        </button>

        <AnimatePresence>
          {headerOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex items-center gap-2 overflow-hidden"
            >
              {tools.map((tool) => {
                const Icon = tool.icon;
                const isEnabled = enabledTools[tool.id];
                return (
                  <button
                    key={tool.id}
                    onClick={() => onToggleTool(tool.id, !isEnabled)}
                    className={`
                      p-2 rounded-lg transition-all duration-300 relative group flex-shrink-0
                      ${isEnabled
                        ? 'neumorphic-outset text-primary'
                        : 'hover:bg-black/5 text-muted-foreground'
                      }
                    `}
                    title={`${tool.name}: ${tool.description}`}
                  >
                    <Icon className="w-4 h-4" />

                    {/* Tooltip */}
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                      {tool.name}
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // If collapsed, show compact version
  if (collapsed) {
    return (
      <div className={`glass-panel rounded-xl border-0 shadow-lg ${className}`}>
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">AI Tools</span>
            <span className="text-xs text-muted-foreground">({enabledCount}/{tools.length})</span>
          </div>
          <button
            onClick={() => setCollapsed(false)}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Expand tools"
          >
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="px-2 pb-2">
          <div className="flex gap-1 overflow-x-auto">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isEnabled = enabledTools[tool.id];
              return (
                <button
                  key={tool.id}
                  onClick={() => onToggleTool(tool.id, !isEnabled)}
                  className={`
                    flex-shrink-0 p-2 rounded-lg border transition-all
                    ${isEnabled
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border bg-background/50 hover:border-primary/30'
                    }
                  `}
                  title={`${tool.name}: ${tool.description}`}
                >
                  <Icon className={`w-4 h-4 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-panel rounded-xl border-0 shadow-lg ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">AI Tools</span>
          <span className="text-xs text-muted-foreground">
            ({enabledCount}/{tools.length} enabled)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Cost:</span>
          <div className="flex items-center gap-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${i < totalCost ? 'bg-orange-400' : 'bg-gray-200'
                  }`}
              />
            ))}
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 hover:bg-muted rounded transition-colors ml-2"
            title="Collapse tools"
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isEnabled = enabledTools[tool.id];

            return (
              <button
                key={tool.id}
                onClick={() => onToggleTool(tool.id, !isEnabled)}
                className={`
                  relative p-3 rounded-lg border-2 transition-all text-left
                  ${isEnabled
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border bg-background/50 hover:border-primary/50'
                  }
                `}
              >
                {/* Toggle Switch */}
                <div className="absolute top-2 right-2">
                  <div
                    className={`
                      w-8 h-5 rounded-full transition-colors relative
                      ${isEnabled ? 'bg-primary' : 'bg-gray-300'}
                    `}
                  >
                    <div
                      className={`
                        absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform
                        ${isEnabled ? 'translate-x-3.5' : 'translate-x-0.5'}
                      `}
                    />
                  </div>
                </div>

                {/* Tool Icon */}
                <Icon
                  className={`w-5 h-5 mb-2 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`}
                />

                {/* Tool Name */}
                <div className="font-medium text-sm mb-1">{tool.name}</div>

                {/* Tool Description */}
                <div className="text-xs text-muted-foreground mb-2">
                  {tool.description}
                </div>

                {/* Cost Badge */}
                <div
                  className={`
                    inline-block px-2 py-0.5 rounded text-xs font-medium border
                    ${getCostColor(tool.costLevel)}
                  `}
                >
                  {getCostBadge(tool.costLevel)}
                </div>
              </button>
            );
          })}
        </div>

        {/* Info Footer */}
        <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
          💡 <strong>Tip:</strong> Enable only the tools you need to reduce costs and improve response speed.
          High-cost tools use external APIs (Tavily/Grok).
        </div>
      </div>
    </div>
  );
};

export default ToolToolbar;
