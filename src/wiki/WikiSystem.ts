import {
  IWikiSystem,
  WikiPageKind,
  WikiPageSummary,
  WikiEntity,
  WikiClaim,
  EntityRelation,
  GraphSearchResult,
  GraphStats,
  WikiClaimHealth,
  WikiContradictionCluster,
  WikiSystemConfig,
  WikiFreshnessLevel
} from './interfaces/IWikiSystem';
import { calculateSemanticSimilarity } from '../memory/embeddings';
import { DeterminismSystem } from '../DeterminismSystem';

/**
 * OpenTaiji Wiki 知识图谱系统核心实现
 * 基于 OpenClaw Memory Wiki 架构移植
 * 与 WFGY 防幻觉系统深度集成
 */
export class WikiSystem implements IWikiSystem {
  public readonly name: string = 'WikiSystem';
  public readonly version: string = '1.0.0';

  private config: Required<WikiSystemConfig>;
  private wfgySystem: DeterminismSystem | null = null;

  // 内存存储（生产环境应该替换为持久化存储）
  private pages: Map<string, WikiPageSummary> = new Map();
  private entities: Map<string, WikiEntity> = new Map();
  private invertedIndex: Map<string, Set<string>> = new Map();
  private backlinks: Map<string, Set<string>> = new Map();

  constructor(config?: WikiSystemConfig) {
    this.config = {
      dataPath: config?.dataPath || './data/wiki',
      autoBacklinks: config?.autoBacklinks ?? true,
      autoDashboards: config?.autoDashboards ?? true,
      claimConfidenceThreshold: config?.claimConfidenceThreshold ?? 0.5,
      relationConfidenceThreshold: config?.relationConfidenceThreshold ?? 0.5,
      freshnessThreshold: config?.freshnessThreshold ?? {
        aging: 30,
        stale: 90
      },
      entityExtraction: {
        enabled: config?.entityExtraction?.enabled ?? true,
        minOccurrence: config?.entityExtraction?.minOccurrence ?? 2,
        maxEntitiesPerPage: config?.entityExtraction?.maxEntitiesPerPage ?? 20
      }
    };
  }

  /**
   * 注入 WFGY 确定性系统实例
   */
  setDeterminismSystem(system: DeterminismSystem): void {
    this.wfgySystem = system;
  }

  isReady(): boolean {
    return true;
  }

  /**
   * 添加/更新页面
   */
  async addPage(page: Partial<WikiPageSummary>): Promise<string> {
    const now = new Date().toISOString();
    const id = page.id || `page_${Date.now()}`;

    const existingPage = this.pages.get(id);

    const newPage: WikiPageSummary = {
      absolutePath: page.absolutePath || `./${id}.md`,
      relativePath: page.relativePath || `${id}.md`,
      kind: page.kind || 'concept',
      title: page.title || `未命名页面`,
      id,
      pageType: page.pageType,
      sourceIds: page.sourceIds || existingPage?.sourceIds || [],
      linkTargets: page.linkTargets || existingPage?.linkTargets || [],
      claims: page.claims || existingPage?.claims || [],
      contradictions: page.contradictions || existingPage?.contradictions || [],
      questions: page.questions || existingPage?.questions || [],
      confidence: page.confidence ?? existingPage?.confidence ?? 0.5,
      sourceType: page.sourceType,
      provenanceMode: page.provenanceMode,
      sourcePath: page.sourcePath,
      updatedAt: now,
      createdAt: existingPage?.createdAt || now
    };

    this.pages.set(id, newPage);

    // 更新倒排索引
    this.updateInvertedIndex(newPage);

    // 更新反向链接
    if (this.config.autoBacklinks) {
      this.updateBacklinks(newPage);
    }

    // WFGY 集成：验证新页面内容
    if (this.wfgySystem && newPage.title) {
      try {
        const allClaimsText = newPage.claims.map(c => c.text).join(' ');
        const verifyText = `${newPage.title} ${allClaimsText}`;
        const wfgyResult = await this.wfgySystem.verify(verifyText);
        newPage.confidence = 1 - (wfgyResult.hallucinationRisk ?? 0);
      } catch (error) {
        // WFGY 验证失败不影响存储
      }
    }

    return id;
  }

