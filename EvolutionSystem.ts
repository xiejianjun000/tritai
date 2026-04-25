/**
 * EvolutionSystem.ts
 * 进化系统核心实现
 * 
 * @author 昆仑框架团队
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  IEvolutionSystem,
  EvolutionTask,
  EvolutionType,
  EvolutionState,
  EvolutionSystemConfig,
  EvolutionEvaluation,
  EvolutionSystemEvent,
  EvolutionOpportunity,
  EvolutionTrigger
} from '../../core/interfaces/IEvolutionSystem';

import { SkillSystem } from '../skill-system/SkillSystem';
import { MemorySystem } from '../memory-system/MemorySystem';
import { PersonalitySystem } from '../personality-system/PersonalitySystem';

import { SelfAwarenessStrategy } from './strategies/SelfAwarenessStrategy';
import { SkillOptimizationStrategy } from './strategies/SkillOptimizationStrategy';
import { ModelImprovementStrategy } from './strategies/ModelImprovementStrategy';
import { PersonalityEvolutionStrategy } from './strategies/PersonalityEvolutionStrategy';
import { MemoryOptimizationStrategy } from './strategies/MemoryOptimizationStrategy';

import { EvolutionSandbox } from './sandbox/EvolutionSandbox';

/**
 * 进化系统实现
 */
export class EvolutionSystem extends EventEmitter implements IEvolutionSystem {
  /** 系统配置 */
  private config: EvolutionSystemConfig;
  
  /** 进化任务映射 */
  private tasks: Map<string, EvolutionTask> = new Map();
  
  /** 进化策略映射 */
  private strategies: Map<EvolutionType, any> = new Map();
  
  /** 进化沙箱 */
  private sandbox: EvolutionSandbox;
  
  /** 关联的系统 */
  private skillSystem: SkillSystem | null = null;
  private memorySystem: MemorySystem | null = null;
  private personalitySystem: PersonalitySystem | null = null;
  
  /** 自动进化定时器 */
  private autoEvolutionTimer: NodeJS.Timeout | null = null;
  
  /** 初始化状态 */
  private initialized: boolean = false;

  /**
   * 构造函数
   */
  constructor() {
    super();
    this.config = {
      autoEvolutionInterval: 24 * 60 * 60 * 1000, // 每天一次
      thresholds: {
        performanceScore: 0.6,
        userSatisfaction: 0.5,
        errorRate: 0.3,
        skillUsage: 0.1
      },
      sandboxConfig: {
        enabled: true,
        timeout: 300000, // 5分钟
        resources: {
          memory: '256MB',
          cpu: '50%',
          storage: '1GB'
        }
      },
      rollbackConfig: {
        enabled: true,
        retentionDays: 7,
        maxSnapshots: 10
      },
      auditConfig: {
        enabled: true,
        logLevel: 'info',
        retentionDays: 30
      },
      strategies: {
        [EvolutionType.SELF_AWARENESS]: {
          enabled: true,
          priority: 1,
          maxIterations: 5
        },
        [EvolutionType.SKILL_OPTIMIZATION]: {
          enabled: true,
          priority: 2,
          maxIterations: 10
        },
        [EvolutionType.MODEL_IMPROVEMENT]: {
          enabled: false,
          priority: 3,
          maxIterations: 3
        },
        [EvolutionType.PERSONALITY_EVOLUTION]: {
          enabled: true,
          priority: 2,
          maxIterations: 5
        },
        [EvolutionType.MEMORY_OPTIMIZATION]: {
          enabled: true,
          priority: 1,
          maxIterations: 10
        }
      }
    };
    
    this.sandbox = new EvolutionSandbox();
  }

  /**
   * 初始化进化系统
   * @param config 系统配置
   */
  async initialize(config: EvolutionSystemConfig): Promise<void> {
    this.config = config;

    // 初始化沙箱
    if (config.sandboxConfig.enabled) {
      await this.sandbox.initialize(config.sandboxConfig);
    }

    // 注册进化策略
    this.registerStrategies();

    // 设置自动进化
    if (config.autoEvolutionInterval > 0) {
      this.autoEvolutionTimer = setInterval(
        () => this.autoEvolve(),
        config.autoEvolutionInterval
      );
    }

    this.initialized = true;
    console.log('[EvolutionSystem] Initialized successfully');
  }

