/**
 * KnowledgeBaseAdapter.ts
 * 知识库适配器（向量数据库存储）
 *
 * @author 昆仑框架团队
 * @version 1.0.0
 */

import { IStorageAdapter, Memory, IVectorStoreAdapter, RetrieveOptions } from './core/interfaces/IMemorySystem';

/**
 * Qdrant客户端包装（简化实现）
 */
class QdrantClient {
  private config: any;
  private collections: Map<string, any> = new Map();

  constructor(config: any) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // 模拟初始化
    console.log('[QdrantClient] Initialized at:', this.config.url);
  }

  async createCollection(collectionName: string, dimension: number): Promise<void> {
    if (!this.collections.has(collectionName)) {
      this.collections.set(collectionName, {
        dimension,
        points: new Map()
      });
    }
  }

  async upsert(collectionName: string, points: any[]): Promise<void> {
    const collection = this.collections.get(collectionName);
    if (!collection) {
      throw new Error(`Collection ${collectionName} does not exist`);
    }

    for (const point of points) {
      collection.points.set(point.id, point);
    }
  }

  async search(collectionName: string, query: any, limit: number = 10): Promise<any[]> {
    const collection = this.collections.get(collectionName);
    if (!collection) {
      throw new Error(`Collection ${collectionName} does not exist`);
    }

    const queryVector = query.vector;
    const results: any[] = [];

    // 简单的余弦相似度计算
    for (const [id, point] of collection.points) {
      const similarity = this.cosineSimilarity(queryVector, point.vector);
      results.push({
        id,
        score: similarity,
        payload: point.payload
      });
    }

    // 按相似度排序
    results.sort((a, b) => b.score - a.score);

    // 返回限制数量
    return results.slice(0, limit);
  }

  async delete(collectionName: string, points: string[]): Promise<void> {
    const collection = this.collections.get(collectionName);
    if (!collection) {
      throw new Error(`Collection ${collectionName} does not exist`);
    }

    for (const id of points) {
      collection.points.delete(id);
    }
  }

  async count(collectionName: string): Promise<number> {
    const collection = this.collections.get(collectionName);
    if (!collection) {
      return 0;
    }

    return collection.points.size;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }
}

/**
 * 知识库适配器配置
 */
export interface KnowledgeBaseConfig {
  /** 向量数据库配置 */
  vectorDbConfig: {
    url: string;
    collectionName: string;
    apiKey?: string;
  };
  /** 向量维度 */
  vectorDimension?: number;
}

/**
 * 知识库适配器实现（向量数据库存储）
 */
export class KnowledgeBaseAdapter implements IStorageAdapter, IVectorStoreAdapter {
  /** 向量数据库客户端 */
  private vectorDb: QdrantClient;

  /** 配置 */
  private config: Required<KnowledgeBaseConfig>;

  /** 适配器名称 */
  public readonly name: string = 'KnowledgeBaseAdapter';

  /**
   * 构造函数
   */
  constructor() {
    this.config = {
      vectorDbConfig: {
        url: 'http://localhost:6333',
        collectionName: 'knowledge_base'
      },
      vectorDimension: 1536
    };
    this.vectorDb = new QdrantClient(this.config.vectorDbConfig);
  }

  /**
   * 初始化适配器
   */
  async initialize(): Promise<void> {
    await this.vectorDb.initialize();
    await this.vectorDb.createCollection(
      this.config.vectorDbConfig.collectionName,
      this.config.vectorDimension
    );

    console.log('[KnowledgeBaseAdapter] Initialized at:', this.config.vectorDbConfig.url);
  }

  /**
   * 使用自定义配置初始化适配器
   * @param config 适配器配置
   */
  async initializeWithConfig(config: KnowledgeBaseConfig): Promise<void> {
    this.config = {
      vectorDbConfig: config.vectorDbConfig,
      vectorDimension: config.vectorDimension ?? 1536
    };
    this.vectorDb = new QdrantClient(this.config.vectorDbConfig);
    await this.initialize();
  }

