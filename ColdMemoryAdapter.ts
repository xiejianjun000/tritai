/**
 * ColdMemoryAdapter.ts
 * 冷记忆适配器（长期记忆）
 * 
 * @author 昆仑框架团队
 * @version 1.0.0
 */

import fs from 'fs';
import path from 'path';
import { createGzip, createGunzip } from 'zlib';
import { promisify } from 'util';
import { pipeline } from 'stream/promises';
import { IStorageAdapter, Memory, RetrieveOptions } from './core/interfaces/IMemorySystem';

/**
 * 冷记忆适配器配置
 */
export interface ColdMemoryConfig {
  /** 存储路径 */
  storagePath: string;
  /** 是否启用压缩 */
  enableCompression: boolean;
  /** 最大文件大小（字节） */
  maxFileSize: number;
}

/**
 * 冷记忆适配器实现（文件系统存储）
 */
export class ColdMemoryAdapter implements IStorageAdapter {
  /** 配置 */
  private config: ColdMemoryConfig;

  /**
   * 构造函数
   */
  constructor() {
    this.config = {
      storagePath: './data/memory/cold',
      enableCompression: true,
      maxFileSize: 1024 * 1024 * 100 // 100MB
    };
  }

  /**
   * 初始化适配器
   * @param config 适配器配置
   */
  async initialize(config: ColdMemoryConfig): Promise<void> {
    this.config = config;

    // 创建存储目录
    await promisify(fs.mkdir)(config.storagePath, { recursive: true });

    console.log('[ColdMemoryAdapter] Initialized at:', config.storagePath);
  }

  /**
   * 获取记忆文件路径
   */
  private getMemoryPath(id: string): string {
    // 使用ID的前两位作为目录分片
    const shard = id.substring(0, 2);
    const shardDir = path.join(this.config.storagePath, shard);
    
    // 确保分片目录存在
    promisify(fs.mkdir)(shardDir, { recursive: true }).catch(console.error);

    return path.join(shardDir, `${id}.json${this.config.enableCompression ? '.gz' : ''}`);
  }

  /**
   * 读取记忆文件
   */
  private async readMemoryFile(path: string): Promise<Memory> {
    if (this.config.enableCompression) {
      const stream = fs.createReadStream(path).pipe(createGunzip());
      const chunks: Buffer[] = [];
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const data = Buffer.concat(chunks).toString('utf8');
      return JSON.parse(data) as Memory;
    } else {
      const data = await promisify(fs.readFile)(path, 'utf8');
      return JSON.parse(data) as Memory;
    }
  }

  /**
   * 写入记忆文件
   */
  private async writeMemoryFile(path: string, memory: Memory): Promise<void> {
    const data = JSON.stringify(memory, null, 2);

    if (this.config.enableCompression) {
      const stream = createGzip();
      await pipeline(
        stream.end(data),
        fs.createWriteStream(path)
      );
    } else {
      await promisify(fs.writeFile)(path, data, 'utf8');
    }
  }

