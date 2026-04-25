/**
 * TriTai 三才 - 统一导出
 * 天时·地利·人和
 * V0.5 - 2026-04-25
 */

// 核心模块
export * from './types';
export { ContextEngine } from './ContextEngine';
export { ContextScanner } from './ContextScanner';
export { ContextAssembler } from './ContextAssembler';
export { ContextInjector } from './ContextInjector';
export { ContextAwareActor } from './ContextAwareActor';

// 记忆系统
export { MemorySystem } from './MemorySystem';
export { HotMemoryAdapter } from './HotMemoryAdapter';
export { WarmMemoryAdapter } from './WarmMemoryAdapter';
export { ColdMemoryAdapter } from './ColdMemoryAdapter';
export { KnowledgeBaseAdapter } from './KnowledgeBaseAdapter';

// 进化系统
export { EvolutionSystem } from './EvolutionSystem';

// 辅助模块
export { SkillSystem } from './SkillSystem';
export { PersonalitySystem } from './PersonalitySystem';

// 知识图谱系统（新增）
export { KnowledgeGraphSystem } from './src/wiki/KnowledgeGraphSystem';
export { WikiSystem } from './src/wiki/WikiSystem';
export * from './src/wiki/interfaces/IWikiSystem';
