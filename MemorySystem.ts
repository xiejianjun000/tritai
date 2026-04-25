/**
 * MemorySystem.ts
 * 记忆系统核心实现
 * 
 * @author 昆仑框架团队
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  IMemorySystem,
  Memory,
  MemoryType,
  RetrieveOptions,
  MemorySystemConfig,
  MemoryMetadata,
  MemoryContent,
  MemorySystemEvent,
  IStorageAdapter
} from './core/interfaces/IMemorySystem';

import { HotMemoryAdapter } from './HotMemoryAdapter';
import { WarmMemoryAdapter } from './WarmMemoryAdapter';
import { ColdMemoryAdapter } from './ColdMemoryAdapter';
import { KnowledgeBaseAdapter } from './KnowledgeBaseAdapter';

/**
 * 记忆系统实现
 */
export class MemorySystem extends EventEmitter implements IMemorySystem {
  /** 系统配置 */
  private config: MemorySystemConfig;
  
  /** 存储适配器映射 */
  private adapters: Map<MemoryType, IStorageAdapter> = new Map();
  
  /** 自动迁移定时器 */
  private migrationTimer: NodeJS.Timeout | null = null;
  
  /** 自动清理定时器 */
  private cleanupTimer: NodeJS.Timeout | null = null;
  
  /** 初始化状态 */
  private initialized: boolean = false;

  /**
   * 构造函数
   */
  constructor() {
    super();
    this.config = {} as MemorySystemConfig;
  }

  /**
   * 初始化记忆系统
   * @param config 系统配置
   */
  async initialize(config: MemorySystemConfig): Promise<void> {
    if (this.initialized) {
      throw new Error('MemorySystem has already been initialized');
    }

    this.config = config;

    // 初始化存储适配器
    await this.initializeAdapters();

    // 设置自动迁移和清理
    if (config.autoMigrationInterval && config.autoMigrationInterval > 0) {
      this.migrationTimer = setInterval(
        () => this.runAutoMigration(),
        config.autoMigrationInterval
      );
    }

    if (config.autoCleanupInterval && config.autoCleanupInterval > 0) {
      this.cleanupTimer = setInterval(
        () => this.runAutoCleanup(),
        config.autoCleanupInterval
      );
    }

    this.initialized = true;
    console.log('[MemorySystem] Initialized successfully');
  }

  /**
   * 初始化存储适配器
   */
  private async initializeAdapters(): Promise<void> {
    // 初始化Hot Memory适配器
    const hotAdapter = new HotMemoryAdapter();
    await hotAdapter.initialize({
      maxSize: 1000,
      ttl: 3600000 // 1小时
    });
    this.adapters.set(MemoryType.HOT, hotAdapter);

    // 初始化Warm Memory适配器
    const warmAdapter = new WarmMemoryAdapter();
    await warmAdapter.initialize({
      dbPath: './data/memory/warm_memory.db'
    });
    this.adapters.set(MemoryType.WARM, warmAdapter);

    // 初始化Cold Memory适配器
    const coldAdapter = new ColdMemoryAdapter();
    await coldAdapter.initialize({
      storagePath: './data/memory/cold'
    });
    this.adapters.set(MemoryType.COLD, coldAdapter);

    // 初始化知识库适配器
    const knowledgeAdapter = new KnowledgeBaseAdapter();
    await knowledgeAdapter.initialize({
      vectorDbConfig: {
        url: 'http://localhost:6333',
        collectionName: 'knowledge_base'
      }
    });
    this.adapters.set(MemoryType.KNOWLEDGE, knowledgeAdapter);
  }