  /**
   * 添加实体
   */
  async addEntity(entity: Partial<WikiEntity>): Promise<string> {
    const now = new Date().toISOString();
    const id = entity.id || `entity_${Date.now()}`;

    const existingEntity = this.entities.get(id);

    const newEntity: WikiEntity = {
      absolutePath: entity.absolutePath || `./entities/${id}.md`,
      relativePath: entity.relativePath || `entities/${id}.md`,
      kind: 'entity',
      type: entity.type || 'concept',
      title: entity.title || id,
      id,
      aliases: entity.aliases || existingEntity?.aliases || [],
      attributes: entity.attributes || existingEntity?.attributes || {},
      relations: entity.relations || existingEntity?.relations || [],
      sourceIds: entity.sourceIds || existingEntity?.sourceIds || [],
      linkTargets: entity.linkTargets || existingEntity?.linkTargets || [],
      claims: entity.claims || existingEntity?.claims || [],
      contradictions: entity.contradictions || existingEntity?.contradictions || [],
      questions: entity.questions || existingEntity?.questions || [],
      confidence: entity.confidence ?? existingEntity?.confidence ?? 0.5,
      updatedAt: now,
      createdAt: existingEntity?.createdAt || now
    };

    this.entities.set(id, newEntity);

    // 更新倒排索引
    this.updateInvertedIndex(newEntity);

    // WFGY 集成
    if (this.wfgySystem) {
      // 实体置信度由其关系和声明的平均置信度决定
      const avgRelationConfidence = newEntity.relations.length > 0
        ? newEntity.relations.reduce((sum, r) => sum + r.confidence, 0) / newEntity.relations.length
        : 0.5;
      const avgClaimConfidence = newEntity.claims.length > 0
        ? newEntity.claims.reduce((sum, c) => sum + (c.confidence ?? 0.5), 0) / newEntity.claims.length
        : 0.5;
      newEntity.confidence = (avgRelationConfidence + avgClaimConfidence) / 2;
    }

    return id;
  }

  /**
   * 添加声明
   */
  async addClaim(
    pageId: string,
    claim: Omit<WikiClaim, 'id' | 'createdAt'>
  ): Promise<string> {
    const now = new Date().toISOString();
    const claimId = `claim_${Date.now()}`;

    // WFGY 集成：验证声明内容
    let confidence = claim.confidence ?? 0.5;
    if (this.wfgySystem) {
      try {
        const wfgyResult = await this.wfgySystem.verify(claim.text);
        confidence = 1 - (wfgyResult.hallucinationRisk ?? 0);

        // 如果声明有证据，也逐一验证
        for (const evidence of claim.evidence) {
          if (evidence.quote) {
            const evidenceResult = await this.wfgySystem.verify(evidence.quote);
            evidence.confidence = 1 - (evidenceResult.hallucinationRisk ?? 0);
          }
        }
      } catch (error) {
        // WFGY 验证失败不影响存储
      }
    }

    const newClaim: WikiClaim = {
      id: claimId,
      text: claim.text,
      status: claim.status || 'supported',
      confidence,
      evidence: claim.evidence || [],
      createdAt: now,
      updatedAt: now
    };

    // 查找目标页面（可以是普通页面或实体）
    const page = this.pages.get(pageId);
    const entity = this.entities.get(pageId);

    if (page) {
      page.claims.push(newClaim);
      page.updatedAt = now;
    } else if (entity) {
      entity.claims.push(newClaim);
      entity.updatedAt = now;
    } else {
      throw new Error(`页面不存在: ${pageId}`);
    }

    return claimId;
  }

  /**
   * 添加关系
   */
  async addRelation(
    sourceEntityId: string,
    targetEntityId: string,
    type: string,
    confidence: number = 0.5,
    evidence: string[] = []
  ): Promise<string> {
    const source = this.entities.get(sourceEntityId);
    const target = this.entities.get(targetEntityId);

    if (!source) {
      throw new Error(`源实体不存在: ${sourceEntityId}`);
    }
    if (!target) {
      throw new Error(`目标实体不存在: ${targetEntityId}`);
    }

    // WFGY 集成：验证关系
    let finalConfidence = confidence;
    if (this.wfgySystem) {
      try {
        const relationText = `${source.title} ${type} ${target.title}`;
        const wfgyResult = await this.wfgySystem.verify(relationText);
        finalConfidence = 1 - (wfgyResult.hallucinationRisk ?? 0);
      } catch (error) {
        // WFGY 验证失败不影响存储
      }
    }

    // 检查关系置信度阈值
    if (finalConfidence < this.config.relationConfidenceThreshold) {
      throw new Error(
        `关系置信度 (${finalConfidence.toFixed(2)}) 低于阈值 (${this.config.relationConfidenceThreshold})`
      );
    }

    const now = new Date().toISOString();
    const relationId = `relation_${Date.now()}`;

    const newRelation: EntityRelation = {
      targetId: targetEntityId,
      targetTitle: target.title,
      type,
      confidence: finalConfidence,
      evidence,
      createdAt: now
    };

    source.relations.push(newRelation);
    source.updatedAt = now;

    // 更新反向链接
    if (this.config.autoBacklinks) {
      const targetBacklinks = this.backlinks.get(targetEntityId) || new Set();
      targetBacklinks.add(sourceEntityId);
      this.backlinks.set(targetEntityId, targetBacklinks);
    }

    return relationId;
  }

