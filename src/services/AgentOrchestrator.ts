import { Agent, AgentChain, AgentInput, AgentOutput } from '../types/agent';
import { agentRegistry } from './AgentRegistry';

async function callMiniMaxAPI(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> {
  // This would integrate with your existing MiniMax API setup
  // You'll need to adapt this to your current API calling pattern

  void systemPrompt; // Using in real implementation
  const prompt = `System: ${systemPrompt}\n\nUser: ${userPrompt}`;
  void prompt; // Using in real implementation

  // Example integration - replace with your actual MiniMax call
  const response = await fetch('/api/minimax', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      apiKey
    })
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content;
}

export class AgentOrchestrator {
  async executeChain(
    chain: AgentChain,
    input: AgentInput,
    apiKey: string
  ): Promise<AgentOutput[]> {
    const outputs: AgentOutput[] = [];
    let accumulatedContext: Record<string, any> = {};

    for (let i = 0; i < chain.agents.length; i++) {
      const chainAgent = chain.agents[i];
      const agent = agentRegistry.getAgent(chainAgent.agentId);

      if (!agent) {
        throw new Error(`Agent not found: ${chainAgent.agentId}`);
      }

      // Build input for this agent
      const agentInput: AgentInput = {
        task: input.task,
        context: { ...input.context, ...accumulatedContext },
        previousOutputs: outputs
      };

      // Apply input mapping if specified
      if (chainAgent.inputMapping) {
        const mappedContext: Record<string, any> = {};
        for (const [targetKey, sourceKey] of Object.entries(chainAgent.inputMapping)) {
          if (sourceKey.includes('.')) {
            // Handle nested keys like "agentName.content"
            const [outputId, field] = sourceKey.split('.');
            const output = outputs.find(o => o.agentId === outputId);
            if (output) {
              mappedContext[targetKey] = (output as any)[field];
            }
          } else {
            const output = outputs.find(o => o.agentId === sourceKey);
            if (output) {
              mappedContext[targetKey] = output.content;
            }
          }
        }
        agentInput.context = { ...agentInput.context, ...mappedContext };
      }

      // Execute the agent
      const output = await this.executeAgent(agent, agentInput, apiKey);
      outputs.push(output);

      if (output.success) {
        // Add output to accumulated context for next agent
        accumulatedContext[`${agent.id}`] = output.content;
      } else {
        console.error(`Agent ${agent.name} failed:`, output.error);
        // Continue anyway or throw - your choice
      }
    }

    return outputs;
  }

