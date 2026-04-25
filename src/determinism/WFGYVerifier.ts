import {
  IDeterminismSystem,
  DeterminismResult,
  DeterminismOptions,
  WFGYVerificationResult,
  SourceReference
} from './interfaces/IDeterminismSystem';

/**
 * WFGY符号规则定义
 */
export interface WFGYRule {
  /**
   * 规则ID
   */
  id: string;
  /**
   * 规则名称
   */
  name: string;
  /**
   * 规则描述
   */
  description: string;
  /**
   * 匹配模式（正则表达式或函数）
   */
  pattern: RegExp | ((content: string) => boolean);
  /**
   * 期望结果：true表示应该匹配，false表示不应该匹配
   */
  expected: boolean;
  /**
   * 规则权重 (0-1)，默认1.0
   */
  weight?: number;
  /**
   * 违规消息
   */
  violationMessage?: string;
}

/**
 * WFGY符号层知识库条目
 */
export interface WFGYKnowledgeEntry {
  /**
   * 符号标识符
   */
  symbol: string;
  /**
   * 符号含义
   */
  meaning: string;
  /**
   * 允许的上下文
   */
  allowedContexts: string[];
  /**
   * 禁止的上下文
   */
  forbiddenContexts?: string[];
  /**
   * 参考来源
   */
  source: SourceReference;
}

/**
 * WFGYVerifier配置选项
 */
export interface WFGYVerifierConfig {
  /**
   * 符号规则列表
   */
  rules?: WFGYRule[];
  /**
   * 知识库条目
   */
  knowledgeBase?: WFGYKnowledgeEntry[];
  /**
   * 最低通过分数 (0-1)，默认0.7
   */
  minimumScore?: number;
}

/**
 * WFGY (Whole Field Grammar Yielding) 符号层验证器
 * 基于符号规则和知识库对输出进行验证，防止模型输出不符合符号规范的内容
 */
export class WFGYVerifier implements IDeterminismSystem {
  public readonly name: string = 'WFGYVerifier';
  public readonly version: string = '1.0.0';

  private rules: WFGYRule[];
  private knowledgeBase: Map<string, WFGYKnowledgeEntry>;
  private minimumScore: number;
  private symbolRegex: RegExp | null = null;
  private ready: boolean = false;

  constructor(config?: WFGYVerifierConfig) {
    this.rules = config?.rules || [];
    this.knowledgeBase = new Map();

    if (config?.knowledgeBase) {
      for (const entry of config.knowledgeBase) {
        this.knowledgeBase.set(entry.symbol, entry);
      }
    }

    this.minimumScore = config?.minimumScore ?? 0.7;
    this.symbolRegex = null;

    // 归一化规则权重，确保总和为 1
    this.normalizeWeights();

    this.ready = true;
  }

  /**
   * 归一化所有规则的权重，确保权重总和为 1
   * 如果没有规则或所有权重为 0，则每个规则的权重设置为 1/rules.length
   */
  private normalizeWeights(): void {
    if (this.rules.length === 0) {
      return;
    }

    const totalWeight = this.rules.reduce((sum, rule) => sum + (rule.weight ?? 1.0), 0);

    if (totalWeight === 0) {
      const equalWeight = 1.0 / this.rules.length;
      for (const rule of this.rules) {
        rule.weight = equalWeight;
      }
    } else if (Math.abs(totalWeight - 1.0) > 0.0001) {
      for (const rule of this.rules) {
        rule.weight = (rule.weight ?? 1.0) / totalWeight;
      }
    }
  }

  /**
   * 添加符号规则
   * @param rule 符号规则
   */
  addRule(rule: WFGYRule): void {
    this.rules.push(rule);
    this.normalizeWeights();
  }

  /**
   * 移除符号规则
   * @param ruleId 规则ID
   */
  removeRule(ruleId: string): boolean {
    const initialLength = this.rules.length;
    this.rules = this.rules.filter(r => r.id !== ruleId);
    const removed = this.rules.length < initialLength;
    if (removed) {
      this.normalizeWeights();
    }
    return removed;
  }

  /**
   * 添加知识库条目
   * @param entry 知识库条目
   */
  addKnowledgeEntry(entry: WFGYKnowledgeEntry): void {
    this.knowledgeBase.set(entry.symbol, entry);
    this.symbolRegex = null; // Invalidate regex cache
  }

