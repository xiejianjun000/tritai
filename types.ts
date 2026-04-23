/**
 * Context Engine Type Definitions
 */

// Session-related types
export interface ConversationRequest {
  userId: string;
  sessionId: string;
  query: string;
  tokenBudget?: number;
  systemPrompt?: string;
}

// Memory types
export interface MemoryFragment {
  id: string;
  content: string;
  score: number;
  timestamp: number;
  sessionId: string;
}

// Skill types
export interface SkillInfo {
  id: string;
  name: string;
  description: string;
  relevance: number;
}

// Personality types
export interface PersonalityProfile {
  userId: string;
  preferences: Record<string, any>;
  traits: Record<string, number>;
}

// Knowledge types
export interface KnowledgeEntry {
  id: string;
  content: string;
  source: string;
  relevance: number;
}

// System context types
export interface SystemContext {
  version: string;
  environment: string;
  capabilities: string[];
}

// History types
export interface MessageHistory {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

// Raw context types
export interface RawContext {
  memory: MemoryFragment[];
  skills: SkillInfo[];
  personality: PersonalityProfile;
  knowledge: KnowledgeEntry[];
  system: SystemContext | null | undefined;
  history: MessageHistory[];
}

// Assembled context types
export interface AssembledContext {
  prompt: string;
  context: {
    memory: MemoryFragment[];
    skills: SkillInfo[];
    personality: Partial<PersonalityProfile>;
  };
  tokenUsage: number;
}

// Optimized context types
export interface OptimizedContext {
  truncatedMemory: MemoryFragment[];
  truncatedSkills: SkillInfo[];
  truncatedPersonality: Partial<PersonalityProfile>;
  totalTokens: number;
}

// Injection strategy types
export type InjectionStrategy = 'prefix' | 'suffix' | 'inline' | 'system-only';

// Context scanner config types
export interface ContextScannerConfig {
  memoryLimit?: number;
  skillLimit?: number;
  knowledgeLimit?: number;
  historyLimit?: number;
}