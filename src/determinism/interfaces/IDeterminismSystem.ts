/**
 * 知识来源引用
 */
export interface SourceReference {
  /**
   * 来源标识符（如法条编号、文档ID等）
   */
  id: string;
  /**
   * 来源内容片段
   */
  content?: string;
  /**
   * 来源类型
   */
  type: 'document' | 'law' | 'knowledge-base' | 'web';
  /**
   * 可信度评分 (0-1)
   */
  confidence: number;
  /**
   * 元数据（可选，用于扩展）
   */
  metadata?: Record<string, unknown>;
}

/**
 * 确定性验证结果
 */
export interface DeterminismResult {
  /**
   * 是否通过验证
   */
  verified: boolean;
  /**
   * 置信度评分 (0-1)
   */
  confidence: number;
  /**
   * 溯源的知识来源列表
   */
  sources: SourceReference[];
  /**
   * 幻觉风险评分 (0-1)，越高风险越大
   */
  hallucinationRisk: number;
  /**
   * 自一致性评分 (0-1)，越高越一致
   */
  consistencyScore: number;
  /**
   * 验证消息（可选，用于解释验证失败原因）
   */
  message?: string;
}

/**
 * 确定性系统配置选项
 */
export interface DeterminismOptions {
  /**
   * 验证方法
   * - wfgy: WFGY符号层验证
   * - rule-based: 基于规则的验证
   * - hybrid: 混合验证
   */
  verification: 'wfgy' | 'rule-based' | 'hybrid';
  /**
   * 是否启用自一致性检查
   */
  consistency: boolean;
  /**
   * 一致性采样次数，默认3次
   */
  consistencySamples?: number;
  /**
   * 是否启用知识溯源
   */
  traceSource: boolean;
  /**
   * 幻觉检测阈值，默认0.8，超过该阈值标记为高风险
   */
  hallucinationThreshold?: number;
}

/**
 * 确定性系统接口
 * 所有确定性验证组件都必须实现此接口
 */
export interface IDeterminismSystem {
  /**
   * 系统名称
   */
  readonly name: string;

  /**
   * 系统版本
   */
  readonly version: string;

  /**
   * 对输出内容进行验证
   * @param content 需要验证的内容
   * @param options 验证选项
   * @returns 验证结果
   */
  verify(content: string, options?: Partial<DeterminismOptions>): Promise<DeterminismResult>;

  /**
   * 检查系统是否就绪
   */
  isReady(): boolean;
}

/**
 * WFGY符号层验证结果
 */
export interface WFGYVerificationResult {
  /**
   * 是否通过符号层验证
   */
  valid: boolean;
  /**
   * 匹配到的符号规则数量
   */
  matchedRules: number;
  /**
   * 违反的符号规则数量
   */
  violatedRules: number;
  /**
   * 符号一致性评分 (0-1)
   */
  symbolConsistency: number;
  /**
   * 验证细节
   */
  details: Array<{
    rule: string;
    passed: boolean;
    message?: string;
  }>;
}

/**
 * 自一致性检查结果
 */
export interface SelfConsistencyResult {
  /**
   * 一致性评分 (0-1)
   */
  score: number;
  /**
   * 各采样路径之间的一致性详情
   */
  details: Array<{
    pathId: number;
    content: string;
    similarity: number;
  }>;
  /**
   * 是否通过一致性检查（得分超过阈值）
   */
  passed: boolean;
}

/**
 * 幻觉检测结果
 */
export interface HallucinationDetectionResult {
  /**
   * 幻觉风险评分 (0-1)
   */
  riskScore: number;
  /**
   * 检测到的疑似幻觉片段
   */
  suspectedSegments: Array<{
    text: string;
    startIndex: number;
    endIndex: number;
    confidence: number;
  }>;
  /**
   * 是否超过风险阈值
   */
  isHighRisk: boolean;
}

/**
 * 知识溯源查询结果
 */
export interface SourceTraceResult {
  /**
   * 找到的来源列表
   */
  sources: SourceReference[];
  /**
   * 查询覆盖度 (0-1)，表示内容中可溯源的比例
   */
  coverage: number;
  /**
   * 平均置信度
   */
  averageConfidence: number;
}