  // ===== IStorageAdapter 接口实现 =====

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
    return this.searchByQuery(options?.query || '', options);
  }

  /**
   * 删除记忆（IStorageAdapter 接口实现）
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.vectorDb.delete(
        this.config.vectorDbConfig.collectionName,
        [id]
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 清空所有记忆（IStorageAdapter 接口实现）
   */
  async clear(): Promise<void> {
    // 简化实现
  }

  /**
   * 获取统计信息（IStorageAdapter 接口实现）
   */
  async getStats(): Promise<{ count: number; size: number }> {
    const count = await this.vectorDb.count(this.config.vectorDbConfig.collectionName);

    return {
      count,
      size: 0 // 向量数据库大小计算复杂，这里返回0
    };
  }

  // ===== IVectorStoreAdapter 接口实现 =====

  /**
   * 添加向量
   */
  async addVector(memoryId: string, vector: number[]): Promise<void> {
    await this.vectorDb.upsert(
      this.config.vectorDbConfig.collectionName,
      [{ id: memoryId, vector, payload: {} }]
    );
  }

  /**
   * 向量搜索（IVectorStoreAdapter 接口实现）
   */
  async search(queryVector: number[], limit?: number): Promise<{ memoryId: string; score: number }[]> {
    const results = await this.vectorDb.search(
      this.config.vectorDbConfig.collectionName,
      { vector: queryVector },
      limit || 10
    );

    return results.map(r => ({
      memoryId: r.id,
      score: r.score
    }));
  }

  /**
   * 删除向量
   */
  async remove(memoryId: string): Promise<void> {
    await this.vectorDb.delete(
      this.config.vectorDbConfig.collectionName,
      [memoryId]
    );
  }

  // ===== 扩展方法 =====

  /**
   * 转换记忆为向量点
   */
  private memoryToPoint(memory: Memory): any {
    if (!memory.embedding) {
      throw new Error('Memory embedding is required for knowledge base');
    }

    return {
      id: memory.id,
      vector: memory.embedding,
      payload: {
        userId: memory.userId,
        tenantId: memory.tenantId,
        type: memory.type,
        createdAt: (memory.createdAt || new Date()).toISOString(),
        updatedAt: (memory.updatedAt || new Date()).toISOString(),
        priority: memory.priority,
        tags: memory.tags,
        confidence: memory.confidence,
        source: memory.source,
        text: memory.text || memory.content || '',
        expiresAt: memory.expiresAt?.toISOString()
      }
    };
  }

  /**
   * 转换向量点为记忆
   */
  private pointToMemory(point: any): Memory {
    return {
      id: point.id,
      content: point.payload.text || '',
      timestamp: new Date(point.payload.createdAt).getTime(),
      userId: point.payload.userId,
      tenantId: point.payload.tenantId,
      type: point.payload.type,
      createdAt: new Date(point.payload.createdAt),
      updatedAt: new Date(point.payload.updatedAt),
      priority: point.payload.priority,
      tags: point.payload.tags,
      confidence: point.payload.confidence,
      source: point.payload.source,
      text: point.payload.text,
      embedding: undefined, // 向量存储在向量数据库中，不返回
      expiresAt: point.payload.expiresAt ? new Date(point.payload.expiresAt) : undefined
    };
  }

  /**
   * 存储记忆
   * @param memory 记忆对象
   */
  async store(memory: Memory): Promise<string> {
    if (!memory.id) {
      throw new Error('Memory ID is required');
    }

    if (!memory.embedding) {
      throw new Error('Memory embedding is required for knowledge base storage');
    }

    const point = this.memoryToPoint(memory);
    await this.vectorDb.upsert(
      this.config.vectorDbConfig.collectionName,
      [point]
    );

    return memory.id;
  }

  /**
   * 批量存储记忆
   * @param memories 记忆对象列表
   */
  async batchStore(memories: Memory[]): Promise<string[]> {
    const points = [];
    const ids: string[] = [];

    for (const memory of memories) {
      if (!memory.id) {
        throw new Error('Memory ID is required');
      }
      if (!memory.embedding) {
        throw new Error(`Memory ${memory.id} embedding is required for knowledge base storage`);
      }

      points.push(this.memoryToPoint(memory));
      ids.push(memory.id);
    }

    await this.vectorDb.upsert(
      this.config.vectorDbConfig.collectionName,
      points
    );

    return ids;
  }

  /**
   * 按查询搜索记忆
   * @param query 检索查询
   * @param options 检索选项
   */
  async searchByQuery(query: string, options?: RetrieveOptions): Promise<Memory[]> {
    // 简单实现：如果有嵌入向量则使用向量搜索，否则使用关键字搜索
    if ((options as any)?.embedding) {
      return this.retrieveByVector((options as any).embedding, options);
    }

    // 关键字搜索（简化实现，实际应该使用全文索引）
    const results: Memory[] = [];
    // 这里可以添加全文搜索逻辑

    return results;
  }

  /**
   * 按向量检索
   * @param embedding 嵌入向量
   * @param options 检索选项
   */
  async retrieveByVector(
    embedding: number[],
    options?: {
      limit?: number;
      similarityThreshold?: number;
    }
  ): Promise<Memory[]> {
    const searchResults = await this.vectorDb.search(
      this.config.vectorDbConfig.collectionName,
      {
        vector: embedding
      },
      options?.limit || 10
    );

    // 转换为Memory对象
    const memories = searchResults.map(result => this.pointToMemory(result));

    return memories;
  }

  /**
   * 根据ID获取记忆
   * @param id 记忆ID
   */
  async getById(id: string): Promise<Memory | null> {
    // 简化实现，实际应该使用向量数据库的get方法
    return null;
  }

  /**
   * 更新记忆
   * @param id 记忆ID
   * @param updates 记忆更新内容
   */
  async update(id: string, updates: Partial<Memory>): Promise<Memory | null> {
    const memory = await this.getById(id);
    if (!memory) {
      return null;
    }

    // 合并更新
    const updatedMemory: Memory = {
      ...memory,
      ...updates,
      updatedAt: new Date()
    };

    // 存储更新后的记忆
    await this.store(updatedMemory);

    return updatedMemory;
  }

  /**
   * 批量删除记忆
   * @param ids 记忆ID列表
   */
  async batchDelete(ids: string[]): Promise<void> {
    await this.vectorDb.delete(
      this.config.vectorDbConfig.collectionName,
      ids
    );
  }

  /**
   * 清理过期记忆
   * @param maxAge 最大存在时间（毫秒）
   */
  async cleanup(_maxAge?: number): Promise<number> {
    // 简化实现，实际应该使用向量数据库的过滤和删除功能
    return 0;
  }

  /**
   * 删除向量
   * @param id 记忆ID
   */
  async deleteVector(id: string): Promise<void> {
    await this.delete(id);
  }

  /**
   * 创建索引
   * @param dimension 向量维度
   */
  async createIndex(dimension: number): Promise<void> {
    await this.vectorDb.createCollection(
      this.config.vectorDbConfig.collectionName,
      dimension
    );
  }

  /**
   * 关闭适配器
   */
  async close(): Promise<void> {
    // 向量数据库适配器不需要保持连接
    console.log('[KnowledgeBaseAdapter] Closed');
  }
}

export default KnowledgeBaseAdapter;
