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
}

export interface RetrieveOptions {
  limit?: number;
  offset?: number;
  tags?: string[];
  minImportance?: number;
  timeRange?: { start: number; end: number };
  query?: string;
  sortBy?: 'timestamp' | 'importance' | 'relevance';
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
}

export interface IVectorStoreAdapter {
  name: string;
  initialize(): Promise<void>;
  addVector(memoryId: string, vector: number[]): Promise<void>;
  search(queryVector: number[], limit?: number): Promise<{ memoryId: string; score: number }[]>;
  remove(memoryId: string): Promise<void>;
  clear(): Promise<void>;
}
