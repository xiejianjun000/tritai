/**
 * WarmMemoryAdapter.ts
 * 温记忆适配器（工作记忆）
 * 
 * @author 昆仑框架团队
 * @version 1.0.0
 */

import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { IStorageAdapter, Memory, RetrieveOptions } from '../../../core/interfaces/IMemorySystem';

/**
 * 温记忆适配器配置
 */
export interface WarmMemoryConfig {
  /** 数据库文件路径 */
  dbPath: string;
  /** 是否启用全文搜索 */
  enableFTS: boolean;
}

/**
 * 温记忆适配器实现（SQLite存储）
 */
export class WarmMemoryAdapter implements IStorageAdapter {
  /** 数据库连接 */
  private db: Database | null = null;
  
  /** 配置 */
  private config: WarmMemoryConfig;

  /**
   * 构造函数
   */
  constructor() {
    this.config = {
      dbPath: ':memory:',
      enableFTS: true
    };
  }

  /**
   * 初始化适配器
   * @param config 适配器配置
   */
  async initialize(config: WarmMemoryConfig): Promise<void> {
    this.config = config;

    // 打开数据库连接
    this.db = await open({
      filename: config.dbPath,
      driver: sqlite3.Database
    });

    // 创建表
    await this.createTables();

    console.log('[WarmMemoryAdapter] Initialized at:', config.dbPath);
  }

