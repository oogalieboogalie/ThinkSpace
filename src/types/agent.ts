export interface Agent {
  id: string;
  name: string;
  description: string;
  role: 'researcher' | 'planner' | 'writer' | 'analyzer' | 'reviewer' | 'coordinator' |
  'engineer' | 'protector' | 'executor' | 'quant' | 'legal' | 'marketing' |
  'security' | 'support' | 'data-science' | 'strategist' | 'finance' |
  'architect' | 'curator' | 'translator' | 'creative' | 'analyst' | 'orchestrator';
  systemPrompt: string;
  preferredProvider?: 'minimax' | 'grok' | 'gemini';
  version: string;
  createdAt: number;
}

export interface AgentInput {
  task: string;
  context?: Record<string, any>;
  previousOutputs?: AgentOutput[];
}

export interface AgentOutput {
  agentId: string;
  agentName: string;
  content: string;
  metadata?: Record<string, any>;
  success: boolean;
  error?: string;
  timestamp: number;
}

export interface AgentChain {
  id: string;
  name: string;
  description: string;
  agents: {
    agentId: string;
    inputMapping?: Record<string, string>; // Maps previous agent outputs to this agent's input
    config?: Record<string, any>;
  }[];
  createdAt: number;
}
