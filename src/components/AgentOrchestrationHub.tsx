import React, { useState, useEffect } from 'react';
import { Zap, Play, Settings, Plus, GitBranch } from 'lucide-react';
import { agentRegistry } from '../services/AgentRegistry';
import { agentOrchestrator } from '../services/AgentOrchestrator';
import { Agent, AgentChain, AgentOutput } from '../types/agent';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AgentOrchestrationHubProps {
  apiKey: string;
}

const AgentOrchestrationHub: React.FC<AgentOrchestrationHubProps> = ({ apiKey }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [chains, setChains] = useState<AgentChain[]>([]);
  const [task, setTask] = useState('');
  const [selectedChain, setSelectedChain] = useState<string>('');
  const [outputs, setOutputs] = useState<AgentOutput[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateChain, setShowCreateChain] = useState(false);
  const [newChainName, setNewChainName] = useState('');
  const [newChainAgents, setNewChainAgents] = useState<string[]>([]);

  useEffect(() => {
    setAgents(agentRegistry.getAllAgents());
    setChains(agentRegistry.getAllChains());
    agentOrchestrator.initializeCommonChains();
    setChains(agentRegistry.getAllChains());
  }, []);

  const executeChain = async () => {
    if (!task || !selectedChain) return;

    setLoading(true);
    setOutputs([]);

    try {
      const chain = agentRegistry.getChain(selectedChain);
      if (!chain) {
        throw new Error('Chain not found');
      }
      void chain; // unused but needed for type

      const results = await agentOrchestrator.executeChain(
        chain,
        { task },
        apiKey
      );

      setOutputs(results);
    } catch (error) {
      console.error('Execution failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCustomChain = () => {
    if (!newChainName || newChainAgents.length === 0) return;

    const chain = agentRegistry.createCustomChain(
      newChainName,
      newChainAgents,
      { description: 'Custom chain created by user' }
    );
    void chain; // unused but needed for type

    setChains(agentRegistry.getAllChains());
    setShowCreateChain(false);
    setNewChainName('');
    setNewChainAgents([]);
  };

  const toggleAgentInNewChain = (agentId: string) => {
    setNewChainAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const selectedChainObj = chains.find(c => c.id === selectedChain);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-white">Agent Orchestration Hub</h1>
        </div>
        <button
          onClick={() => setShowCreateChain(!showCreateChain)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Custom Chain
        </button>
      </div>

      {showCreateChain && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">Create Custom Agent Chain</h2>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Chain Name
            </label>
            <input
              type="text"
              value={newChainName}
              onChange={(e) => setNewChainName(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., My Content Pipeline"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Agents (in execution order)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {agents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => toggleAgentInNewChain(agent.id)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    newChainAgents.includes(agent.id)
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-muted border-border text-foreground hover:border-slate-500'
                  }`}
                >
                  <div className="font-semibold text-sm">{agent.name}</div>
                  <div className="text-xs opacity-75">{agent.role}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={createCustomChain}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
            >
              Create Chain
            </button>
            <button
              onClick={() => setShowCreateChain(false)}
              className="px-4 py-2 bg-muted/60 hover:bg-muted text-white rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuration
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Select Agent Chain
              </label>
              <select
                value={selectedChain}
                onChange={(e) => setSelectedChain(e.target.value)}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a chain...</option>
                {chains.map(chain => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedChainObj && (
              <div className="bg-muted rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  {selectedChainObj.name}
                </h3>
                <p className="text-sm text-foreground mb-3">{selectedChainObj.description}</p>
                <div className="flex flex-wrap gap-2">
                  {selectedChainObj.agents.map((chainAgent, idx) => {
                    const agent = agents.find(a => a.id === chainAgent.agentId);
                    return agent ? (
                      <div
                        key={chainAgent.agentId}
                        className="px-3 py-1 bg-muted/60 rounded-full text-xs text-white flex items-center gap-2"
                      >
                        <span>{idx + 1}.</span>
                        <span>{agent.name}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Task
              </label>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-white focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                placeholder="Describe what you want to accomplish..."
              />
            </div>

            <button
              onClick={executeChain}
              disabled={!task || !selectedChain || loading}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-muted/60 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Execute Chain
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Results</h2>

          {outputs.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">
              No outputs yet. Execute a chain to see results.
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {outputs.map((output, idx) => (
                <div
                  key={`${output.agentId}-${idx}`}
                  className={`border rounded-lg p-4 ${
                    output.success
                      ? 'border-green-700 bg-muted/50'
                      : 'border-red-700 bg-red-900/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{output.agentName}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(output.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    {!output.success && (
                      <div className="text-xs text-red-400">{output.error}</div>
                    )}
                  </div>

                  {output.success && (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {output.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Available Agents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map(agent => (
            <div key={agent.id} className="bg-muted rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-white">{agent.name}</h3>
                <span className="text-xs px-2 py-1 bg-blue-600 text-white rounded">
                  {agent.role}
                </span>
              </div>
              <p className="text-sm text-foreground mb-2">{agent.description}</p>
              <div className="text-xs text-muted-foreground">v{agent.version}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AgentOrchestrationHub;