  /**
   * 搜索图谱
   */
  async search(
    query: string,
    kind?: WikiPageKind,
    limit: number = 20
  ): Promise<GraphSearchResult> {
    const results: GraphSearchResult = {
      pages: [],
      entities: [],
      matchingClaims: [],
      suggestedRelations: []
    };

    const queryLower = query.toLowerCase();

    // 1. 搜索页面
    for (const page of this.pages.values()) {
      if (kind && page.kind !== kind) {
        continue;
      }

      // 标题匹配
      if (page.title.toLowerCase().includes(queryLower)) {
        results.pages.push(page);
        continue;
      }

      // 关键词匹配
      const keywords = this.extractKeywords(page.title);
      if (keywords.some(k => queryLower.includes(k) || k.includes(queryLower))) {
        results.pages.push(page);
        continue;
      }

      // 声明匹配
      for (const claim of page.claims) {
        if (claim.text.toLowerCase().includes(queryLower)) {
          const similarity = calculateSemanticSimilarity(query, claim.text);
          results.matchingClaims.push({
            page,
            claim,
            relevanceScore: similarity
          });
        }
      }
    }

    // 2. 搜索实体
    for (const entity of this.entities.values()) {
      if (entity.title.toLowerCase().includes(queryLower)) {
        results.entities.push(entity);
        continue;
      }

      // 别名匹配
      if (entity.aliases.some(a => a.toLowerCase().includes(queryLower))) {
        results.entities.push(entity);
      }
    }

    // 3. 排序并限制数量
    results.pages = results.pages.slice(0, limit);
    results.entities = results.entities.slice(0, limit);
    results.matchingClaims = results.matchingClaims
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    // 4. 生成建议关系
    results.suggestedRelations = this.generateSuggestedRelations(query);

    return results;
  }

  /**
   * 获取页面
   */
  async getPage(id: string): Promise<WikiPageSummary | null> {
    return this.pages.get(id) || null;
  }

  /**
   * 获取实体
   */
  async getEntity(id: string): Promise<WikiEntity | null> {
    return this.entities.get(id) || null;
  }

