/**
 * HotMemoryAdapter.ts
 * 热记忆适配器（会话级内存）
 *
 * @author 昆仑框架团队
 * @version 1.0.0
 */

import { IStorageAdapter, Memory, RetrieveOptions } from './core/interfaces/IMemorySystem';

/**
 * LRU缓存实现
 */
class LRUCache<T> {
  private capacity: number;
  private cache: Map<string, T> = new Map();

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // 更新缓存位置
    this.cache.delete(key);
    this.cache.set(key, item);

    return item;
  }

  set(key: string, value: T): void {
    // 如果缓存已满，删除最久未使用的
    if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    // 添加新项到缓存末尾
    this.cache.set(key, value);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  keys(): IterableIterator<string> {
    return this.cache.keys();
  }

  values(): IterableIterator<T> {
    return this.cache.values();
  }

  entries(): IterableIterator<[string, T]> {
    return this.cache.entries();
  }
}

/**
 * 热记忆适配器配置
 */
export interface HotMemoryConfig {
  /** 最大缓存大小 */
  maxSize: number;
  /** 过期时间（毫秒） */
  ttl: number;
}

/**
 * 热记忆适配器实现（内存存储，LRU缓存）
 */
export class HotMemoryAdapter implements IStorageAdapter {
  /** 缓存 */
  private cache: LRUCache<Memory>;

  /** 配置 */
  private config: HotMemoryConfig;

  /** 过期检查定时器 */
  private cleanupTimer: NodeJS.Timeout | null = null;

  /** 适配器名称 */
  public readonly name: string = 'HotMemoryAdapter';

  /**
   * 构造函数
   */
  constructor() {
    this.config = { maxSize: 1000, ttl: 3600000 };
    this.cache = new LRUCache<Memory>(this.config.maxSize);
  }

  /**
   * 初始化适配器
   */
  async initialize(): Promise<void> {
    this.cache = new LRUCache<Memory>(this.config.maxSize);

    // 设置定期清理过期记忆
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cleanupTimer = setInterval(() => this.cleanupExpired(), this.config.ttl / 2);

    console.log('[HotMemoryAdapter] Initialized with maxSize:', this.config.maxSize, 'ttl:', this.config.ttl);
  }

  /**
   * 使用自定义配置初始化适配器
   * @param config 适配器配置
   */
  async initializeWithConfig(config: HotMemoryConfig): Promise<void> {
    this.config = config;
    await this.initialize();
  }

  /**
   * 清理过期记忆
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, memory] of this.cache.entries()) {
      const createdAt = memory.createdAt instanceof Date ? memory.createdAt.getTime() : (memory.timestamp || now);
      const age = now - createdAt;
      if (age > this.config.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }

    if (expiredKeys.length > 0) {
      console.log(`[HotMemoryAdapter] Cleaned up ${expiredKeys.length} expired memories`);
    }
  }

  /**
   * 存储记忆（IStorageAdapter 接口实现）
   */
  async save(memory: Memory): Promise<void> {
    await this.store(memory);
  }

  /**
   * 检索记忆（IStorageAdapter 接口实现 - 按ID检索）
   */
  async retrieve(id: string): Promise<Memory | null> {
    return this.getById(id);
  }

  /**
   * 列出记忆（IStorageAdapter 接口实现）
   */
  async list(options?: RetrieveOptions): Promise<Memory[]> {
    return this.search(options?.query || '', options);
  }

  /**
   * 删除记忆（IStorageAdapter 接口实现）
   */
  async delete(id: string): Promise<boolean> {
    return this.cache.delete(id);
  }

  /**
   * 清空所有记忆（IStorageAdapter 接口实现）
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * 获取统计信息（IStorageAdapter 接口实现）
   */
  async getStats(): Promise<{ count: number; size: number }> {
    let totalSize = 0;

    for (const memory of this.cache.values()) {
      totalSize += (memory.text || memory.content || '').length * 2; // 估算大小
    }

    return {
      count: this.cache.size(),
      size: totalSize
    };
  }

  /**
   * 存储记忆
   * @param memory 记忆对象
   */
  async store(memory: Memory): Promise<string> {
    // 确保ID存在
    if (!memory.id) {
      throw new Error('Memory ID is required');
    }

    // 存储到缓存
    this.cache.set(memory.id, memory);

    return memory.id;
  }

  /**
   * 批量存储记忆
   * @param memories 记忆对象列表
   */
  async batchStore(memories: Memory[]): Promise<string[]> {
    const ids: string[] = [];

    for (const memory of memories) {
      if (!memory.id) {
        throw new Error('Memory ID is required');
      }
      this.cache.set(memory.id, memory);
      ids.push(memory.id);
    }

    return ids;
  }

  /**
   * 搜索记忆
   * @param query 检索查询
   * @param options 检索选项
   */
  async search(query: string, options?: any): Promise<Memory[]> {
    // 简单实现：返回所有包含查询文本的记忆
    const results: Memory[] = [];

    for (const memory of this.cache.values()) {
      const text = memory.text || memory.content || '';
      if (text.includes(query)) {
        results.push(memory);
      }
    }

    // 按优先级排序
    results.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    // 应用结果数量限制
    if (options?.limit && options.limit > 0) {
      return results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * 根据ID获取记忆
   * @param id 记忆ID
   */
  async getById(id: string): Promise<Memory | null> {
    const memory = this.cache.get(id);
    return memory || null;
  }

  /**
   * 更新记忆
   * @param id 记忆ID
   * @param updates 记忆更新内容
   */
  async update(id: string, updates: Partial<Memory>): Promise<Memory | null> {
    const memory = this.cache.get(id);
    if (!memory) {
      return null;
    }

    // 合并更新
    const updatedMemory = {
      ...memory,
      ...updates,
      updatedAt: new Date()
    };

    // 重新存储
    this.cache.set(id, updatedMemory);

    return updatedMemory;
  }

  /**
   * 批量删除记忆
   * @param ids 记忆ID列表
   */
  async batchDelete(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.cache.delete(id);
    }
  }

  /**
   * 清理过期记忆
   * @param maxAge 最大存在时间（毫秒）
   */
  async cleanup(maxAge?: number): Promise<number> {
    const now = Date.now();
    const ageThreshold = maxAge || this.config.ttl;
    const expiredKeys: string[] = [];

    for (const [key, memory] of this.cache.entries()) {
      const createdAt = memory.createdAt instanceof Date ? memory.createdAt.getTime() : (memory.timestamp || now);
      const age = now - createdAt;
      if (age > ageThreshold) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }

    return expiredKeys.length;
  }

  /**
   * 关闭适配器
   */
  async close(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cache.clear();
    console.log('[HotMemoryAdapter] Closed');
  }
}

export default HotMemoryAdapter;
