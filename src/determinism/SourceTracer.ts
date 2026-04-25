import {
  IDeterminismSystem,
  DeterminismResult,
  DeterminismOptions,
  SourceReference,
  SourceTraceResult
} from './interfaces/IDeterminismSystem';

/**
 * 知识索引条目
 */
export interface KnowledgeIndexEntry {
  /**
   * 条目ID
   */
  id: string;
  /**
   * 内容文本
   */
  content: string;
  /**
   * 来源引用
   */
  source: SourceReference;
  /**
   * 关键词（用于检索）
   */
  keywords?: string[];
  /**
   * 相似度匹配阈值，默认0.6
   */
  matchThreshold?: number;
  /**
   * 分词结果缓存（私有，用于性能优化）
   * @internal
   */
  _cachedWords?: Set<string>;
}

/**
 * SourceTracer配置
 */
export interface SourceTracerConfig {
  /**
   * 最小匹配相似度，默认0.6
   */
  minMatchThreshold?: number;
  /**
   * 每个查询最大返回来源数量，默认10
   */
  maxSources?: number;
}

/**
 * 知识溯源索引
 * 将模型输出中的每个结论追溯到其知识来源，支持检测无来源的虚构内容
 */
export class SourceTracer implements IDeterminismSystem {
  public readonly name: string = 'SourceTracer';
  public readonly version: string = '1.0.0';

  private index: Map<string, KnowledgeIndexEntry> = new Map();
  private invertedIndex: Map<string, Set<string>> = new Map();
  private minMatchThreshold: number;
  private maxSources: number;
  private ready: boolean = true;

  constructor(config?: SourceTracerConfig) {
    this.minMatchThreshold = config?.minMatchThreshold ?? 0.6;
    this.maxSources = config?.maxSources ?? 10;
  }

