import {
  IDeterminismSystem,
  DeterminismResult,
  DeterminismOptions,
  HallucinationDetectionResult
} from './interfaces/IDeterminismSystem';
import { WFGYVerifier } from './WFGYVerifier';
import { SelfConsistencyChecker } from './SelfConsistencyChecker';
import { SourceTracer } from './SourceTracer';

/**
 * 幻觉检测器配置
 */
export interface HallucinationDetectorConfig {
  /**
   * 默认风险阈值，默认0.8
   */
  defaultThreshold?: number;
  /**
   * 是否启用WFGY验证
   */
  enableWFGY?: boolean;
  /**
   * 是否启用自一致性检查
   */
  enableConsistency?: boolean;
  /**
   * 是否启用溯源检查
   */
  enableSourceTrace?: boolean;
  /**
   * 各检测器权重
   */
  weights?: {
    wfgy?: number;
    consistency?: number;
    sourceTrace?: number;
  };
}

/**
 * 综合幻觉检测器
 * 整合符号层验证、自一致性检查和知识溯源，综合判断幻觉风险
 */
export class HallucinationDetector implements IDeterminismSystem {
  public readonly name: string = 'HallucinationDetector';
  public readonly version: string = '1.0.0';

  private defaultThreshold: number;
  private enableWFGY: boolean;
  private enableConsistency: boolean;
  private enableSourceTrace: boolean;
  private weights: {
    wfgy: number;
    consistency: number;
    sourceTrace: number;
  };

  private wfgyVerifier?: WFGYVerifier;
  private consistencyChecker?: SelfConsistencyChecker;
  private sourceTracer?: SourceTracer;
  private ready: boolean = true;

  constructor(config?: HallucinationDetectorConfig) {
    this.defaultThreshold = config?.defaultThreshold ?? 0.8;
    this.enableWFGY = config?.enableWFGY ?? true;
    this.enableConsistency = config?.enableConsistency ?? true;
    this.enableSourceTrace = config?.enableSourceTrace ?? true;

    // 计算权重总和并归一化，确保权重和为 1
    const rawWfgy = config?.weights?.wfgy ?? 0.4;
    const rawConsistency = config?.weights?.consistency ?? 0.3;
    const rawSourceTrace = config?.weights?.sourceTrace ?? 0.3;
    const totalRawWeight = rawWfgy + rawConsistency + rawSourceTrace;

    if (totalRawWeight > 0) {
      this.weights = {
        wfgy: rawWfgy / totalRawWeight,
        consistency: rawConsistency / totalRawWeight,
        sourceTrace: rawSourceTrace / totalRawWeight
      };
    } else {
      // 权重总和为 0 时使用默认权重
      this.weights = { wfgy: 0.4, consistency: 0.3, sourceTrace: 0.3 };
    }
  }

  /**
   * 设置WFGY验证器
   */
  setWFGYVerifier(verifier: WFGYVerifier): void {
    this.wfgyVerifier = verifier;
  }

  /**
   * 设置自一致性检查器
   */
  setConsistencyChecker(checker: SelfConsistencyChecker): void {
    this.consistencyChecker = checker;
  }

  /**
   * 设置溯源器
   */
  setSourceTracer(tracer: SourceTracer): void {
    this.sourceTracer = tracer;
  }

  /**
   * 获取WFGY验证器
   */
  getWFGYVerifier(): WFGYVerifier | undefined {
    return this.wfgyVerifier;
  }

  /**
   * 获取自一致性检查器
   */
  getConsistencyChecker(): SelfConsistencyChecker | undefined {
    return this.consistencyChecker;
  }

  /**
   * 获取溯源器
   */
  getSourceTracer(): SourceTracer | undefined {
    return this.sourceTracer;
  }

  /**
   * 检查检测器是否就绪
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * 综合验证内容，判断是否存在幻觉
   * @param content 需要检测的内容
   * @param samples 可选的多路径采样结果，用于自一致性检查
   */
  async verify(
    content: string | null | undefined,
    options?: Partial<DeterminismOptions>,
    samples?: (string | null | undefined)[]
  ): Promise<DeterminismResult> {
    const detectionResult = this.detect(content, options, samples);
    
    const threshold = options?.hallucinationThreshold ?? this.defaultThreshold;
    const isHighRisk = detectionResult.isHighRisk;
    
    return {
      verified: !isHighRisk,
      confidence: 1 - detectionResult.riskScore,
      sources: [],
      hallucinationRisk: detectionResult.riskScore,
      consistencyScore: 1 - detectionResult.riskScore,
      message: `幻觉检测完成，风险评分 ${(detectionResult.riskScore * 100).toFixed(1)}%，${isHighRisk ? '高风险' : '低风险'}`
    };
  }

