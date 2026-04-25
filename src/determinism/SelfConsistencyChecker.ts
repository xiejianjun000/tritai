import {
  IDeterminismSystem,
  DeterminismResult,
  DeterminismOptions,
  SelfConsistencyResult
} from './interfaces/IDeterminismSystem';

/**
 * 自一致性检查配置
 */
export interface SelfConsistencyCheckerConfig {
  /**
   * 默认采样次数，默认3
   */
  defaultSamples?: number;
  /**
   * 通过阈值 (0-1)，默认0.7，相似度超过该阈值才算通过
   */
  passThreshold?: number;
  /**
   * 相似度计算方法
   */
  similarityStrategy?: 'jaccard' | 'cosine' | 'levenshtein';
}

/**
 * 多路径自一致性检查器
 * 通过对同一问题多次采样生成多个输出，比较输出之间的一致性来检测幻觉
 */
export class SelfConsistencyChecker implements IDeterminismSystem {
  public readonly name: string = 'SelfConsistencyChecker';
  public readonly version: string = '1.0.0';

  private defaultSamples: number;
  private passThreshold: number;
  private similarityStrategy: Required<SelfConsistencyCheckerConfig>['similarityStrategy'];
  private ready: boolean = true;

  constructor(config?: SelfConsistencyCheckerConfig) {
    this.defaultSamples = config?.defaultSamples ?? 3;
    this.passThreshold = config?.passThreshold ?? 0.7;
    this.similarityStrategy = config?.similarityStrategy ?? 'jaccard';
  }

  /**
   * 检查系统是否就绪
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * 对单条内容执行一致性验证（不采样，需要提供多个样本）
   * @param samples 多个采样结果
   * @param options 验证选项
   */
  async verify(
    content: string,
    options?: Partial<DeterminismOptions>,
    samples?: string[]
  ): Promise<DeterminismResult> {
    // 如果提供了样本，直接用样本检查
    if (samples && samples.length >= 2) {
      const result = this.checkConsistency(samples);
      return {
        verified: result.passed,
        confidence: result.score,
        sources: [],
        hallucinationRisk: 1 - result.score,
        consistencyScore: result.score,
        message: `自一致性检查完成，得分 ${(result.score * 100).toFixed(1)}%`
      };
    }

    // 如果只有单条内容，返回默认结果（需要采样生成器配合）
    return {
      verified: true,
      confidence: 1.0,
      sources: [],
      hallucinationRisk: 0,
      consistencyScore: 1.0,
      message: '未提供多路径样本，跳过自一致性检查'
    };
  }

  /**
   * 检查多路径输出的一致性
   * @param samples 多个采样输出样本
   */
  checkConsistency(samples: (string | null | undefined)[]): SelfConsistencyResult {
    // Filter out null/undefined samples
    const validSamples = samples.filter((s): s is string => s != null && s.trim().length > 0);
    
    if (validSamples.length < 2) {
      return {
        score: 1.0,
        details: [],
        passed: true
      };
    }

    const n = validSamples.length;
    const details: SelfConsistencyResult['details'] = [];
    let totalSimilarity = 0;
    let comparisonCount = 0;

    // 计算所有样本两两之间的相似度
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const similarity = this.calculateSimilarity(validSamples[i], validSamples[j]);
        totalSimilarity += similarity;
        comparisonCount++;
        details.push({
          pathId: comparisonCount,
          content: `${i+1} vs ${j+1}`,
          similarity
        });
      }
    }

    const score = totalSimilarity / comparisonCount;
    const passed = score >= this.passThreshold;

    return {
      score,
      details,
      passed
    };
  }

  /**
   * 计算两个文本之间的相似度
   */
  private calculateSimilarity(a: string, b: string): number {
    switch (this.similarityStrategy) {
      case 'jaccard':
        return this.jaccardSimilarity(a, b);
      case 'levenshtein':
        return this.levenshteinSimilarity(a, b);
      case 'cosine':
        return this.cosineSimilarity(a, b);
      default:
        return this.jaccardSimilarity(a, b);
    }
  }

  /**
   * Jaccard相似度（基于词集合）
   */
  private jaccardSimilarity(a: string, b: string): number {
    const wordsA = new Set(this.tokenize(a));
    const wordsB = new Set(this.tokenize(b));
    
    let intersection = 0;
    for (const word of wordsA) {
      if (wordsB.has(word)) {
        intersection++;
      }
    }
    
    const union = wordsA.size + wordsB.size - intersection;
    return union === 0 ? 1.0 : intersection / union;
  }

  /**
   * Levenshtein距离相似度
   */
  private levenshteinSimilarity(a: string, b: string): number {
    const distance = this.levenshteinDistance(a, b);
    const maxLen = Math.max(a.length, b.length);
    return maxLen === 0 ? 1.0 : 1 - (distance / maxLen);
  }

  /**
   * 余弦相似度（基于词频）
   */
  private cosineSimilarity(a: string, b: string): number {
    const tokensA = this.tokenize(a);
    const tokensB = this.tokenize(b);
    
    const freqA = new Map<string, number>();
    const freqB = new Map<string, number>();
    
    for (const token of tokensA) {
      freqA.set(token, (freqA.get(token) || 0) + 1);
    }
    for (const token of tokensB) {
      freqB.set(token, (freqB.get(token) || 0) + 1);
    }
    
    // 获取所有唯一词汇
    const allTokens = new Set([...tokensA, ...tokensB]);
    
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;
    
    for (const token of allTokens) {
      const fa = freqA.get(token) || 0;
      const fb = freqB.get(token) || 0;
      dotProduct += fa * fb;
      magA += fa * fa;
      magB += fb * fb;
    }
    
    if (magA === 0 || magB === 0) {
      return 0;
    }
    
    return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  /**
   * 简单分词
   */
  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 0);
  }

  /**
   * Levenshtein距离计算
   * Optimized version using 1D array to reduce memory allocation
   * Space complexity: O(min(n,m)) instead of O(n*m)
   */
  private levenshteinDistance(a: string, b: string): number {
    // Ensure a is the shorter string to minimize array size
    if (a.length > b.length) {
      [a, b] = [b, a];
    }

    let row = Array.from({ length: a.length + 1 }, (_, i) => i);
    
    for (let i = 1; i <= b.length; i++) {
      let prev = row[0];
      row[0] = i;
      
      for (let j = 1; j <= a.length; j++) {
        const curr = row[j];
        const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
        
        if (cost === 0) {
          row[j] = prev;
        } else {
          row[j] = Math.min(
            prev + cost,
            row[j - 1] + 1,
            curr + 1
          );
        }
        
        prev = curr;
      }
    }

    return row[a.length];
  }

  /**
   * 获取当前阈值
   */
  getPassThreshold(): number {
    return this.passThreshold;
  }

  /**
   * 设置通过阈值
   */
  setPassThreshold(threshold: number): void {
    this.passThreshold = Math.max(0, Math.min(1, threshold));
  }

  /**
   * 获取默认采样次数
   */
  getDefaultSamples(): number {
    return this.defaultSamples;
  }
}
