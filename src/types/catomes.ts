export type CatomeType = 'compute' | 'io' | 'transform' | 'validate' | 'research' | 'system';
export type CatomePriority = 'low' | 'normal' | 'high' | 'critical';
export type CatomeStatus = 'pending' | 'running' | 'success' | 'failed';
export type CatomeAgent = 'hermes' | 'security' | 'supervisor' | 'webdesign' | 'docker' | 'ollamaweb';
export type CatomeRiskLevel = 'low' | 'medium' | 'high';
export type CatomeCommanderOrigin = 'supervisor' | 'hermes' | 'security' | 'user' | 'system';

export interface Catome {
  id: string;
  mission_id: string;
  type: CatomeType;
  priority: CatomePriority;
  description: string;
  agent: CatomeAgent | string;
  tool: string;
  input: any;
  output_expected: string;
  dependencies: string[];
  conflicts: string[];
  status: CatomeStatus;
  result: any;
  created_at: string;
  updated_at: string;
  logs: any[];
  heartbeat: {
    mode: 'none' | 'interval' | 'continuous' | 'event';
    value: string;
  };
  sleeper_activation: {
    trigger_type: 'none' | 'time' | 'event' | 'data' | 'threshold';
    trigger_value: string;
    cooldown: number;
    max_activations: number;
  };
  intention: {
    goal: string;
    context: string;
    risk_level: CatomeRiskLevel;
    commander_origin: CatomeCommanderOrigin;
  };
}

export interface CatomeStore {
  active_mission: string | null;
  catomes: Catome[];
}