  async executeAgent(
    agent: Agent,
    input: AgentInput,
    apiKey: string
  ): Promise<AgentOutput> {
    try {
      const userPrompt = this.buildUserPrompt(input);

      const content = await callMiniMaxAPI(
        agent.systemPrompt,
        userPrompt,
        apiKey
      );

      return {
        agentId: agent.id,
        agentName: agent.name,
        content,
        metadata: {
          role: agent.role,
          version: agent.version
        },
        success: true,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        agentId: agent.id,
        agentName: agent.name,
        content: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  }

  private buildUserPrompt(input: AgentInput): string {
    let prompt = `Task: ${input.task}\n\n`;

    if (input.context && Object.keys(input.context).length > 0) {
      prompt += 'Context:\n';
      for (const [key, value] of Object.entries(input.context)) {
        prompt += `- ${key}: ${JSON.stringify(value, null, 2)}\n`;
      }
      prompt += '\n';
    }

    if (input.previousOutputs && input.previousOutputs.length > 0) {
      prompt += 'Previous Agent Outputs:\n';
      for (const output of input.previousOutputs) {
        prompt += `\n=== ${output.agentName} ===\n${output.content}\n`;
      }
    }

    return prompt;
  }

  // Pre-defined chains
  initializeCommonChains() {
    // === EDUCATIONAL CHAINS ===
    // Full Learning Experience: Curriculum → Visual → Practice → Empathy
    agentRegistry.registerChain({
      id: 'learning-experience-v1',
      name: 'Complete Learning Experience',
      description: 'Full learning pipeline: Curriculum → Visual → Practice → Empathy',
      agents: [
        { agentId: 'curriculum-architect-v1' },
        {
          agentId: 'visual-storyteller-v1',
          inputMapping: {
            'curriculum': 'curriculum-architect-v1'
          }
        },
        {
          agentId: 'practice-designer-v1',
          inputMapping: {
            'visual': 'visual-storyteller-v1'
          }
        },
        {
          agentId: 'empathy-guide-v1',
          inputMapping: {
            'practice': 'practice-designer-v1'
          }
        }
      ],
      createdAt: Date.now()
    });

    // Interactive Learning: Curriculum → Socratic → Empathy
    agentRegistry.registerChain({
      id: 'interactive-learning-v1',
      name: 'Interactive Socratic Learning',
      description: 'Guided discovery: Curriculum → Socratic → Empathy',
      agents: [
        { agentId: 'curriculum-architect-v1' },
        {
          agentId: 'socratic-questioner-v1',
          inputMapping: {
            'curriculum': 'curriculum-architect-v1'
          }
        },
        {
          agentId: 'empathy-guide-v1',
          inputMapping: {
            'questions': 'socratic-questioner-v1'
          }
        }
      ],
      createdAt: Date.now()
    });

    // Visual Learning: Curriculum → Visual → Empathy
    agentRegistry.registerChain({
      id: 'visual-learning-v1',
      name: 'Visual-First Learning',
      description: 'Learn through visuals: Curriculum → Visual → Empathy',
      agents: [
        { agentId: 'curriculum-architect-v1' },
        {
          agentId: 'visual-storyteller-v1',
          inputMapping: {
            'curriculum': 'curriculum-architect-v1'
          }
        },
        {
          agentId: 'empathy-guide-v1',
          inputMapping: {
            'visual': 'visual-storyteller-v1'
          }
        }
      ],
      createdAt: Date.now()
    });

    // Practice-Focused: Curriculum → Practice → Empathy
    agentRegistry.registerChain({
      id: 'practice-focused-v1',
      name: 'Practice-Driven Learning',
      description: 'Learn by doing: Curriculum → Practice → Empathy',
      agents: [
        { agentId: 'curriculum-architect-v1' },
        {
          agentId: 'practice-designer-v1',
          inputMapping: {
            'curriculum': 'curriculum-architect-v1'
          }
        },
        {
          agentId: 'empathy-guide-v1',
          inputMapping: {
            'practice': 'practice-designer-v1'
          }
        }
      ],
      createdAt: Date.now()
    });

    // === GENERAL CONTENT CHAINS ===
    // Research → Plan → Write → Review
    agentRegistry.registerChain({
      id: 'content-creation-v1',
      name: 'Content Creation Pipeline',
      description: 'Full pipeline: Research → Plan → Write → Review',
      agents: [
        { agentId: 'researcher-v1' },
        {
          agentId: 'planner-v1',
          inputMapping: {
            'research': 'researcher-v1'
          }
        },
        {
          agentId: 'writer-v1',
          inputMapping: {
            'plan': 'planner-v1',
            'research': 'researcher-v1'
          }
        },
        {
          agentId: 'reviewer-v1',
          inputMapping: {
            'content': 'writer-v1'
          }
        }
      ],
      createdAt: Date.now()
    });

    // Research → Review
    agentRegistry.registerChain({
      id: 'research-review-v1',
      name: 'Research with Review',
      description: 'Research with quality review',
      agents: [
        { agentId: 'researcher-v1' },
        {
          agentId: 'reviewer-v1',
          inputMapping: {
            'research': 'researcher-v1'
          }
        }
      ],
      createdAt: Date.now()
    });
  }
}

export const agentOrchestrator = new AgentOrchestrator();
