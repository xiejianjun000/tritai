export interface Memory {
  id: string;
  content: string;
  timestamp: number;
  importance?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  embedding?: number[];
  source?: string;
  references?: string[];
  wfgyVerified?: boolean;
  hallucinationRisk?: number;
  // WarmMemoryAdapter 扩展属性
  priority?: number;
  confidence?: number;
  text?: string;
  expiresAt?: Date;
  userId?: string;
  tenantId?: string;
  type?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RetrieveOptions {
  limit?: number;
  offset?: number;
  tags?: string[];
  minImportance?: number;
  timeRange?: { start: number | Date; end: number | Date };
  query?: string;
  sortBy?: 'timestamp' | 'importance' | 'relevance';
  sortByRelevance?: boolean;
  // WarmMemoryAdapter 扩展属性
  type?: string | string[];
  priorityRange?: { min?: number; max?: number };
  confidenceThreshold?: number;
}

export interface IStorageAdapter {
  name: string;
  initialize(): Promise<void>;
  save(memory: Memory): Promise<void>;
  retrieve(id: string): Promise<Memory | null>;
  list(options?: RetrieveOptions): Promise<Memory[]>;
  delete(id: string): Promise<boolean>;
  clear(): Promise<void>;
  getStats(): Promise<{ count: number; size: number }>;
  close?(): Promise<void>;
  // 扩展方法（MemorySystem 需要）
  store?(memory: Memory): Promise<string>;
  getById?(id: string): Promise<Memory | null>;
  update?(id: string, updates: Partial<Memory>): Promise<Memory | null>;
  cleanup?(maxAge?: number): Promise<number>;
}

export interface IVectorStoreAdapter {
  name: string;
  initialize(): Promise<void>;
  addVector(memoryId: string, vector: number[]): Promise<void>;
  search(queryVector: number[], limit?: number): Promise<{ memoryId: string; score: number }[]>;
  remove(memoryId: string): Promise<void>;
  clear(): Promise<void>;
}

// ===== MemorySystem 相关类型 =====

export const MemoryType = {
  HOT: 'hot',
  WARM: 'warm',
  COLD: 'cold',
  KNOWLEDGE: 'knowledge'
} as const;
export type MemoryType = (typeof MemoryType)[keyof typeof MemoryType];

export interface MemoryMetadata {
  id: string;
  userId: string;
  tenantId: string;
  type: MemoryType;
  createdAt: Date;
  updatedAt: Date;
  priority: number;
  tags: string[];
  confidence: number;
}

export interface MemoryContent {
  text: string;
  embedding?: number[];
  source?: string;
}

export const MemorySystemEvent = {
  MEMORY_STORED: 'memory:stored',
  MEMORY_RETRIEVED: 'memory:retrieved',
  MEMORY_UPDATED: 'memory:updated',
  MEMORY_DELETED: 'memory:deleted',
  MEMORY_CONSOLIDATED: 'memory:consolidated',
  MEMORY_MIGRATED: 'memory:migrated'
} as const;
export type MemorySystemEvent = (typeof MemorySystemEvent)[keyof typeof MemorySystemEvent];

export interface MemorySystemConfig {
  defaultRetrieveOptions?: RetrieveOptions;
  autoMigrationInterval?: number;
  autoCleanupInterval?: number;
  storagePolicy?: {
    cleanupRules: Array<{
      type: MemoryType;
      maxAge: number;
    }>;
  };
}

export interface IMemorySystem {
  initialize(config: MemorySystemConfig): Promise<void>;
  store(memory: Memory): Promise<string>;
  retrieve(query: string, options?: RetrieveOptions): Promise<Memory[]>;
  getById(id: string, options?: { type?: MemoryType }): Promise<Memory | null>;
  update(id: string, updates: Partial<Memory>): Promise<Memory | null>;
  delete(id: string): Promise<void>;
  getStats(options?: RetrieveOptions): Promise<{
    totalCount: number;
    byType: Record<MemoryType, number>;
    byTag: Record<string, number>;
    totalSize: number;
  }>;
  cleanup(type?: MemoryType): Promise<number>;
  destroy(): Promise<void>;
}