  /**
   * 检查追踪器是否就绪
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * 添加知识条目到索引
   * @param entry 知识条目
   */
  addEntry(entry: KnowledgeIndexEntry): void {
    this.index.set(entry.id, entry);
    
    // 更新倒排索引
    const keywords = entry.keywords || this.extractKeywords(entry.content);
    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      if (!this.invertedIndex.has(lowerKeyword)) {
        this.invertedIndex.set(lowerKeyword, new Set());
      }
      this.invertedIndex.get(lowerKeyword)!.add(entry.id);
    }
  }

  /**
   * 从索引移除条目
   * @param id 条目ID
   */
  removeEntry(id: string): boolean {
    if (!this.index.has(id)) {
      return false;
    }

    // 从倒排索引移除
    const entry = this.index.get(id)!;
    const keywords = entry.keywords || this.extractKeywords(entry.content);
    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      const entries = this.invertedIndex.get(lowerKeyword);
      if (entries) {
        entries.delete(id);
        if (entries.size === 0) {
          this.invertedIndex.delete(lowerKeyword);
        }
      }
    }

    return this.index.delete(id);
  }

  /**
   * 批量添加知识条目
   * @param entries 知识条目列表
   */
  addEntries(entries: KnowledgeIndexEntry[]): void {
    for (const entry of entries) {
      this.addEntry(entry);
    }
  }

  /**
   * 对内容进行溯源，找到匹配的知识来源
   * @param content 需要溯源的内容
   * @param options 溯源选项
   */
  async verify(content: string, options?: Partial<DeterminismOptions>): Promise<DeterminismResult> {
    const traceResult = this.trace(content);
    
    // 计算幻觉风险：未覆盖比例就是风险
    const hallucinationRisk = 1 - traceResult.coverage;
    
    return {
      verified: hallucinationRisk < (options?.hallucinationThreshold ?? 0.8),
      confidence: traceResult.averageConfidence,
      sources: traceResult.sources,
      hallucinationRisk,
      consistencyScore: traceResult.coverage,
      message: `溯源完成，找到 ${traceResult.sources.length} 个来源，覆盖率 ${(traceResult.coverage * 100).toFixed(1)}%`
    };
  }

  /**
   * 执行溯源查询
   * @param content 需要溯源的内容
   */
  trace(content: string | null | undefined): SourceTraceResult {
    if (content == null) {
      return {
        sources: [],
        coverage: 0,
        averageConfidence: 0
      };
    }
    
    if (this.index.size === 0) {
      return {
        sources: [],
        coverage: 0,
        averageConfidence: 0
      };
    }

    // 提取内容中的候选关键词，查找候选来源
    const contentKeywords = this.extractKeywords(content);
    const candidateEntryIds = new Set<string>();
    
    // 通过倒排索引找到候选条目
    for (const keyword of contentKeywords) {
      const lowerKeyword = keyword.toLowerCase();
      const entries = this.invertedIndex.get(lowerKeyword);
      if (entries) {
        for (const entryId of entries) {
          candidateEntryIds.add(entryId);
        }
      }
    }

    // 如果没有候选，直接返回空
    if (candidateEntryIds.size === 0) {
      return {
        sources: [],
        coverage: 0,
        averageConfidence: 0
      };
    }

    // 计算每个候选条目的相似度，排序
    const scoredEntries: Array<{ entry: KnowledgeIndexEntry; score: number }> = [];
    for (const entryId of candidateEntryIds) {
      const entry = this.index.get(entryId)!;
      const similarity = this.calculateContentSimilarity(content, entry);
      const threshold = entry.matchThreshold ?? this.minMatchThreshold;
      if (similarity >= threshold) {
        scoredEntries.push({ entry, score: similarity });
      }
    }

    // 按相似度降序排序，取前N个
    scoredEntries.sort((a, b) => b.score - a.score);
    const selectedEntries = scoredEntries.slice(0, this.maxSources);

    // 收集来源引用
    const sources: SourceReference[] = selectedEntries.map(
      ({ entry }) => entry.source
    );

    // 计算覆盖率和平均置信度
    let totalConfidence = 0;
    for (const source of sources) {
      totalConfidence += source.confidence;
    }
    const averageConfidence = sources.length > 0 
      ? totalConfidence / sources.length 
      : 0;

    // 简单估算覆盖率：匹配的关键词比例
    const coverage = this.calculateCoverage(contentKeywords, sources);

    return {
      sources,
      coverage,
      averageConfidence
    };
  }

  /**
   * 计算内容覆盖率
   */
  private calculateCoverage(contentKeywords: string[], sources: SourceReference[]): number {
    if (contentKeywords.length === 0) {
      return 1;
    }
    if (sources.length === 0) {
      return 0;
    }

    // 统计覆盖的关键词数量
    let coveredKeywords = 0;
    const sourceKeywords = new Set<string>();
    
    for (const source of sources) {
      // 从源ID和类型提取关键词作为简单近似
      if (source.id) {
        const words = source.id.toLowerCase().split(/[_\-\s]+/);
        for (const word of words) {
          if (word.length > 2) {
            sourceKeywords.add(word);
          }
        }
      }
      if (source.type) {
        sourceKeywords.add(source.type.toLowerCase());
      }
    }

    for (const keyword of contentKeywords) {
      const lowerKeyword = keyword.toLowerCase();
      if (sourceKeywords.has(lowerKeyword)) {
        coveredKeywords++;
      }
    }

    return coveredKeywords / contentKeywords.length;
  }

  /**
   * 计算两段内容的相似度（基于Jaccard）
   */
  private calculateContentSimilarity(a: string, entry: KnowledgeIndexEntry): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    let wordsB: Set<string>;
    
    // Use cached tokenization if available
    if (entry._cachedWords) {
      wordsB = entry._cachedWords;
    } else {
      wordsB = new Set(entry.content.toLowerCase().split(/\s+/).filter(w => w.length > 3));
      // Cache the result
      entry._cachedWords = wordsB;
    }

    if (wordsA.size === 0 && wordsB.size === 0) {
      return 1;
    }

    let intersection = 0;
    for (const word of wordsA) {
      if (wordsB.has(word)) {
        intersection++;
      }
    }

    const union = wordsA.size + wordsB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  /**
   * 从内容提取关键词
   */
  private extractKeywords(content: string): string[] {
    // 简单提取：按空格分割，过滤掉短词
    return content
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
      .split(/\s+/)
      .filter(word => {
        // 中文单字保留，英文单词长度大于2
        if (/[\u4e00-\u9fa5]/.test(word)) {
          return true;
        }
        return word.length > 2;
      });
  }

  /**
   * 获取索引中的条目总数
   */
  getIndexSize(): number {
    return this.index.size;
  }

  /**
   * 清空索引
   */
  clearIndex(): void {
    this.index.clear();
    this.invertedIndex.clear();
  }
}
