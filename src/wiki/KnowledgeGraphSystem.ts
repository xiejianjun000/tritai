/**
 * 知识图谱系统 - 知识图谱验证（地利）
 * 本地实现，无需外部 API
 * 与 WFGY 防幻觉系统深度集成
 */

import { WikiSystem } from './WikiSystem';
import type { IWikiSystem, WikiSystemConfig, WikiPageKind } from './interfaces/IWikiSystem';
import { DeterminismSystem } from '../DeterminismSystem';

export interface KnowledgeGraphConfig extends WikiSystemConfig {
  /** 启用 WFGY 集成 */
  enableWFGYIntegration?: boolean;
}

/**
 * 知识图谱系统 - 提供知识验证和溯源能力
 */
export class KnowledgeGraphSystem implements IWikiSystem {
  private wiki: WikiSystem;
  private wfgySystem: DeterminismSystem | null = null;

  constructor(config?: KnowledgeGraphConfig) {
    this.wiki = new WikiSystem({
      ...config,
      claimConfidenceThreshold: config?.claimConfidenceThreshold ?? 0.5,
    });
  }

  /**
   * 注入 WFGY 确定性系统
   */
  setDeterminismSystem(system: DeterminismSystem): void {
    this.wfgySystem = system;
    this.wiki.setDeterminismSystem(system);
  }

  isReady(): boolean {
    return this.wiki.isReady();
  }

  async addPage(page: any): Promise<string> {
    return this.wiki.addPage(page);
  }

  async addEntity(entity: any): Promise<string> {
    return this.wiki.addEntity(entity);
  }

  async addClaim(pageId: string, claim: any): Promise<string> {
    return this.wiki.addClaim(pageId, claim);
  }

  async addRelation(sourceId: string, targetId: string, type: string, confidence = 0.5, evidence?: string[]): Promise<string> {
    return this.wiki.addRelation(sourceId, targetId, type, confidence, evidence);
  }

  async search(query: string, kind?: WikiPageKind, limit = 10): Promise<any> {
    return this.wiki.search(query, kind, limit);
  }

  async getPage(id: string): Promise<any> {
    return this.wiki.getPage(id);
  }

  async getEntity(id: string): Promise<any> {
    return this.wiki.getEntity(id);
  }

  async getStats(): Promise<any> {
    return this.wiki.getStats();
  }

  async getClaimHealth(pageId?: string): Promise<any> {
    return this.wiki.getClaimHealth(pageId);
  }

  async getContradictions(): Promise<any> {
    return this.wiki.getContradictions();
  }

  async getRelatedPages(pageId: string, limit = 5): Promise<any> {
    return this.wiki.getRelatedPages(pageId, limit);
  }

  async buildEntityGraph(entityId: string, depth = 1, limit = 20): Promise<any> {
    return this.wiki.buildEntityGraph(entityId, depth, limit);
  }
}