  /**
   * 注册进化策略
   */
  private registerStrategies(): void {
    this.strategies.set(
      EvolutionType.SELF_AWARENESS,
      new SelfAwarenessStrategy()
    );
    this.strategies.set(
      EvolutionType.SKILL_OPTIMIZATION,
      new SkillOptimizationStrategy()
    );
    this.strategies.set(
      EvolutionType.MODEL_IMPROVEMENT,
      new ModelImprovementStrategy()
    );
    this.strategies.set(
      EvolutionType.PERSONALITY_EVOLUTION,
      new PersonalityEvolutionStrategy()
    );
    this.strategies.set(
      EvolutionType.MEMORY_OPTIMIZATION,
      new MemoryOptimizationStrategy()
    );
  }

  /**
   * 关联其他系统
   */
  setAssociatedSystems(
    skillSystem: SkillSystem,
    memorySystem: MemorySystem,
    personalitySystem: PersonalitySystem
  ): void {
    this.skillSystem = skillSystem;
    this.memorySystem = memorySystem;
    this.personalitySystem = personalitySystem;
  }

  /**
   * 获取进化策略
   */
  private getStrategy(type: EvolutionType): any {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      throw new Error(`No evolution strategy found for type: ${type}`);
    }
    return strategy;
  }

  /**
   * 确保系统已初始化
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('EvolutionSystem has not been initialized. Call initialize() first.');
    }
  }

  /**
   * 创建进化任务
   * @param task 进化任务
   * @returns 任务ID
   */
  async createTask(
    task: Omit<EvolutionTask, 'id' | 'state' | 'progress'>
  ): Promise<string> {
    this.ensureInitialized();

    // 创建任务ID
    const id = `evolution_${uuidv4()}`;

    // 创建完整的进化任务
    const evolutionTask: EvolutionTask = {
      id,
      state: EvolutionState.PENDING,
      progress: 0,
      createdAt: new Date(),
      ...task
    };

    // 存储任务
    this.tasks.set(id, evolutionTask);

    // 触发事件
    this.emit(EvolutionSystemEvent.TASK_CREATED, { task: evolutionTask });

    return id;
  }

  /**
   * 批量创建进化任务
   * @param tasks 进化任务列表
   * @returns 任务ID列表
   */
  async batchCreateTasks(
    tasks: Omit<EvolutionTask, 'id' | 'state' | 'progress'>[]
  ): Promise<string[]> {
    this.ensureInitialized();

    const ids: string[] = [];
    const createdTasks: EvolutionTask[] = [];

    for (const task of tasks) {
      const id = await this.createTask(task);
      ids.push(id);
      createdTasks.push(this.tasks.get(id)!);
    }

    // 批量触发事件
    this.emit(EvolutionSystemEvent.TASK_CREATED, { tasks: createdTasks });

    return ids;
  }

  /**
   * 获取进化任务
   * @param taskId 任务ID
   */
  async getTask(taskId: string): Promise<EvolutionTask | null> {
    this.ensureInitialized();

    return this.tasks.get(taskId) || null;
  }

  /**
   * 获取进化任务列表
   * @param filter 过滤条件
   */
  async getTasks(filter?: {
    type?: EvolutionType;
    state?: EvolutionState;
    userId?: string;
    tenantId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<EvolutionTask[]> {
    this.ensureInitialized();

    let tasks = Array.from(this.tasks.values());

    // 应用过滤条件
    if (filter) {
      if (filter.type) {
        tasks = tasks.filter(t => t.type === filter.type);
      }
      if (filter.state) {
        tasks = tasks.filter(t => t.state === filter.state);
      }
      if (filter.userId) {
        tasks = tasks.filter(t => t.userId === filter.userId);
      }
      if (filter.tenantId) {
        tasks = tasks.filter(t => t.tenantId === filter.tenantId);
      }
      if (filter.fromDate) {
        tasks = tasks.filter(
          t => new Date(t.createdAt) >= filter.fromDate
        );
      }
      if (filter.toDate) {
        tasks = tasks.filter(
          t => new Date(t.createdAt) <= filter.toDate
        );
      }
    }

    // 按创建时间排序
    tasks.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return tasks;
  }

  /**
   * 启动进化任务
   * @param taskId 任务ID
   */
  async startTask(taskId: string): Promise<void> {
    this.ensureInitialized();

    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Evolution task not found: ${taskId}`);
    }

    if (task.state !== EvolutionState.PENDING) {
      throw new Error(`Cannot start task in state: ${task.state}`);
    }

    // 更新任务状态
    task.state = EvolutionState.RUNNING;
    task.startedAt = new Date();
    task.progress = 0;

    this.tasks.set(taskId, task);

    // 触发事件
    this.emit(EvolutionSystemEvent.TASK_STARTED, { task });

    // 异步执行进化任务
    this.executeTask(task).then(() => {
      // 任务完成
      task.state = EvolutionState.COMPLETED;
      task.completedAt = new Date();
      task.progress = 100;
      
      this.tasks.set(taskId, task);
      this.emit(EvolutionSystemEvent.TASK_COMPLETED, { task });
    }).catch((error) => {
      // 任务失败
      task.state = EvolutionState.FAILED;
      task.completedAt = new Date();
      task.error = error.message;
      
      this.tasks.set(taskId, task);
      this.emit(EvolutionSystemEvent.TASK_FAILED, { task, error });
    });
  }

  /**
   * 执行进化任务
   */
  private async executeTask(task: EvolutionTask): Promise<void> {
    try {
      // 获取进化策略
      const strategy = this.getStrategy(task.type);

      // 执行进化
      const evaluation = await strategy.execute(task);

      // 应用进化结果
      if (this.config.sandboxConfig.enabled) {
        await this.applyEvolutionInSandbox(task, evaluation);
      } else {
        await this.applyEvolutionDirectly(task, evaluation);
      }

      // 记录进化结果
      task.result = {
        changes: {},
        metrics: {
          score: evaluation.score
        },
        recommendations: evaluation.recommendations
      };

    } catch (error) {
      console.error(`[EvolutionSystem] Task execution failed:`, error);
      throw error;
    }
  }

  /**
   * 在沙箱中应用进化
   */
  private async applyEvolutionInSandbox(
    task: EvolutionTask,
    evaluation: EvolutionEvaluation
  ): Promise<void> {
    if (!this.config.sandboxConfig.enabled) {
      await this.applyEvolutionDirectly(task, evaluation);
      return;
    }

    // 创建沙箱环境
    const sandboxId = await this.sandbox.create();

    try {
      // 在沙箱中应用进化
      const result = await this.sandbox.execute(
        sandboxId,
        async () => {
          return this.applyEvolutionDirectly(task, evaluation);
        }
      );

      // 验证结果
      if (result.success) {
        // 应用到生产环境
        await this.applyEvolutionDirectly(task, evaluation);
        this.emit(EvolutionSystemEvent.EVOLUTION_APPLIED, { task, evaluation });
      } else {
        throw new Error('Evolution failed in sandbox validation');
      }
    } finally {
      // 销毁沙箱
      await this.sandbox.destroy(sandboxId);
    }
  }

  /**
   * 直接应用进化（无沙箱）
   */
  private async applyEvolutionDirectly(
    task: EvolutionTask,
    evaluation: EvolutionEvaluation
  ): Promise<any> {
    // 根据进化类型应用不同的逻辑
    switch (task.type) {
      case EvolutionType.SKILL_OPTIMIZATION:
        // 应用技能优化
        break;
      case EvolutionType.PERSONALITY_EVOLUTION:
        // 应用人格进化
        break;
      case EvolutionType.MEMORY_OPTIMIZATION:
        // 应用记忆优化
        break;
      case EvolutionType.SELF_AWARENESS:
        // 应用自省进化
        break;
    }

    return { success: true };
  }

  /**
   * 停止进化任务
   * @param taskId 任务ID
   */
  async stopTask(taskId: string): Promise<void> {
    this.ensureInitialized();

    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Evolution task not found: ${taskId}`);
    }

    if (task.state !== EvolutionState.RUNNING) {
      throw new Error(`Cannot stop task in state: ${task.state}`);
    }

    task.state = EvolutionState.CANCELLED;
    task.completedAt = new Date();
    
    this.tasks.set(taskId, task);
    this.emit(EvolutionSystemEvent.TASK_COMPLETED, { task });
  }

  /**
   * 删除进化任务
   * @param taskId 任务ID
   */
  async deleteTask(taskId: string): Promise<void> {
    this.ensureInitialized();

    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    // 如果任务正在运行，先停止
    if (task.state === EvolutionState.RUNNING) {
      await this.stopTask(taskId);
    }

    this.tasks.delete(taskId);
  }

  /**
   * 执行进化
   * @param type 进化类型
   * @param options 进化选项
   */
  async evolve(
    type: EvolutionType,
    options?: {
      userId?: string;
      tenantId?: string;
      inputData?: any;
      parameters?: Record<string, any>;
    }
  ): Promise<EvolutionEvaluation> {
    this.ensureInitialized();

    // 创建临时任务
    const task: EvolutionTask = {
      id: `temp_${uuidv4()}`,
      type,
      userId: options?.userId,
      tenantId: options?.tenantId,
      priority: 0.5,
      confidence: 0.8,
      createdAt: new Date(),
      startedAt: new Date(),
      completedAt: new Date(),
      state: EvolutionState.RUNNING,
      progress: 100,
      goal: `Evolution of type: ${type}`,
      inputData: options?.inputData || {},
      parameters: options?.parameters || {}
    };

    try {
      // 获取进化策略
      const strategy = this.getStrategy(type);

      // 执行进化
      const evaluation = await strategy.execute(task);

      // 应用进化结果
      await this.applyEvolutionDirectly(task, evaluation);

      return evaluation;
    } catch (error) {
      task.state = EvolutionState.FAILED;
      task.error = error.message;
      throw error;
    }
  }

  /**
   * 评估进化需求
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async evaluateEvolutionNeeds(
    userId?: string,
    tenantId?: string
  ): Promise<EvolutionEvaluation> {
    this.ensureInitialized();

    const opportunities: EvolutionOpportunity[] = [];
    const recommendations: string[] = [];

    // 遍历所有策略评估进化机会
    for (const strategy of this.strategies.values()) {
      const strategyOpportunities = await strategy.evaluate({
        userId,
        tenantId
      });
      opportunities.push(...strategyOpportunities);
    }

    // 按优先级排序
    opportunities.sort((a, b) => b.priority - a.priority);

    // 生成推荐
    const topOpportunities = opportunities.slice(0, 3);
    if (topOpportunities.length > 0) {
      recommendations.push('建议优先实施以下进化:');
      topOpportunities.forEach((opp, index) => {
        recommendations.push(`${index + 1}. ${opp.description} - 预期收益: ${opp.expectedGain}`);
      });
    }

    // 计算综合分数
    const score = opportunities.length > 0
      ? opportunities.reduce((sum, opp) => sum + opp.expectedGain, 0) / opportunities.length
      : 0;

    return {
      score,
      recommendations,
      opportunities,
      risks: []
    };
  }

  /**
   * 应用进化结果
   * @param taskId 任务ID
   * @param options 应用选项
   */
  async applyEvolution(taskId: string, options?: {
    dryRun: boolean;
    rollbackOnFailure: boolean;
  }): Promise<any> {
    this.ensureInitialized();

    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Evolution task not found: ${taskId}`);
    }

    if (task.state !== EvolutionState.COMPLETED) {
      throw new Error(`Task is not completed: ${task.state}`);
    }

    try {
      if (options?.dryRun) {
        // 仅模拟应用
        return { success: true, dryRun: true, changes: task.result?.changes };
      }

      // 实际应用进化
      const result = await this.applyEvolutionDirectly(task, {} as EvolutionEvaluation);

      this.emit(EvolutionSystemEvent.EVOLUTION_APPLIED, { task });
      return { success: true, changes: result };
    } catch (error) {
      if (options?.rollbackOnFailure && task.result?.rollbackData) {
        await this.rollbackEvolution(taskId);
      }
      throw error;
    }
  }

  /**
   * 回滚进化
   * @param taskId 任务ID
   */
  async rollbackEvolution(taskId: string): Promise<void> {
    this.ensureInitialized();

    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Evolution task not found: ${taskId}`);
    }

    if (!this.config.rollbackConfig.enabled) {
      throw new Error('Rollback is not enabled in configuration');
    }

    // 执行回滚
    this.emit(EvolutionSystemEvent.ROLLBACK_TRIGGERED, { task });

    // 这里应该实现具体的回滚逻辑
    console.log(`[EvolutionSystem] Rolled back evolution task: ${taskId}`);
  }

  /**
   * 触发进化
   * @param trigger 进化触发器
   * @param data 触发器数据
   */
  async triggerEvolution(trigger: EvolutionTrigger, data?: any): Promise<EvolutionTask[]> {
    this.ensureInitialized();

    const evaluation = await this.evaluateEvolutionNeeds();
    const tasks: EvolutionTask[] = [];

    // 根据触发类型创建进化任务
    if (evaluation.opportunities.length > 0) {
      // 为最高优先级的进化机会创建任务
      const topOpportunity = evaluation.opportunities[0];
      
      const task: EvolutionTask = {
        id: `triggered_${uuidv4()}`,
        type: topOpportunity.type,
        priority: topOpportunity.priority,
        confidence: 0.8,
        createdAt: new Date(),
        state: EvolutionState.PENDING,
        progress: 0,
        goal: topOpportunity.description,
        inputData: data || {},
        parameters: {}
      };

      this.tasks.set(task.id, task);
      tasks.push(task);

      // 自动启动任务
      await this.startTask(task.id);
    }

    return tasks;
  }

  /**
   * 获取进化统计信息
   * @param options 统计选项
   */
  async getStats(options?: {
    type?: EvolutionType;
    timeRange?: {
      start: Date;
      end: Date;
    };
  }): Promise<{
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageDuration: number;
    successRate: number;
    byType: Record<EvolutionType, {
      count: number;
      successRate: number;
    }>;
  }> {
    this.ensureInitialized();

    const tasks = await this.getTasks();
    const stats = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.state === EvolutionState.COMPLETED).length,
      failedTasks: tasks.filter(t => t.state === EvolutionState.FAILED).length,
      averageDuration: 0,
      successRate: tasks.length > 0
        ? tasks.filter(t => t.state === EvolutionState.COMPLETED).length / tasks.length
        : 0,
      byType: {} as any
    };

    // 按类型统计
    const types = Array.from(this.strategies.keys());
    for (const type of types) {
      const typeTasks = tasks.filter(t => t.type === type);
      const completed = typeTasks.filter(t => t.state === EvolutionState.COMPLETED).length;
      
      stats.byType[type] = {
        count: typeTasks.length,
        successRate: typeTasks.length > 0 ? completed / typeTasks.length : 0
      };
    }

    // 计算平均执行时间
    const completedTasks = tasks.filter(t => t.state === EvolutionState.COMPLETED);
    if (completedTasks.length > 0) {
      const totalDuration = completedTasks.reduce((sum, task) => {
        const duration = new Date(task.completedAt!).getTime() - new Date(task.startedAt!).getTime();
        return sum + duration;
      }, 0);
      stats.averageDuration = totalDuration / completedTasks.length;
    }

    return stats;
  }

  /**
   * 自动执行进化
   */
  async autoEvolve(): Promise<void> {
    console.log('[EvolutionSystem] Running automatic evolution...');

    try {
      // 评估进化需求
      const evaluation = await this.evaluateEvolutionNeeds();

      // 如果有进化机会，触发进化
      if (evaluation.score > 0.5 && evaluation.opportunities.length > 0) {
        await this.triggerEvolution(EvolutionTrigger.SCHEDULED, evaluation);
      }
    } catch (error) {
      console.error('[EvolutionSystem] Auto-evolution failed:', error);
    }
  }

  /**
   * 关联技能系统
   * @param skillSystem 技能系统实例
   */
  setSkillSystem(skillSystem: SkillSystem): void {
    this.skillSystem = skillSystem;
  }

  /**
   * 关联记忆系统
   * @param memorySystem 记忆系统实例
   */
  setMemorySystem(memorySystem: MemorySystem): void {
    this.memorySystem = memorySystem;
  }

  /**
   * 关联人格系统
   * @param personalitySystem 人格系统实例
   */
  setPersonalitySystem(personalitySystem: PersonalitySystem): void {
    this.personalitySystem = personalitySystem;
  }

  /**
   * 销毁进化系统
   */
  async destroy(): Promise<void> {
    // 清理定时器
    if (this.autoEvolutionTimer) {
      clearInterval(this.autoEvolutionTimer);
    }

    // 停止所有运行中的任务
    const runningTasks = this.getTasks({ state: EvolutionState.RUNNING });
    for (const task of runningTasks) {
      await this.stopTask(task.id);
    }

    // 清空任务
    this.tasks.clear();

    // 销毁沙箱
    await this.sandbox.destroy();

    // 移除所有监听器
    this.removeAllListeners();

    this.initialized = false;
    console.log('[EvolutionSystem] Destroyed successfully');
  }
}

export default EvolutionSystem;