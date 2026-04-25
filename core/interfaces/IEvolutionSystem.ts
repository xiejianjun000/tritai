export const EvolutionType = {
  Genetic: 'genetic',
  Gradient: 'gradient',
  Reinforcement: 'reinforcement'
} as const;
export type EvolutionType = (typeof EvolutionType)[keyof typeof EvolutionType];

export const EvolutionState = {
  Idle: 'idle',
  Evaluating: 'evaluating',
  Evolving: 'evolving',
  Testing: 'testing',
  Applied: 'applied',
  RolledBack: 'rolled_back'
} as const;
export type EvolutionState = (typeof EvolutionState)[keyof typeof EvolutionState];

export const EvolutionTrigger = {
  Schedule: 'schedule',
  Performance: 'performance',
  Manual: 'manual'
} as const;
export type EvolutionTrigger = (typeof EvolutionTrigger)[keyof typeof EvolutionTrigger];

export interface EvolutionOpportunity {
  type: string;
  description: string;
  priority: number;
  expectedGain: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface EvolutionTask {
  id: string;
  type: EvolutionType;
  state: EvolutionState;
  description: string;
  userId?: string;
  tenantId?: string;
  createdAt: number;
  completedAt?: number;
  startedAt?: number;
  progress?: number;
  result?: EvolutionEvaluation;
}

export interface EvolutionSystemConfig {
  enableAutoEvolve?: boolean;
  autoEvolutionInterval?: number;
  evolutionInterval?: number;
  minScore?: number;
  maxAttempts?: number;
  sandboxEnabled?: boolean;
  sandboxConfig?: Record<string, unknown>;
  rollbackOnFailure?: boolean;
}

export interface EvolutionEvaluation {
  score: number;
  recommendations: string[];
  improvements: string[];
  risks: string[];
}

export interface EvolutionStrategy {
  name: string;
  evaluate(): Promise<EvolutionEvaluation>;
  apply(result: EvolutionEvaluation): Promise<void>;
  rollback?(): Promise<void>;
}

export interface EvolutionSystemEvent {
  type: string;
  taskId?: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface IEvolutionSystem {
  name: string;
  initialize(config: EvolutionSystemConfig): Promise<void>;
  evaluate(): Promise<EvolutionEvaluation>;
  evolve(type?: EvolutionType): Promise<void>;
  getStrategies(): string[];
  getTasks(): EvolutionTask[];
  getState(): EvolutionState;
  on(event: string, handler: (data: unknown) => void): void;
}
