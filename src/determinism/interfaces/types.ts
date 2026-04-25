/**
 * @description 公共类型定义
 */

/**
 * 扩展SkillExecutionOptions以支持确定性验证选项
 * 
 * 使用示例：
 * ```typescript
 * import type { DeterminismOptions } from './modules/determinism';
 * 
 * interface SkillExecutionOptions {
 *   // ... 原有字段
 *   determinism?: Partial<DeterminismOptions>;
 * }
 * ```
 */
export * from './IDeterminismSystem';