  /**
   * 执行幻觉检测
   * @param content 需要检测的内容
   * @param options 检测选项
   * @param samples 多路径样本
   */
  detect(
    content: string | null | undefined,
    options?: Partial<DeterminismOptions>,
    samples?: (string | null | undefined)[]
  ): HallucinationDetectionResult {
    // Handle null/undefined content
    if (content == null) {
      return {
        riskScore: 1.0,
        suspectedSegments: [],
        isHighRisk: true
      };
    }
    
    let totalWeight = 0;
    let weightedScore = 0;
    const suspectedSegments: HallucinationDetectionResult['suspectedSegments'] = [];

    // WFGY符号层检测
    if (this.enableWFGY && this.wfgyVerifier) {
      const wfgyResult = this.wfgyVerifier.verifySymbols(content);
      const score = 1 - wfgyResult.symbolConsistency;
      const weight = this.weights.wfgy;
      weightedScore += score * weight;
      totalWeight += weight;

      // 添加违规片段作为疑似幻觉
      if (wfgyResult.details) {
        for (const detail of wfgyResult.details) {
          if (!detail.passed) {
            suspectedSegments.push({
              text: detail.message || detail.rule,
              startIndex: 0,
              endIndex: content.length,
              confidence: 1 - wfgyResult.symbolConsistency
            });
          }
        }
      }
    }

    // 自一致性检测
    if (this.enableConsistency && this.consistencyChecker && samples && samples.length >= 2) {
      const consistencyResult = this.consistencyChecker.checkConsistency(samples);
      const score = 1 - consistencyResult.score;
      const weight = this.weights.consistency;
      weightedScore += score * weight;
      totalWeight += weight;
    }

    // 知识溯源检测
    if (this.enableSourceTrace && this.sourceTracer) {
      const traceResult = this.sourceTracer.trace(content);
      const score = 1 - traceResult.coverage;
      const weight = this.weights.sourceTrace;
      weightedScore += score * weight;
      totalWeight += weight;
    }

    // 如果没有启用任何检测器，返回零风险
    if (totalWeight === 0) {
      return {
        riskScore: 0,
        suspectedSegments: [],
        isHighRisk: false
      };
    }

    const riskScore = weightedScore / totalWeight;
    const threshold = options?.hallucinationThreshold ?? this.defaultThreshold;
    const isHighRisk = riskScore >= threshold;

    // 如果高风险，尝试分割文本找出疑似片段
    if (isHighRisk && suspectedSegments.length === 0 && this.sourceTracer) {
      this.findSuspectedSegments(content, suspectedSegments, this.sourceTracer, riskScore);
    }

    return {
      riskScore,
      suspectedSegments,
      isHighRisk
    };
  }

  /**
   * 分段查找疑似幻觉片段
   */
  private findSuspectedSegments(
    content: string,
    suspectedSegments: HallucinationDetectionResult['suspectedSegments'],
    tracer: SourceTracer,
    overallRisk: number
  ): void {
    // 按句子分割
    const sentences = content.split(/(?<=[。.!？!?；;])/g).filter(s => s.trim().length > 10);
    
    let currentIndex = 0;
    for (const sentence of sentences) {
      const startIndex = content.indexOf(sentence, currentIndex);
      if (startIndex === -1) continue;
      
      const endIndex = startIndex + sentence.length;
      const traceResult = tracer.trace(sentence);
      const sentenceRisk = 1 - traceResult.coverage;
      
      // 如果该句子风险高于平均，标记为疑似
      if (sentenceRisk > overallRisk && sentenceRisk > 0.5) {
        suspectedSegments.push({
          text: sentence.trim(),
          startIndex,
          endIndex,
          confidence: sentenceRisk
        });
      }
      
      currentIndex = endIndex;
    }
  }

  /**
   * 设置检测阈值
   */
  setDefaultThreshold(threshold: number): void {
    this.defaultThreshold = Math.max(0, Math.min(1, threshold));
  }

  /**
   * 获取当前默认阈值
   */
  getDefaultThreshold(): number {
    return this.defaultThreshold;
  }
}