  /**
   * 删除记忆文件
   */
  private async deleteMemoryFile(path: string): Promise<void> {
    try {
      await promisify(fs.unlink)(path);
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * 获取所有记忆ID
   */
  private async getAllMemoryIds(): Promise<string[]> {
    const ids: string[] = [];
    const dirs = await promisify(fs.readdir)(this.config.storagePath);

    for (const dir of dirs) {
      const dirPath = path.join(this.config.storagePath, dir);
      const stats = await promisify(fs.stat)(dirPath);
      
      if (stats.isDirectory()) {
        const files = await promisify(fs.readdir)(dirPath);
        
        for (const file of files) {
          if (file.endsWith('.json') || file.endsWith('.json.gz')) {
            const id = file.replace(/\.json(\.gz)?$/, '');
            ids.push(id);
          }
        }
      }
    }

    return ids;
  }

  /**
   * 存储记忆
   * @param memory 记忆对象
   */
  async store(memory: Memory): Promise<string> {
    if (!memory.id) {
      throw new Error('Memory ID is required');
    }

    const filePath = this.getMemoryPath(memory.id);
    await this.writeMemoryFile(filePath, memory);

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
      await this.store(memory);
      ids.push(memory.id);
    }

    return ids;
  }

  /**
   * 检索记忆
   * @param query 检索查询
   * @param options 检索选项
   */
  async retrieve(query: string, options?: RetrieveOptions): Promise<Memory[]> {
    const ids = await this.getAllMemoryIds();
    const results: Memory[] = [];

    // 简单实现：扫描所有记忆（实际应该使用索引）
    for (const id of ids) {
      try {
        const memory = await this.getById(id);
        if (memory) {
          // 检查是否匹配查询
          if (!query || memory.text.includes(query)) {
            // 检查是否匹配过滤条件
            if (this.matchesOptions(memory, options)) {
              results.push(memory);
            }
          }
        }
      } catch (error) {
        console.error(`Failed to read memory ${id}:`, error);
      }
    }

    // 排序
    results.sort((a, b) => b.priority - a.priority);

    // 应用结果数量限制
    if (options?.limit && options.limit > 0) {
      return results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * 检查记忆是否匹配选项
   */
  private matchesOptions(memory: Memory, options?: RetrieveOptions): boolean {
    if (!options) {
      return true;
    }

    // 检查类型过滤
    if (options.type) {
      if (Array.isArray(options.type) && !options.type.includes(memory.type)) {
        return false;
      }
      if (!Array.isArray(options.type) && options.type !== memory.type) {
        return false;
      }
    }

    // 检查时间范围
    if (options.timeRange) {
      const memoryTime = new Date(memory.createdAt).getTime();
      
      if (options.timeRange.start && memoryTime < options.timeRange.start.getTime()) {
        return false;
      }
      
      if (options.timeRange.end && memoryTime > options.timeRange.end.getTime()) {
        return false;
      }
    }

    // 检查优先级范围
    if (options.priorityRange) {
      if (options.priorityRange.min !== undefined && memory.priority < options.priorityRange.min) {
        return false;
      }
      
      if (options.priorityRange.max !== undefined && memory.priority > options.priorityRange.max) {
        return false;
      }
    }

    // 检查置信度阈值
    if (options.confidenceThreshold !== undefined && memory.confidence < options.confidenceThreshold) {
      return false;
    }

    return true;
  }

  /**
   * 根据ID获取记忆
   * @param id 记忆ID
   */
  async getById(id: string): Promise<Memory | null> {
    const filePath = this.getMemoryPath(id);

    try {
      const stats = await promisify(fs.stat)(filePath);
      if (stats.isFile()) {
        return this.readMemoryFile(filePath);
      }
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        console.error(`Failed to get memory ${id}:`, error);
      }
    }

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
   * 删除记忆
   * @param id 记忆ID
   */
  async delete(id: string): Promise<void> {
    const filePath = this.getMemoryPath(id);
    await this.deleteMemoryFile(filePath);
  }

  /**
   * 批量删除记忆
   * @param ids 记忆ID列表
   */
  async batchDelete(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.delete(id);
    }
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    totalCount: number;
    totalSize: number;
  }> {
    const ids = await this.getAllMemoryIds();
    let totalSize = 0;

    for (const id of ids) {
      try {
        const filePath = this.getMemoryPath(id);
        const stats = await promisify(fs.stat)(filePath);
        totalSize += stats.size;
      } catch (error) {
        // 忽略不存在的文件
      }
    }

    return {
      totalCount: ids.length,
      totalSize
    };
  }

  /**
   * 清理过期记忆
   * @param maxAge 最大存在时间（毫秒）
   */
  async cleanup(maxAge?: number): Promise<number> {
    if (maxAge === undefined) {
      return 0;
    }

    const ids = await this.getAllMemoryIds();
    let deletedCount = 0;
    const cutoffTime = Date.now() - maxAge;

    for (const id of ids) {
      try {
        const memory = await this.getById(id);
        if (memory) {
          const memoryTime = new Date(memory.createdAt).getTime();
          if (memoryTime < cutoffTime) {
            await this.delete(id);
            deletedCount++;
          }
        }
      } catch (error) {
        console.error(`Failed to cleanup memory ${id}:`, error);
      }
    }

    return deletedCount;
  }

  /**
   * 关闭适配器
   */
  async close(): Promise<void> {
    // 冷记忆适配器不需要保持连接
    console.log('[ColdMemoryAdapter] Closed');
  }
}

export default ColdMemoryAdapter;