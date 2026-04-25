/**
 * Wiki 知识图谱系统接口定义
 * 基于 OpenClaw Wiki System 架构移植到 OpenTaiji
 */

// ===== Wiki 页面类型 =====
export type WikiPageKind = 'entity' | 'concept' | 'source' | 'synthesis' | 'report';

// ===== 知识声明 =====
export interface WikiClaimEvidence {
  sourceId?: string;
  sourcePath?: string;
  quote?: string;
  confidence?: number;
  updatedAt?: string;
}

export interface WikiClaim {
  id?: string;
  text: string;
  status?: 'supported' | 'contested' | 'contradicted' | 'refuted' | 'superseded';
  confidence?: number;
  evidence: WikiClaimEvidence[];
  updatedAt?: string;
  createdAt?: string;
}

// ===== Wiki 页面摘要 =====
export interface WikiPageSummary {
  absolutePath: string;
  relativePath: string;
  kind: WikiPageKind;
  title: string;
  id?: string;
  pageType?: string;
  sourceIds: string[];
  linkTargets: string[];
  claims: WikiClaim[];
  contradictions: string[];
  questions: string[];
  confidence?: number;
  sourceType?: string;
  provenanceMode?: string;
  sourcePath?: string;
  updatedAt?: string;
  createdAt?: string;
}

// ===== 实体节点 =====
export interface WikiEntity extends WikiPageSummary {
  kind: 'entity';
  type: 'person' | 'organization' | 'project' | 'technology' | 'location' | 'concept';
  aliases: string[];
  attributes: Record<string, string>;
  relations: EntityRelation[];
}

// ===== 实体关系 =====
export interface EntityRelation {
  targetId: string;
  targetTitle?: string;
  type: string;
  confidence: number;
  evidence: string[];
  createdAt?: string;
}

// ===== 图谱查询结果 =====
export interface GraphSearchResult {
  pages: WikiPageSummary[];
  entities: WikiEntity[];
  matchingClaims: Array<{
    page: WikiPageSummary;
    claim: WikiClaim;
    relevanceScore: number;
  }>;
  suggestedRelations: Array<{
    from: string;
    to: string;
    type: string;
    confidence: number;
  }>;
}

// ===== 图谱统计信息 =====
export interface GraphStats {
  totalPages: number;
  totalEntities: number;
  totalClaims: number;
  totalRelations: number;
  totalEvidence: number;
  avgConfidence: number;
  contradictionCount: number;
  stalePages: number;
  topEntities: Array<{ id: string; title: string; relationCount: number }>;
}

// ===== 新鲜度级别 =====
export type WikiFreshnessLevel = 'fresh' | 'aging' | 'stale' | 'unknown';

export interface WikiFreshness {
  level: WikiFreshnessLevel;
  reason: string;
  daysSinceTouch?: number;
  lastTouchedAt?: string;
}

// ===== 声明健康度 =====
export interface WikiClaimHealth {
  key: string;
  pagePath: string;
  pageTitle: string;
  pageId?: string;
  claimId?: string;
  text: string;
  status: string;
  confidence?: number;
  evidenceCount: number;
  missingEvidence: boolean;
  freshness: WikiFreshness;
}

// ===== 矛盾聚类 =====
export interface WikiContradictionCluster {
  key: string;
  label: string;
  entries: Array<{
    pagePath: string;
    pageTitle: string;
    pageId?: string;
    claimId?: string;
    note: string;
    confidence?: number;
  }>;
}

// ===== Wiki 系统配置 =====
export interface WikiSystemConfig {
  /** 数据存储路径 */
  dataPath?: string;
  /** 是否自动反向链接 */
  autoBacklinks?: boolean;
  /** 是否自动生成仪表板 */
  autoDashboards?: boolean;
  /** 声明置信度阈值 */
  claimConfidenceThreshold?: number;
  /** 关系置信度阈值 */
  relationConfidenceThreshold?: number;
  /** 新鲜度阈值（天） */
  freshnessThreshold?: {
    aging: number;
    stale: number;
  };
  /** 实体提取配置 */
  entityExtraction?: {
    enabled: boolean;
    minOccurrence: number;
    maxEntitiesPerPage: number;
  };
}

// ===== Wiki 系统接口 =====
export interface IWikiSystem {
  /**
   * 添加/更新页面
   */
  addPage(page: Partial<WikiPageSummary>): Promise<string>;

  /**
   * 添加实体
   */
  addEntity(entity: Partial<WikiEntity>): Promise<string>;

  /**
   * 添加声明
   */
  addClaim(pageId: string, claim: Omit<WikiClaim, 'id' | 'createdAt'>): Promise<string>;

  /**
   * 添加关系
   */
  addRelation(
    sourceEntityId: string,
    targetEntityId: string,
    type: string,
    confidence?: number,
    evidence?: string[]
  ): Promise<string>;

  /**
   * 搜索图谱
   */
  search(query: string, kind?: WikiPageKind, limit?: number): Promise<GraphSearchResult>;

  /**
   * 获取页面
   */
  getPage(id: string): Promise<WikiPageSummary | null>;

  /**
   * 获取实体
   */
  getEntity(id: string): Promise<WikiEntity | null>;

  /**
   * 获取图谱统计
   */
  getStats(): Promise<GraphStats>;

  /**
   * 获取声明健康度
   */
  getClaimHealth(pageId?: string): Promise<WikiClaimHealth[]>;

  /**
   * 获取矛盾聚类
   */
  getContradictions(): Promise<WikiContradictionCluster[]>;

  /**
   * 获取相关页面
   */
  getRelatedPages(pageId: string, limit?: number): Promise<Array<{
    page: WikiPageSummary;
    relevanceScore: number;
    relationType?: string;
  }>>;

  /**
   * 构建实体的关系图
   */
  buildEntityGraph(
    entityId: string,
    depth?: number,
    limit?: number
  ): Promise<{
    nodes: Array<{ id: string; title: string; kind: string }>;
    edges: Array<{ source: string; target: string; type: string; confidence: number }>;
  }>;

  /**
   * 检查系统是否就绪
   */
  isReady(): boolean;
}