  /**
   * 获取适配器
   * @param type 记忆类型
   */
  private getAdapter(type: MemoryType): IStorageAdapter {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw new Error(`No storage adapter found for memory type: ${type}`);
    }
    return adapter;
  }

  /**
   * 生成默认元数据
   */
  private generateDefaultMetadata(
    userId: string,
    tenantId: string,
    type: MemoryType
  ): MemoryMetadata {
    return {
      id: `memory_${uuidv4()}`,
      userId,
      tenantId,
      type,
      createdAt: new Date(),
      updatedAt: new Date(),
      priority: 0.5,
      tags: [],
      confidence: 0.8
    };
  }

  /**
   * 存储记忆
   * @param memory 记忆对象
   * @returns 记忆ID
   */
  async store(memory: Memory): Promise<string> {
    this.ensureInitialized();

    // 生成默认元数据
    const metadata = this.generateDefaultMetadata(
      memory.userId,
      memory.tenantId,
      memory.type
    );

    // 合并元数据和内容
    const memoryToStore: Memory = {
      ...metadata,
      ...memory
    };

    // 获取适配器并存储
    const adapter = this.getAdapter(memory.type);
    const id = await adapter.store(memoryToStore);

    // 触发事件
    this.emit(MemorySystemEvent.MEMORY_STORED, { memory: memoryToStore });

    return id;
  }

  /**
   * 批量存储记忆
   * @param memories 记忆对象列表
   * @returns 记忆ID列表
   */
  async batchStore(memories: Memory[]): Promise<string[]> {
    this.ensureInitialized();

    const results: string[] = [];
    const events: any[] = [];

    for (const memory of memories) {
      const id = await this.store(memory);
      results.push(id);
      events.push({ memory });
    }

    // 批量触发事件
    this.emit(MemorySystemEvent.MEMORY_STORED, { memories: events });

    return results;
  }

  /**
   * 检索记忆
   * @param query 检索查询
   * @param options 检索选项
   * @returns 记忆列表
   */
  async retrieve(query: string, options?: RetrieveOptions): Promise<Memory[]> {
    this.ensureInitialized();

    const effectiveOptions = {
      ...this.config.defaultRetrieveOptions,
      ...options
    };

    const memoryTypes = effectiveOptions.type || Object.values(MemoryType);
    const types = Array.isArray(memoryTypes) ? memoryTypes : [memoryTypes];

    const results: Memory[] = [];

    // 从每个类型中检索记忆
    for (const type of types) {
      const adapter = this.getAdapter(type);
      const typeResults = await adapter.retrieve(query, effectiveOptions);
      results.push(...typeResults);
    }

    // 排序和去重
    const uniqueResults = this.deduplicateMemories(results);
    
    // 如果需要按相关性排序
    if (effectiveOptions.sortByRelevance) {
      uniqueResults.sort((a, b) => {
        // 按置信度、优先级和更新时间排序
        if (a.confidence !== b.confidence) {
          return b.confidence - a.confidence;
        }
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    }

    // 应用结果数量限制
    if (effectiveOptions.limit && effectiveOptions.limit > 0) {
      const limitedResults = uniqueResults.slice(0, effectiveOptions.limit);
      this.emit(MemorySystemEvent.MEMORY_RETRIEVED, { query, options, memories: limitedResults });
      return limitedResults;
    }

    this.emit(MemorySystemEvent.MEMORY_RETRIEVED, { query, options, memories: uniqueResults });
    return uniqueResults;
  }

  /**
   * 根据ID获取记忆
   * @param id 记忆ID
   * @param options 检索选项
   * @returns 记忆对象
   */
  async getById(id: string, options?: { type?: MemoryType }): Promise<Memory | null> {
    this.ensureInitialized();

    // 如果指定了类型，直接使用对应适配器
    if (options?.type) {
      const adapter = this.getAdapter(options.type);
      return adapter.getById(id);
    }

    // 否则遍历所有适配器查找
    for (const adapter of this.adapters.values()) {
      const memory = await adapter.getById(id);
      if (memory) {
        return memory;
      }
    }

    return null;
  }

  /**
   * 更新记忆
   * @param id 记忆ID
   * @param updates 记忆更新内容
   * @returns 更新后的记忆
   */
  async update(id: string, updates: Partial<Memory>): Promise<Memory | null> {
    this.ensureInitialized();

    // 找到记忆所在的适配器
    let foundAdapter: IStorageAdapter | null = null;
    let foundMemory: Memory | null = null;

    for (const adapter of this.adapters.values()) {
      const memory = await adapter.getById(id);
      if (memory) {
        foundAdapter = adapter;
        foundMemory = memory;
        break;
      }
    }

    if (!foundAdapter || !foundMemory) {
      return null;
    }

    // 合并更新内容
    const updatedMemory: Memory = {
      ...foundMemory,
      ...updates,
      updatedAt: new Date()
    };

    // 更新记忆
    const result = await foundAdapter.update(id, updatedMemory);

    if (result) {
      this.emit(MemorySystemEvent.MEMORY_UPDATED, { memory: result });
    }

    return result;
  }

  /**
   * 删除记忆
   * @param id 记忆ID
   */
  async delete(id: string): Promise<void> {
    this.ensureInitialized();

    // 遍历所有适配器删除
    for (const adapter of this.adapters.values()) {
      try {
        await adapter.delete(id);
      } catch (error) {
        // 忽略错误，继续尝试其他适配器
      }
    }

    this.emit(MemorySystemEvent.MEMORY_DELETED, { id });
  }

  /**
   * 批量删除记忆
   * @param ids 记忆ID列表
   */
  async batchDelete(ids: string[]): Promise<void> {
    this.ensureInitialized();

    for (const id of ids) {
      await this.delete(id);
    }

    this.emit(MemorySystemEvent.MEMORY_DELETED, { ids });
  }

  /**
   * 合并记忆
   * @param memoryIds 记忆ID列表
   * @returns 合并后的记忆
   */
  async consolidate(memoryIds: string[]): Promise<Memory> {
    this.ensureInitialized();

    // 获取所有要合并的记忆
    const memories: Memory[] = [];
    for (const id of memoryIds) {
      const memory = await this.getById(id);
      if (memory) {
        memories.push(memory);
      }
    }

    if (memories.length === 0) {
      throw new Error('No memories found to consolidate');
    }

    // 合并文本内容
    const mergedText = memories.map(m => m.text).join('\n\n');
    
    // 合并标签
    const mergedTags = Array.from(new Set(memories.flatMap(m => m.tags)));
    
    // 计算平均置信度和优先级
    const avgConfidence = memories.reduce((sum, m) => sum + m.confidence, 0) / memories.length;
    const avgPriority = memories.reduce((sum, m) => sum + m.priority, 0) / memories.length;

    // 创建合并后的记忆
    const mergedMemory: Memory = {
      ...this.generateDefaultMetadata(
        memories[0].userId,
        memories[0].tenantId,
        MemoryType.COLD // 合并后存储到冷记忆
      ),
      text: mergedText,
      tags: mergedTags,
      confidence: avgConfidence,
      priority: avgPriority,
      source: `consolidated_from_${memoryIds.join('_')}`
    };

    // 存储合并后的记忆
    await this.store(mergedMemory);

    // 删除原始记忆
    await this.batchDelete(memoryIds);

    this.emit(MemorySystemEvent.MEMORY_CONSOLIDATED, {
      sourceMemories: memories,
      mergedMemory
    });

    return mergedMemory;
  }

  /**
   * 自动合并相似记忆
   * @param options 检索选项
   */
  async autoConsolidate(options?: RetrieveOptions): Promise<void> {
    this.ensureInitialized();

    // 检索需要合并的记忆
    const memories = await this.retrieve('', {
      ...options,
      type: MemoryType.WARM,
      confidenceThreshold: 0.7,
      limit: 100
    });

    // 简单的相似性合并：按标签分组
    const tagGroups: Record<string, Memory[]> = {};

    for (const memory of memories) {
      for (const tag of memory.tags) {
        if (!tagGroups[tag]) {
          tagGroups[tag] = [];
        }
        tagGroups[tag].push(memory);
      }
    }

    // 合并每组中的记忆
    for (const tag in tagGroups) {
      const group = tagGroups[tag];
      if (group.length >= 3) {
        // 每3个记忆合并一次
        for (let i = 0; i < group.length; i += 3) {
          const batch = group.slice(i, i + 3);
          const ids = batch.map(m => m.id);
          try {
            await this.consolidate(ids);
          } catch (error) {
            console.error('Failed to consolidate memories:', error);
          }
        }
      }
    }
  }

  /**
   * 迁移记忆
   * @param fromType 源记忆类型
   * @param toType 目标记忆类型
   * @param condition 迁移条件
   */
  async migrate(
    fromType: MemoryType,
    toType: MemoryType,
    condition?: (memory: Memory) => boolean
  ): Promise<number> {
    this.ensureInitialized();

    const fromAdapter = this.getAdapter(fromType);
    const toAdapter = this.getAdapter(toType);

    // 检索所有源类型的记忆
    const memories = await fromAdapter.retrieve('');
    
    let migratedCount = 0;

    for (const memory of memories) {
      // 检查迁移条件
      if (condition && !condition(memory)) {
        continue;
      }

      try {
        // 复制到目标类型
        const migratedMemory = {
          ...memory,
          type: toType,
          id: `memory_${uuidv4()}` // 生成新ID
        };
        await toAdapter.store(migratedMemory);

        // 删除源记忆
        await fromAdapter.delete(memory.id);

        migratedCount++;
      } catch (error) {
        console.error('Failed to migrate memory:', error);
      }
    }

    this.emit(MemorySystemEvent.MEMORY_MIGRATED, {
      fromType,
      toType,
      count: migratedCount
    });

    return migratedCount;
  }

  /**
   * 运行自动迁移
   */
  private async runAutoMigration(): Promise<void> {
    console.log('[MemorySystem] Running automatic migration...');

    // 自动迁移规则
    const migrationRules = [
      {
        from: MemoryType.HOT,
        to: MemoryType.WARM,
        condition: (memory: Memory) => {
          // 迁移超过1小时的热记忆
          const age = Date.now() - new Date(memory.createdAt).getTime();
          return age > 3600000; // 1小时
        }
      },
      {
        from: MemoryType.WARM,
        to: MemoryType.COLD,
        condition: (memory: Memory) => {
          // 迁移超过7天的工作记忆
          const age = Date.now() - new Date(memory.createdAt).getTime();
          return age > 7 * 24 * 60 * 60 * 1000; // 7天
        }
      }
    ];

    for (const rule of migrationRules) {
      await this.migrate(rule.from, rule.to, rule.condition);
    }
  }

  /**
   * 清理过期记忆
   * @param type 记忆类型
   */
  async cleanup(type?: MemoryType): Promise<number> {
    this.ensureInitialized();

    const types = type ? [type] : Object.values(MemoryType);
    let totalCleaned = 0;

    for (const memoryType of types) {
      const adapter = this.getAdapter(memoryType);
      const cleanedCount = await adapter.cleanup(this.getMaxAgeForType(memoryType));
      totalCleaned += cleanedCount;
    }

    return totalCleaned;
  }

  /**
   * 获取类型对应的最大存在时间
   */
  private getMaxAgeForType(type: MemoryType): number {
    const cleanupRule = this.config.storagePolicy.cleanupRules.find(
      rule => rule.type === type
    );
    return cleanupRule?.maxAge || 30 * 24 * 60 * 60 * 1000; // 默认30天
  }

  /**
   * 运行自动清理
   */
  private async runAutoCleanup(): Promise<void> {
    console.log('[MemorySystem] Running automatic cleanup...');
    await this.cleanup();
  }

  /**
   * 获取记忆统计信息
   * @param options 检索选项
   */
  async getStats(options?: RetrieveOptions): Promise<{
    totalCount: number;
    byType: Record<MemoryType, number>;
    byTag: Record<string, number>;
    totalSize: number;
  }> {
    this.ensureInitialized();

    const stats = {
      totalCount: 0,
      byType: {} as Record<MemoryType, number>,
      byTag: {} as Record<string, number>,
      totalSize: 0
    };

    // 初始化类型统计
    for (const type of Object.values(MemoryType)) {
      stats.byType[type] = 0;
    }

    // 从每个适配器获取统计
    for (const [type, adapter] of this.adapters) {
      const adapterStats = await adapter.getStats();
      stats.byType[type] = adapterStats.totalCount;
      stats.totalCount += adapterStats.totalCount;
      stats.totalSize += adapterStats.totalSize;
    }

    // 获取标签统计（只从热记忆和工作记忆中获取）
    const warmMemories = await this.retrieve('', { type: MemoryType.WARM });
    const hotMemories = await this.retrieve('', { type: MemoryType.HOT });
    
    const allMemories = [...warmMemories, ...hotMemories];
    for (const memory of allMemories) {
      for (const tag of memory.tags) {
        stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * 导出记忆数据
   * @param options 检索选项
   */
  async export(options?: RetrieveOptions): Promise<Memory[]> {
    this.ensureInitialized();
    return this.retrieve('', options);
  }

  /**
   * 导入记忆数据
   * @param memories 记忆对象列表
   */
  async import(memories: Memory[]): Promise<void> {
    this.ensureInitialized();
    await this.batchStore(memories);
  }

  /**
   * 去重记忆
   */
  private deduplicateMemories(memories: Memory[]): Memory[] {
    const seenIds = new Set<string>();
    const unique: Memory[] = [];

    for (const memory of memories) {
      if (!seenIds.has(memory.id)) {
        seenIds.add(memory.id);
        unique.push(memory);
      }
    }

    return unique;
  }

  /**
   * 确保系统已初始化
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('MemorySystem has not been initialized. Call initialize() first.');
    }
  }

  /**
   * 销毁记忆系统
   */
  async destroy(): Promise<void> {
    // 清理定时器
    if (this.migrationTimer) {
      clearInterval(this.migrationTimer);
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // 关闭所有适配器
    for (const adapter of this.adapters.values()) {
      await adapter.close();
    }

    // 移除所有监听器
    this.removeAllListeners();

    this.initialized = false;
    console.log('[MemorySystem] Destroyed successfully');
  }
}

export default MemorySystem;