  /**
   * 移除知识库条目
   * @param symbol 符号
   */
  removeKnowledgeEntry(symbol: string): boolean {
    const deleted = this.knowledgeBase.delete(symbol);
    if (deleted) {
      this.symbolRegex = null; // Invalidate regex cache
    }
    return deleted;
  }

  /**
   * 检查验证器是否就绪
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * 对内容执行完整验证
   * @param content 需要验证的内容
   * @param options 验证选项
   */
  async verify(content: string | null | undefined, options?: Partial<DeterminismOptions>): Promise<DeterminismResult> {
    const wfgyResult = this.verifySymbols(content);
    
    // 从知识库匹配来源
    const sources: SourceReference[] = [];
    if (content != null) {
      const symbolsFound = this.extractSymbols(String(content));
      for (const symbol of symbolsFound) {
        const entry = this.knowledgeBase.get(symbol);
        if (entry?.source) {
          sources.push(entry.source);
        }
      }
    }

    return {
      verified: wfgyResult.symbolConsistency >= this.minimumScore && wfgyResult.valid,
      confidence: wfgyResult.symbolConsistency,
      sources,
      hallucinationRisk: 1 - wfgyResult.symbolConsistency,
      consistencyScore: wfgyResult.symbolConsistency,
      message: this.buildVerificationMessage(wfgyResult)
    };
  }

  /**
   * 执行符号层验证
   * @param content 需要验证的内容
   */
  verifySymbols(content: string | null | undefined): WFGYVerificationResult {
    // Defensive check for null/undefined
    if (content == null) {
      return {
        valid: false,
        matchedRules: 0,
        violatedRules: this.rules.length > 0 ? this.rules.length : 1,
        symbolConsistency: 0,
        details: [{
          rule: 'null-content',
          passed: false,
          message: 'Content cannot be null or undefined'
        }]
      };
    }

    const contentStr = String(content);

    if (this.rules.length === 0) {
      return {
        valid: true,
        matchedRules: 0,
        violatedRules: 0,
        symbolConsistency: 1.0,
        details: []
      };
    }

    let matchedRules = 0;
    let violatedRules = 0;
    let totalWeight = 0;
    let passedWeight = 0;
    const details: WFGYVerificationResult['details'] = [];

    for (const rule of this.rules) {
      const weight = rule.weight ?? 1.0;
      totalWeight += weight;

      let matched: boolean;
      if (typeof rule.pattern === 'function') {
        matched = rule.pattern(contentStr);
      } else {
        matched = rule.pattern.test(contentStr);
      }

      if (matched === rule.expected) {
        matchedRules++;
        passedWeight += weight;
        details.push({
          rule: rule.id,
          passed: true
        });
      } else {
        violatedRules++;
        details.push({
          rule: rule.id,
          passed: false,
          message: rule.violationMessage
        });
      }
    }

    const symbolConsistency = totalWeight > 0 ? passedWeight / totalWeight : 1.0;
    const valid = symbolConsistency >= this.minimumScore && violatedRules === 0;

    return {
      valid,
      matchedRules,
      violatedRules,
      symbolConsistency,
      details
    };
  }

  /**
   * 从内容中提取已知符号
   * @param content 内容
   */
  private extractSymbols(content: string): string[] {
    if (this.knowledgeBase.size === 0) {
      return [];
    }

    // Lazy compile regex matching all symbols
    if (!this.symbolRegex) {
      const symbols = Array.from(this.knowledgeBase.keys())
        .map(s => s.replace(/[.*+?^${}(\[\])\\|]/g, '\\$&')) // Escape regex special chars
        .join('|');
      this.symbolRegex = new RegExp(symbols, 'g');
    }

    const matches = content.match(this.symbolRegex) || [];
    // Deduplicate and return
    return Array.from(new Set(matches));
  }

  /**
   * 构建验证结果消息
   */
  private buildVerificationMessage(result: WFGYVerificationResult): string {
    if (result.valid) {
      return `WFGY验证通过，${result.matchedRules} 条规则匹配，一致性 ${(result.symbolConsistency * 100).toFixed(1)}%`;
    } else {
      return `WFGY验证失败，${result.violatedRules} 条规则违反，一致性 ${(result.symbolConsistency * 100).toFixed(1)}%`;
    }
  }

  /**
   * 获取当前所有规则
   */
  getRules(): WFGYRule[] {
    return [...this.rules];
  }

  /**
   * 获取知识库大小
   */
  getKnowledgeBaseSize(): number {
    return this.knowledgeBase.size;
  }
}
