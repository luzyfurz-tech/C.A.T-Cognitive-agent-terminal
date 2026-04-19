import fs from 'fs/promises';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import path from 'path';

const STATE_PATH = path.join(process.cwd(), 'web_design_workspace', 'mission_state.json');

export interface MissionState {
  active_mission: string | null;
  global_vars: Record<string, any>;
  agent_statuses: Record<string, 'idle' | 'thinking' | 'working' | 'error'>;
  last_updated: string;
}

const DEFAULT_STATE: MissionState = {
  active_mission: null,
  global_vars: {},
  agent_statuses: {
    chat: 'idle',
    webdesign: 'idle',
    security: 'idle',
    ollamaWeb: 'idle'
  },
  last_updated: new Date().toISOString()
};

// Ensure file exists
if (!existsSync(STATE_PATH)) {
  writeFileSync(STATE_PATH, JSON.stringify(DEFAULT_STATE, null, 2));
}

export const missionService = {
  getState: async (): Promise<MissionState> => {
    const data = await fs.readFile(STATE_PATH, 'utf-8');
    return JSON.parse(data);
  },

  updateState: async (update: Partial<MissionState>): Promise<MissionState> => {
    const current = await missionService.getState();
    const updated = {
      ...current,
      ...update,
      last_updated: new Date().toISOString()
    };
    await fs.writeFile(STATE_PATH, JSON.stringify(updated, null, 2));
    return updated;
  },

  setAgentStatus: async (agent: string, status: MissionState['agent_statuses'][string]) => {
    const current = await missionService.getState();
    current.agent_statuses[agent] = status;
    current.last_updated = new Date().toISOString();
    await fs.writeFile(STATE_PATH, JSON.stringify(current, null, 2));
    return current;
  }
};
