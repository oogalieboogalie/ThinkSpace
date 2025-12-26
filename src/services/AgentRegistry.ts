import { Agent, AgentChain } from '../types/agent';
import { exists, createDir, readTextFile, writeTextFile, BaseDirectory } from '@tauri-apps/api/fs';
import { PRESET_AGENTS } from '../lib/presetAgents';

const STORAGE_FILE = 'agents.json';
const STORAGE_DIR = 'startup-strategy'; // Matches tauri.conf.json scope

interface RegistryData {
  agents: Agent[];
  chains: AgentChain[];
}

export class AgentRegistry {
  private agents: Map<string, Agent> = new Map();
  private chains: Map<string, AgentChain> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // 1. Load defaults first
      this.initializeDefaultAgents();

      // 2. Try to load from disk
      await this.loadFromDisk();

      // 3. Auto-import bundled presets if available
      try {
        const response = await fetch('/agents.json');
        if (response.ok) {
          const data = await response.json();
          let imported = 0;
          for (const agent of data.agents || []) {
            if (!this.agents.has(agent.id)) {
              this.agents.set(agent.id, { ...agent, createdAt: agent.createdAt || Date.now() });
              imported++;
            }
          }
          if (imported > 0) {
            await this.save();
            console.log(`✅ Auto-imported ${imported} preset agents`);
          }
        }
      } catch (e) {
        // Silent fail for presets - not critical
      }

      this.initialized = true;
      console.log('✅ AgentRegistry initialized with', this.agents.size, 'agents');
    } catch (error) {
      console.error('Failed to initialize AgentRegistry:', error);
      // Fallback to ensuring defaults are saved if we just couldn't read the file
      this.save();
    }
  }

  private async ensureStorageReady(): Promise<void> {
    try {
      // $APPDATA/startup-strategy/
      // Using BaseDirectory.AppData which maps to $APPDATA
      // We need to create the subdir 'startup-strategy' if it doesn't exist.
      const dirExists = await exists(STORAGE_DIR, { dir: BaseDirectory.AppData });
      if (!dirExists) {
        await createDir(STORAGE_DIR, { dir: BaseDirectory.AppData, recursive: true });
      }
    } catch (e) {
      console.error('Error ensuring storage dir:', e);
    }
  }

  private async loadFromDisk() {
    try {
      const existsResult = await exists(`${STORAGE_DIR}/${STORAGE_FILE}`, { dir: BaseDirectory.AppData });

      if (existsResult) {
        const content = await readTextFile(`${STORAGE_DIR}/${STORAGE_FILE}`, { dir: BaseDirectory.AppData });
        const data: RegistryData = JSON.parse(content);

        // Merge loaded agents (overwriting defaults if same ID)
        data.agents.forEach(agent => this.agents.set(agent.id, agent));
        data.chains.forEach(chain => this.chains.set(chain.id, chain));

        console.log(`📂 Loaded ${data.agents.length} agents and ${data.chains.length} chains from disk`);
      } else {
        // First run, save defaults
        await this.save();
      }
    } catch (error) {
      console.warn('Could not load agents from disk, using defaults only:', error);
    }
  }

  private async save() {
    try {
      await this.ensureStorageReady();

      const data: RegistryData = {
        agents: Array.from(this.agents.values()),
        chains: Array.from(this.chains.values())
      };

      await writeTextFile(`${STORAGE_DIR}/${STORAGE_FILE}`, JSON.stringify(data, null, 2), {
        dir: BaseDirectory.AppData
      });
      console.log('💾 AgentRegistry saved to disk');
    } catch (error) {
      console.error('Failed to save AgentRegistry:', error);
    }
  }

  private initializeDefaultAgents() {
    PRESET_AGENTS.forEach(agent => {
      // Only set if not already present
      if (!this.agents.has(agent.id)) {
        this.agents.set(agent.id, agent);
      }
    });
  }

  async resetToDefaults(): Promise<void> {
    this.agents.clear();
    this.initializeDefaultAgents();
    await this.save();
    console.log('♻️ Reset agents to defaults');
  }

  async registerAgent(agent: Agent): Promise<void> {
    this.agents.set(agent.id, agent);
    await this.save();
  }

  async removeAgent(id: string): Promise<boolean> {
    const output = this.agents.delete(id);
    if (output) await this.save();
    return output;
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAgentsByRole(role: Agent['role']): Agent[] {
    return Array.from(this.agents.values()).filter(a => a.role === role);
  }

  async registerChain(chain: AgentChain): Promise<void> {
    this.chains.set(chain.id, chain);
    await this.save();
  }

  async removeChain(id: string): Promise<boolean> {
    const output = this.chains.delete(id);
    if (output) await this.save();
    return output;
  }

  getChain(id: string): AgentChain | undefined {
    return this.chains.get(id);
  }

  getAllChains(): AgentChain[] {
    return Array.from(this.chains.values());
  }

  // Helper to create custom agent chains
  createCustomChain(
    name: string,
    agentIds: string[],
    config?: {
      description?: string;
      id?: string;
    }
  ): AgentChain {
    const chain: AgentChain = {
      id: config?.id || `chain-${Date.now()}`,
      name,
      description: config?.description || `Custom chain with ${agentIds.length} agents`,
      agents: agentIds.map((agentId, index) => ({
        agentId,
        inputMapping: index > 0 ? {} : undefined
      })),
      createdAt: Date.now()
    };

    this.registerChain(chain);
    return chain;
  }

  // Import preset agents from bundled agents.json
  async importPresets(): Promise<{ imported: number; skipped: number }> {
    try {
      // Fetch from public folder or bundled resource
      const response = await fetch('/agents.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch presets: ${response.status}`);
      }

      const data: RegistryData = await response.json();
      let imported = 0;
      let skipped = 0;

      for (const agent of data.agents) {
        if (!this.agents.has(agent.id)) {
          this.agents.set(agent.id, {
            ...agent,
            createdAt: agent.createdAt || Date.now()
          });
          imported++;
        } else {
          skipped++;
        }
      }

      if (imported > 0) {
        await this.save();
      }

      console.log(`✅ Imported ${imported} agents, skipped ${skipped} duplicates`);
      return { imported, skipped };
    } catch (error) {
      console.error('Failed to import presets:', error);
      throw error;
    }
  }
}

export const agentRegistry = new AgentRegistry();

