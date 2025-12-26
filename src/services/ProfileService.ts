import { agentRegistry } from './AgentRegistry';

export interface UserProfile {
  version: number;
  timestamp: number;
  secrets: {
    openai_api_key?: string | null;
    anthropic_api_key?: string | null;
    gemini_api_key?: string | null;
    grok_api_key?: string | null;
    minimax_api_key?: string | null;
    tavily_api_key?: string | null;
    cohere_api_key?: string | null;
    qdrant_api_key?: string | null;
    qdrant_host?: string | null;
    qdrant_collection?: string | null;
    [key: string]: string | null | undefined;
  };
  agents: any[]; // Using any[] to match AgentRegistry output structure
}

export const profileService = {
  /**
   * Exports the current user profile (keys + agents) to a JSON string.
   */
  async exportProfile(): Promise<string> {
    const secrets = {
      openai_api_key: localStorage.getItem('openai_api_key'),
      anthropic_api_key: localStorage.getItem('anthropic_api_key'),
      gemini_api_key: localStorage.getItem('gemini_api_key'),
      grok_api_key: localStorage.getItem('grok_api_key'),
      minimax_api_key: localStorage.getItem('minimax_api_key'),
      tavily_api_key: localStorage.getItem('tavily_api_key'),
      cohere_api_key: localStorage.getItem('cohere_api_key'),
      qdrant_api_key: localStorage.getItem('qdrant_api_key'),
      qdrant_host: localStorage.getItem('qdrant_host'),
      qdrant_collection: localStorage.getItem('qdrant_collection'),
    };

    // Ensure registry is loaded
    await agentRegistry.initialize();
    const agents = agentRegistry.getAllAgents();

    const profile: UserProfile = {
      version: 1,
      timestamp: Date.now(),
      secrets,
      agents,
    };

    return JSON.stringify(profile, null, 2);
  },

  /**
   * Imports a profile JSON string, updating localStorage and the Agent Registry.
   * @param jsonString The JSON content of the profile file.
   * @returns True if successful.
   */
  async importProfile(jsonString: string): Promise<boolean> {
    try {
      const profile: UserProfile = JSON.parse(jsonString);

      if (!profile || !profile.secrets || !Array.isArray(profile.agents)) {
        throw new Error('Invalid profile format');
      }

      // 1. Restore Secrets
      Object.entries(profile.secrets).forEach(([key, value]) => {
        if (value) {
          localStorage.setItem(key, value);
        }
      });

      // 2. Restore Agents
      // We loop through and register them. usage of registerAgent handles upsert.
      for (const agent of profile.agents) {
        await agentRegistry.registerAgent(agent);
      }

      return true;
    } catch (error) {
      console.error('Failed to import profile:', error);
      throw error;
    }
  }
};
