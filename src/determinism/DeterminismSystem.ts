import {
  IDeterminismSystem,
  DeterminismResult,
  DeterminismOptions,
  WFGYVerificationResult,
  SelfConsistencyResult,
  SourceTraceResult,
  HallucinationDetectionResult,
  SourceReference
} from './interfaces/IDeterminismSystem';
import { WFGYVerifier } from './WFGYVerifier';
import { SelfConsistencyChecker } from './SelfConsistencyChecker';
import { SourceTracer } from './SourceTracer';
import { HallucinationDetector } from './HallucinationDetector';
import type { WFGYVerifierConfig, WFGYRule, WFGYKnowledgeEntry } from './WFGYVerifier';
import type { SelfConsistencyCheckerConfig } from './SelfConsistencyChecker';
import type { SourceTracerConfig, KnowledgeIndexEntry } from './SourceTracer';
import type { HallucinationDetectorConfig } from './HallucinationDetector';

/**
 * 确定性系统总配置
 */
export interface DeterminismSystemConfig {
  /**
   * WFGY验证器配置
   */
  wfgy?: WFGYVerifierConfig;
  /**
   * 自一致性检查器配置
   */
  consistency?: SelfConsistencyCheckerConfig;
  /**
   * 溯源器配置
   */
  sourceTrace?: SourceTracerConfig;
  /**
   * 幻觉检测器配置
   */
  hallucination?: HallucinationDetectorConfig;
}

/**
 * 综合确定性系统 - WFGY防幻觉系统主入口
 * 
 * 整合所有防幻觉组件：
 * - WFGY符号层验证：基于规则和知识库验证输出符号一致性
 * - 自一致性检查：多路径采样投票验证一致性
 * - 知识溯源：每个结论追溯知识来源
 * - 幻觉检测：综合评分判断幻觉风险
 */
export class DeterminismSystem implements IDeterminismSystem {
  public readonly name: string = 'DeterminismSystem';
  public readonly version: string = '1.0.0';

  public readonly wfgyVerifier: WFGYVerifier;
  public readonly consistencyChecker: SelfConsistencyChecker;
  public readonly sourceTracer: SourceTracer;
  public readonly hallucinationDetector: HallucinationDetector;

  private ready: boolean = true;

  constructor(config?: DeterminismSystemConfig) {
    this.wfgyVerifier = new WFGYVerifier(config?.wfgy);
    this.consistencyChecker = new SelfConsistencyChecker(config?.consistency);
    this.sourceTracer = new SourceTracer(config?.sourceTrace);
    this.hallucinationDetector = new HallucinationDetector(config?.hallucination);

    // 注入组件引用到幻觉检测器
    this.hallucinationDetector.setWFGYVerifier(this.wfgyVerifier);
    this.hallucinationDetector.setConsistencyChecker(this.consistencyChecker);
    this.hallucinationDetector.setSourceTracer(this.sourceTracer);
  }

  /**
   * 检查系统是否就绪
   */
  isReady(): boolean {
    return this.ready &&
      this.wfgyVerifier.isReady() &&
      this.consistencyChecker.isReady() &&
      this.sourceTracer.isReady() &&
      this.hallucinationDetector.isReady();
  }

  /**
   * 完整的确定性验证
   * @param content 需要验证的内容
   * @param options 验证选项
   * @param samples 可选的多路径采样结果（用于自一致性检查）
   */
  async verify(
    content: string | null | undefined,
    options?: Partial<DeterminismOptions>,
    samples?: (string | null | undefined)[]
  ): Promise<DeterminismResult> {
    return this.hallucinationDetector.verify(content, options, samples);
  }

  /**
   * 只执行WFGY符号层验证
   */
  verifySymbols(content: string | null | undefined): WFGYVerificationResult {
    return this.wfgyVerifier.verifySymbols(content);
  }

  /**
   * 只执行自一致性检查
   */
  checkConsistency(samples: (string | null | undefined)[]): SelfConsistencyResult {
    return this.consistencyChecker.checkConsistency(samples);
  }

  /**
   * 只执行知识溯源
   */
  trace(content: string | null | undefined): SourceTraceResult {
    return this.sourceTracer.trace(content);
  }

  /**
   * 只执行幻觉检测
   */
  detectHallucination(
    content: string | null | undefined,
    options?: Partial<DeterminismOptions>,
    samples?: (string | null | undefined)[]
  ): HallucinationDetectionResult {
    return this.hallucinationDetector.detect(content, options, samples);
  }

  // ===== 便捷方法：WFGY 操作 =====

  /**
   * 添加WFGY规则
   */
  addWFGYRule(rule: WFGYRule): void {
    this.wfgyVerifier.addRule(rule);
  }

  /**
   * 移除WFGY规则
   */
  removeWFGYRule(ruleId: string): boolean {
    return this.wfgyVerifier.removeRule(ruleId);
  }

  /**
   * 添加WFGY知识库条目
   */
  addWFGYKnowledge(entry: WFGYKnowledgeEntry): void {
    this.wfgyVerifier.addKnowledgeEntry(entry);
  }

  /**
   * 移除WFGY知识库条目
   */
  removeWFGYKnowledge(symbol: string): boolean {
    return this.wfgyVerifier.removeKnowledgeEntry(symbol);
  }

  /**
   * 获取所有WFGY规则
   */
  getWFGYRles(): WFGYRule[] {
    return this.wfgyVerifier.getRules();
  }

  // ===== 便捷方法：知识溯源 =====

  /**
   * 添加知识条目到溯源索引
   */
  addKnowledgeEntry(entry: KnowledgeIndexEntry): void {
    this.sourceTracer.addEntry(entry);
  }

  /**
   * 批量添加知识条目
   */
  addKnowledgeEntries(entries: KnowledgeIndexEntry[]): void {
    this.sourceTracer.addEntries(entries);
  }

  /**
   * 移除知识条目
   */
  removeKnowledgeEntry(id: string): boolean {
    return this.sourceTracer.removeEntry(id);
  }

  /**
   * 获取知识索引大小
   */
  getKnowledgeIndexSize(): number {
    return this.sourceTracer.getIndexSize();
  }

  /**
   * 清空知识索引
   */
  clearKnowledgeIndex(): void {
    this.sourceTracer.clearIndex();
  }

  // ===== 配置 =====

  /**
   * 设置幻觉检测阈值
   */
  setHallucinationThreshold(threshold: number): void {
    this.hallucinationDetector.setDefaultThreshold(threshold);
  }

  /**
   * 设置一致性通过阈值
   */
  setConsistencyThreshold(threshold: number): void {
    this.consistencyChecker.setPassThreshold(threshold);
  }
}