  /**
   * 获取图谱统计
   */
  async getStats(): Promise<GraphStats> {
    let totalClaims = 0;
    let totalRelations = 0;
    let totalEvidence = 0;
    let totalConfidence = 0;
    let contradictionCount = 0;
    let stalePages = 0;

    const now = Date.now();

    // 统计页面
    for (const page of this.pages.values()) {
      totalClaims += page.claims.length;
      contradictionCount += page.contradictions.length;

      for (const claim of page.claims) {
        totalEvidence += claim.evidence.length;
        totalConfidence += claim.confidence ?? 0;
      }

      // 检查是否过期
      if (page.updatedAt) {
        const daysSinceUpdate = (now - new Date(page.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate >= this.config.freshnessThreshold.stale) {
          stalePages++;
        }
      }
    }

    // 统计实体
    for (const entity of this.entities.values()) {
      totalClaims += entity.claims.length;
      totalRelations += entity.relations.length;
      contradictionCount += entity.contradictions.length;

      for (const claim of entity.claims) {
        totalEvidence += claim.evidence.length;
        totalConfidence += claim.confidence ?? 0;
      }
    }

    // 顶级实体（按关系数量排序）
    const topEntities = Array.from(this.entities.values())
      .sort((a, b) => b.relations.length - a.relations.length)
      .slice(0, 10)
      .filter(e => e.id)
      .map(e => ({
        id: e.id!,
        title: e.title,
        relationCount: e.relations.length
      }));

    return {
      totalPages: this.pages.size,
      totalEntities: this.entities.size,
      totalClaims,
      totalRelations,
      totalEvidence,
      avgConfidence: totalClaims > 0 ? totalConfidence / totalClaims : 0,
      contradictionCount,
      stalePages,
      topEntities
    };
  }

  /**
   * 获取声明健康度
   */
  async getClaimHealth(pageId?: string): Promise<WikiClaimHealth[]> {
    const healthResults: WikiClaimHealth[] = [];
    const now = Date.now();

    const targets: WikiPageSummary[] = pageId
      ? [this.pages.get(pageId)].filter(Boolean) as WikiPageSummary[]
      : Array.from(this.pages.values());

    for (const page of targets) {
      for (let i = 0; i < page.claims.length; i++) {
        const claim = page.claims[i];

        // 计算新鲜度
        const freshness = this.calculateFreshness(claim.updatedAt, now);

        healthResults.push({
          key: `${page.id}#${claim.id || i}`,
          pagePath: page.relativePath,
          pageTitle: page.title,
          pageId: page.id,
          claimId: claim.id,
          text: claim.text,
          status: claim.status || 'supported',
          confidence: claim.confidence,
          evidenceCount: claim.evidence.length,
          missingEvidence: claim.evidence.length === 0,
          freshness
        });
      }
    }

    // 按健康度排序（低置信度 + 缺少证据 + 过期 优先）
    return healthResults.sort((a, b) => {
      const scoreA = (a.confidence ?? 0) * 0.5 -
        (a.missingEvidence ? 0.3 : 0) -
        (a.freshness.level === 'stale' ? 0.2 : a.freshness.level === 'aging' ? 0.1 : 0);
      const scoreB = (b.confidence ?? 0) * 0.5 -
        (b.missingEvidence ? 0.3 : 0) -
        (b.freshness.level === 'stale' ? 0.2 : b.freshness.level === 'aging' ? 0.1 : 0);
      return scoreA - scoreB;
    });
  }

  /**
   * 获取矛盾聚类
   */
  async getContradictions(): Promise<WikiContradictionCluster[]> {
    const clusters: WikiContradictionCluster[] = [];
    const contradictionMap = new Map<string, WikiContradictionCluster['entries']>();

    // 收集所有矛盾
    for (const page of this.pages.values()) {
      for (const contradiction of page.contradictions) {
        const key = this.normalizeContradictionKey(contradiction);
        const entries = contradictionMap.get(key) || [];
        entries.push({
          pagePath: page.relativePath,
          pageTitle: page.title,
          pageId: page.id,
          note: contradiction
        });
        contradictionMap.set(key, entries);
      }
    }

    for (const entity of this.entities.values()) {
      for (const contradiction of entity.contradictions) {
        const key = this.normalizeContradictionKey(contradiction);
        const entries = contradictionMap.get(key) || [];
        entries.push({
          pagePath: entity.relativePath,
          pageTitle: entity.title,
          pageId: entity.id,
          note: contradiction
        });
        contradictionMap.set(key, entries);
      }
    }

    // 构建聚类
    for (const [key, entries] of contradictionMap.entries()) {
      clusters.push({
        key,
        label: entries[0]?.note.slice(0, 50) || key,
        entries
      });
    }

    return clusters.sort((a, b) => b.entries.length - a.entries.length);
  }

  /**
   * 获取相关页面
   */
  async getRelatedPages(
    pageId: string,
    limit: number = 10
  ): Promise<Array<{
    page: WikiPageSummary;
    relevanceScore: number;
    relationType?: string;
  }>> {
    const source = this.pages.get(pageId) || this.entities.get(pageId);
    if (!source) {
      return [];
    }

    const related: Array<{
      page: WikiPageSummary;
      relevanceScore: number;
      relationType?: string;
    }> = [];

    // 1. 反向链接
    const backlinkIds = this.backlinks.get(pageId) || new Set();
    for (const backlinkId of backlinkIds) {
      const page = this.pages.get(backlinkId) || this.entities.get(backlinkId);
      if (page && page.id !== pageId) {
        related.push({
          page,
          relevanceScore: 0.8,
          relationType: 'backlink'
        });
      }
    }

    // 2. 共享来源
    const sourceIds = new Set(source.sourceIds);
    for (const page of [...this.pages.values(), ...this.entities.values()]) {
      if (page.id === pageId) continue;

      const sharedSources = page.sourceIds.filter(id => sourceIds.has(id)).length;
      if (sharedSources > 0) {
        related.push({
          page,
          relevanceScore: Math.min(0.7, sharedSources * 0.2),
          relationType: 'shared_source'
        });
      }
    }

    // 3. 内容相似度
    const sourceText = source.title + ' ' + source.claims.map(c => c.text).join(' ');
    for (const page of [...this.pages.values(), ...this.entities.values()]) {
      if (page.id === pageId) continue;
      if (related.some(r => r.page.id === page.id)) continue;

      const pageText = page.title + ' ' + page.claims.map(c => c.text).join(' ');
      const similarity = calculateSemanticSimilarity(sourceText, pageText);
      if (similarity > 0.3) {
        related.push({
          page,
          relevanceScore: similarity * 0.5,
          relationType: 'similar_content'
        });
      }
    }

    return related
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  /**
   * 构建实体的关系图
   */
  async buildEntityGraph(
    entityId: string,
    depth: number = 2,
    limit: number = 50
  ): Promise<{
    nodes: Array<{ id: string; title: string; kind: string }>;
    edges: Array<{ source: string; target: string; type: string; confidence: number }>;
  }> {
    const nodes = new Map<string, { id: string; title: string; kind: string }>();
    const edges = new Map<string, { source: string; target: string; type: string; confidence: number }>();

    // 广度优先搜索
    const queue: Array<{ id: string; currentDepth: number }> = [{ id: entityId, currentDepth: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0 && nodes.size < limit) {
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);

      const entity = this.entities.get(current.id);
      if (!entity || !entity.id) continue;

      // 添加节点
      nodes.set(entity.id, {
        id: entity.id,
        title: entity.title,
        kind: entity.type
      });

      // 添加边
      if (current.currentDepth < depth) {
        for (const relation of entity.relations) {
          const edgeKey = [entity.id, relation.targetId].sort().join('_');
          if (!edges.has(edgeKey)) {
            edges.set(edgeKey, {
              source: entity.id,
              target: relation.targetId,
              type: relation.type,
              confidence: relation.confidence
            });
          }

          if (!visited.has(relation.targetId)) {
            queue.push({
              id: relation.targetId,
              currentDepth: current.currentDepth + 1
            });
          }
        }
      }
    }

    return {
      nodes: Array.from(nodes.values()),
      edges: Array.from(edges.values())
    };
  }

  // ===== 私有方法 =====

  private updateInvertedIndex(page: WikiPageSummary): void {
    if (!page.id) return;

    const keywords = this.extractKeywords(page.title);
    for (const claim of page.claims) {
      keywords.push(...this.extractKeywords(claim.text));
    }

    for (const keyword of keywords) {
      const lower = keyword.toLowerCase();
      if (!this.invertedIndex.has(lower)) {
        this.invertedIndex.set(lower, new Set());
      }
      this.invertedIndex.get(lower)!.add(page.id);
    }
  }

  private updateBacklinks(page: WikiPageSummary): void {
    if (!page.id) return;

    for (const target of page.linkTargets) {
      const targetBacklinks = this.backlinks.get(target) || new Set();
      targetBacklinks.add(page.id);
      this.backlinks.set(target, targetBacklinks);
    }
  }

  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 1 && w.length <= 20);
  }