  /**
   * 创建数据库表
   */
  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection not initialized');
    }

    // 创建记忆表
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        tenantId TEXT NOT NULL,
        type TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        priority REAL NOT NULL,
        tags TEXT NOT NULL,
        confidence REAL NOT NULL,
        source TEXT,
        text TEXT NOT NULL,
        embedding BLOB,
        expiresAt TEXT
      )
    `);

    // 创建索引
    await this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(userId, tenantId)');
    await this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type)');
    await this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(createdAt)');
    await this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_priority ON memories(priority)');

    // 创建全文搜索表
    if (this.config.enableFTS) {
      await this.db.run(`
        CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
          text,
          content=memories,
          content_rowid=id
        )
      `);

      // 创建触发器
      await this.db.run(`
        CREATE TRIGGER IF NOT EXISTS memories_fts_insert AFTER INSERT ON memories
        BEGIN
          INSERT INTO memories_fts(rowid, text) VALUES (new.id, new.text);
        END
      `);

      await this.db.run(`
        CREATE TRIGGER IF NOT EXISTS memories_fts_update AFTER UPDATE ON memories
        BEGIN
          INSERT INTO memories_fts(memories_fts, rowid, text) VALUES(&#39;delete&#39;, old.id, old.text);
          INSERT INTO memories_fts(rowid, text) VALUES (new.id, new.text);
        END
      `);

      await this.db.run(`
        CREATE TRIGGER IF NOT EXISTS memories_fts_delete AFTER DELETE ON memories
        BEGIN
          INSERT INTO memories_fts(memories_fts, rowid, text) VALUES(&#39;delete&#39;, old.id, old.text);
        END
      `);
    }
  }

  /**
   * 将数据库行转换为Memory对象
   */
  private rowToMemory(row: any): Memory {
    return {
      id: row.id,
      userId: row.userId,
      tenantId: row.tenantId,
      type: row.type,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      priority: row.priority,
      tags: row.tags ? JSON.parse(row.tags) : [],
      confidence: row.confidence,
      source: row.source,
      text: row.text,
      embedding: row.embedding ? JSON.parse(Buffer.from(row.embedding).toString()) : undefined,
      expiresAt: row.expiresAt ? new Date(row.expiresAt) : undefined
    };
  }

  /**
   * 存储记忆
   * @param memory 记忆对象
   */
  async store(memory: Memory): Promise<string> {
    if (!this.db) {
      throw new Error('Database connection not initialized');
    }

    if (!memory.id) {
      throw new Error('Memory ID is required');
    }

    const stmt = await this.db.prepare(`
      INSERT OR REPLACE INTO memories (
        id, userId, tenantId, type, createdAt, updatedAt,
        priority, tags, confidence, source, text, embedding, expiresAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await stmt.run(
      memory.id,
      memory.userId,
      memory.tenantId,
      memory.type,
      memory.createdAt.toISOString(),
      memory.updatedAt.toISOString(),
      memory.priority,
      JSON.stringify(memory.tags),
      memory.confidence,
      memory.source,
      memory.text,
      memory.embedding ? Buffer.from(JSON.stringify(memory.embedding)) : null,
      memory.expiresAt ? memory.expiresAt.toISOString() : null
    );

    await stmt.finalize();

    return memory.id;
  }

  /**
   * 批量存储记忆
   * @param memories 记忆对象列表
   */
  async batchStore(memories: Memory[]): Promise<string[]> {
    if (!this.db) {
      throw new Error('Database connection not initialized');
    }

    const ids: string[] = [];

    await this.db.run('BEGIN TRANSACTION');

    try {
      const stmt = await this.db.prepare(`
        INSERT OR REPLACE INTO memories (
          id, userId, tenantId, type, createdAt, updatedAt,
          priority, tags, confidence, source, text, embedding, expiresAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const memory of memories) {
        if (!memory.id) {
          throw new Error('Memory ID is required');
        }

        await stmt.run(
          memory.id,
          memory.userId,
          memory.tenantId,
          memory.type,
          memory.createdAt.toISOString(),
          memory.updatedAt.toISOString(),
          memory.priority,
          JSON.stringify(memory.tags),
          memory.confidence,
          memory.source,
          memory.text,
          memory.embedding ? Buffer.from(JSON.stringify(memory.embedding)) : null,
          memory.expiresAt ? memory.expiresAt.toISOString() : null
        );

        ids.push(memory.id);
      }

      await stmt.finalize();
      await this.db.run('COMMIT');
    } catch (error) {
      await this.db.run('ROLLBACK');
      throw error;
    }

    return ids;
  }

  /**
   * 检索记忆
   * @param query 检索查询
   * @param options 检索选项
   */
  async retrieve(query: string, options?: RetrieveOptions): Promise<Memory[]> {
    if (!this.db) {
      throw new Error('Database connection not initialized');
    }

    let sql = 'SELECT * FROM memories';
    const params: any[] = [];
    const conditions: string[] = [];

    // 构建查询条件
    if (query) {
      if (this.config.enableFTS) {
        sql = `
          SELECT m.* FROM memories m
          JOIN memories_fts fts ON m.id = fts.rowid
          WHERE fts.text MATCH ?
        `;
        params.push(query);
      } else {
        conditions.push('text LIKE ?');
        params.push(`%${query}%`);
      }
    }

    // 添加类型过滤
    if (options?.type) {
      if (Array.isArray(options.type)) {
        const placeholders = options.type.map(() => '?').join(',');
        conditions.push(`type IN (${placeholders})`);
        params.push(...options.type);
      } else {
        conditions.push('type = ?');
        params.push(options.type);
      }
    }

    // 添加时间范围过滤
    if (options?.timeRange) {
      if (options.timeRange.start) {
        conditions.push('createdAt >= ?');
        params.push(options.timeRange.start.toISOString());
      }
      if (options.timeRange.end) {
        conditions.push('createdAt <= ?');
        params.push(options.timeRange.end.toISOString());
      }
    }

    // 添加优先级范围过滤
    if (options?.priorityRange) {
      if (options.priorityRange.min !== undefined) {
        conditions.push('priority >= ?');
        params.push(options.priorityRange.min);
      }
      if (options.priorityRange.max !== undefined) {
        conditions.push('priority <= ?');
        params.push(options.priorityRange.max);
      }
    }

    // 添加置信度阈值过滤
    if (options?.confidenceThreshold !== undefined) {
      conditions.push('confidence >= ?');
      params.push(options.confidenceThreshold);
    }

    // 合并条件
    if (conditions.length > 0 && !query) {
      sql += ' WHERE ' + conditions.join(' AND ');
    } else if (conditions.length > 0 && query) {
      sql += ' AND ' + conditions.join(' AND ');
    }

    // 添加排序
    sql += ' ORDER BY priority DESC, updatedAt DESC';

    // 添加结果数量限制
    if (options?.limit && options.limit > 0) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    // 执行查询
    const rows = await this.db.all(sql, params);

    // 转换为Memory对象
    return rows.map(row => this.rowToMemory(row));
  }

  /**
   * 根据ID获取记忆
   * @param id 记忆ID
   */
  async getById(id: string): Promise<Memory | null> {
    if (!this.db) {
      throw new Error('Database connection not initialized');
    }

    const row = await this.db.get('SELECT * FROM memories WHERE id = ?', id);

    return row ? this.rowToMemory(row) : null;
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
    if (!this.db) {
      throw new Error('Database connection not initialized');
    }

    await this.db.run('DELETE FROM memories WHERE id = ?', id);
  }

  /**
   * 批量删除记忆
   * @param ids 记忆ID列表
   */
  async batchDelete(ids: string[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection not initialized');
    }

    if (ids.length === 0) {
      return;
    }

    const placeholders = ids.map(() => '?').join(',');
    await this.db.run(`DELETE FROM memories WHERE id IN (${placeholders})`, ids);
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    totalCount: number;
    totalSize: number;
  }> {
    if (!this.db) {
      throw new Error('Database connection not initialized');
    }

    const countResult = await this.db.get('SELECT COUNT(*) as count FROM memories');
    const sizeResult = await this.db.get('SELECT SUM(LENGTH(text)) as size FROM memories');

    return {
      totalCount: countResult.count || 0,
      totalSize: sizeResult.size || 0
    };
  }

  /**
   * 清理过期记忆
   * @param maxAge 最大存在时间（毫秒）
   */
  async cleanup(maxAge?: number): Promise<number> {
    if (!this.db) {
      throw new Error('Database connection not initialized');
    }

    let deletedCount = 0;

    // 清理过期记忆
    if (maxAge !== undefined) {
      const cutoffTime = new Date(Date.now() - maxAge);
      const result = await this.db.run(
        'DELETE FROM memories WHERE createdAt <= ?',
        cutoffTime.toISOString()
      );
      deletedCount = result.changes || 0;
    } else {
      // 清理有过期时间且已过期的记忆
      const result = await this.db.run(
        'DELETE FROM memories WHERE expiresAt <= ?',
        new Date().toISOString()
      );
      deletedCount = result.changes || 0;
    }

    return deletedCount;
  }

  /**
   * 关闭适配器
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      console.log('[WarmMemoryAdapter] Closed');
    }
  }
}

export default WarmMemoryAdapter;