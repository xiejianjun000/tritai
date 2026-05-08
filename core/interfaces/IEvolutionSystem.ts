export const EvolutionType = {
  Genetic: 'genetic',
  Gradient: 'gradient',
  Reinforcement: 'reinforcement',
  SELF_AWARENESS: 'self_awareness',
  SKILL_OPTIMIZATION: 'skill_optimization',
  MODEL_IMPROVEMENT: 'model_improvement',
  PERSONALITY_EVOLUTION: 'personality_evolution',
  MEMORY_OPTIMIZATION: 'memory_optimization'
} as const;
export type EvolutionType = (typeof EvolutionType)[keyof typeof EvolutionType];

export const EvolutionState = {
  Idle: 'idle',
  PENDING: 'pending',
  Evaluating: 'evaluating',
  Evolving: 'evolving',
  Testing: 'testing',
  RUNNING: 'running',
  Applied: 'applied',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  RolledBack: 'rolled_back'
} as const;
export type EvolutionState = (typeof EvolutionState)[keyof typeof EvolutionState];

export const EvolutionTrigger = {
  Schedule: 'schedule',
  SCHEDULED: 'scheduled',
  Performance: 'performance',
  Manual: 'manual'
} as const;
export type EvolutionTrigger = (typeof EvolutionTrigger)[keyof typeof EvolutionTrigger];

export const EvolutionSystemEvent = {
  TASK_CREATED: 'evolution:task_created',
  TASK_STARTED: 'evolution:task_started',
  TASK_COMPLETED: 'evolution:task_completed',
  TASK_FAILED: 'evolution:task_failed',
  TASK_CANCELLED: 'evolution:task_cancelled',
  EVALUATION_STARTED: 'evolution:evaluation_started',
  EVALUATION_COMPLETED: 'evolution:evaluation_completed',
  EVOLUTION_STARTED: 'evolution:started',
  EVOLUTION_COMPLETED: 'evolution:completed',
  EVOLUTION_FAILED: 'evolution:failed',
  EVOLUTION_APPLIED: 'evolution:applied',
  EVOLUTION_ROLLED_BACK: 'evolution:rolled_back',
  ROLLBACK_TRIGGERED: 'evolution:rollback_triggered'
} as const;
export type EvolutionSystemEvent = (typeof EvolutionSystemEvent)[keyof typeof EvolutionSystemEvent];

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
  description?: string;
  goal?: string;
  userId?: string;
  tenantId?: string;
  createdAt: number;
  completedAt?: number;
  startedAt?: number;
  progress?: number;
  result?: EvolutionEvaluation;
  error?: string;
  priority?: number;
  confidence?: number;
  inputData?: any;
  parameters?: Record<string, any>;
}

export interface EvolutionSystemConfig {
  enableAutoEvolve?: boolean;
  autoEvolutionInterval?: number;
  evolutionInterval?: number;
  minScore?: number;
  maxAttempts?: number;
  sandboxEnabled?: boolean;
  sandboxConfig?: Record<string, any>;
  rollbackOnFailure?: boolean;
  thresholds?: Record<string, any>;
  rollbackConfig?: Record<string, any>;
  auditConfig?: Record<string, any>;
  strategies?: Record<string, any>;
  [key: string]: any;
}

export interface EvolutionEvaluation {
  score: number;
  recommendations: string[];
  improvements: string[];
  risks: string[];
  changes?: string[];
  opportunities?: EvolutionOpportunity[];
  rollbackData?: unknown;
}

/**
 * 评估结果（扩展 EvolutionEvaluation，用于 evolution strategies）
 */
export interface EvaluationResult extends EvolutionEvaluation {
  opportunities: EvolutionOpportunity[];
}

export interface EvolutionStrategy {
  name: string;
  evaluate(): Promise<EvaluationResult>;
  apply(result: EvaluationResult): Promise<void>;
  rollback?(): Promise<void>;
}

export interface IEvolutionSystem {
  name: string;
  initialize(config: Record<string, any>): Promise<void>;
  evaluate(): Promise<EvolutionEvaluation>;
  evolve(type?: EvolutionType): Promise<EvolutionEvaluation | void>;
  getStrategies(): string[];
  getTasks(filter?: any): EvolutionTask[] | Promise<EvolutionTask[]>;
  getState(): EvolutionState;
  on(event: string, handler: (data: unknown) => void): void;
}