  private calculateFreshness(updatedAt: string | undefined, now: number): {
    level: WikiFreshnessLevel;
    reason: string;
    daysSinceTouch?: number;
    lastTouchedAt?: string;
  } {
    if (!updatedAt) {
      return { level: 'unknown', reason: 'missing updatedAt' };
    }

    const daysSinceTouch = (now - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceTouch >= this.config.freshnessThreshold.stale) {
      return {
        level: 'stale',
        reason: `last touched ${updatedAt}`,
        daysSinceTouch,
        lastTouchedAt: updatedAt
      };
    }

    if (daysSinceTouch >= this.config.freshnessThreshold.aging) {
      return {
        level: 'aging',
        reason: `last touched ${updatedAt}`,
        daysSinceTouch,
        lastTouchedAt: updatedAt
      };
    }

    return {
      level: 'fresh',
      reason: `last touched ${updatedAt}`,
      daysSinceTouch,
      lastTouchedAt: updatedAt
    };
  }

  private normalizeContradictionKey(note: string): string {
    return note
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 50);
  }

  private generateSuggestedRelations(query: string): Array<{
    from: string;
    to: string;
    type: string;
    confidence: number;
  }> {
    // 基于查询和现有实体生成建议关系
    const suggestions: Array<{
      from: string;
      to: string;
      type: string;
      confidence: number;
    }> = [];

    const queryLower = query.toLowerCase();
    const entities = Array.from(this.entities.values());

    // 查找查询中提到的实体对
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entityA = entities[i];
        const entityB = entities[j];

        if (!entityA.id || !entityB.id) continue;

        if (queryLower.includes(entityA.title.toLowerCase()) &&
            queryLower.includes(entityB.title.toLowerCase())) {
          // 检查是否已有关系
          const hasRelation = entityA.relations.some(r => r.targetId === entityB.id) ||
            entityB.relations.some(r => r.targetId === entityA.id);

          if (!hasRelation) {
            // 建议新关系
            suggestions.push({
              from: entityA.id,
              to: entityB.id,
              type: 'related_to',
              confidence: 0.5
            });
          }
        }
      }
    }

    return suggestions.slice(0, 10);
  }
}
