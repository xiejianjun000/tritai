/**
 * 知识图谱系统 - 本地实现，无需外部 API
 * 与 WFGY 防幻觉系统深度集成
 * 纯 JavaScript 实现，可直接使用
 */

class KnowledgeGraphSystem {
  constructor(config = {}) {
    this.name = 'KnowledgeGraphSystem';
    this.version = '1.0.0';
    this.config = {
      claimConfidenceThreshold: config.claimConfidenceThreshold ?? 0.5,
      relationConfidenceThreshold: config.relationConfidenceThreshold ?? 0.5,
      freshnessThreshold: config.freshnessThreshold ?? { aging: 30, stale: 90 }
    };
    this.pages = new Map();
    this.entities = new Map();
    this.relations = new Map();
    this.invertedIndex = new Map();
    this.wfgyVerifier = null;
  }

  setWfgyVerifier(verifier) { this.wfgyVerifier = verifier; }
  isReady() { return true; }

  updateInvertedIndex(page) {
    const text = `${page.title} ${(page.claims || []).map(c => c.text).join(' ')}`.toLowerCase();
    const words = text.split(/\s+/).filter(w => w.length > 3);
    for (const word of words) {
      if (!this.invertedIndex.has(word)) this.invertedIndex.set(word, new Set());
      this.invertedIndex.get(word).add(page.id);
    }
  }

  async addPage(page) {
    const now = new Date().toISOString();
    const id = page.id || `page_${Date.now()}`;
    const newPage = {
      absolutePath: page.absolutePath || `./${id}.md`,
      relativePath: page.relativePath || `${id}.md`,
      kind: page.kind || 'concept',
      title: page.title || '未命名页面',
      id,
      sourceIds: page.sourceIds || [],
      linkTargets: page.linkTargets || [],
      claims: page.claims || [],
      contradictions: page.contradictions || [],
      questions: page.questions || [],
      confidence: page.confidence ?? 0.5,
      updatedAt: now, createdAt: now
    };
    this.pages.set(id, newPage);
    this.updateInvertedIndex(newPage);
    if (this.wfgyVerifier && newPage.title) {
      const allClaims = newPage.claims.map(c => c.text).join(' ');
      const verifyText = `${newPage.title} ${allClaims}`;
      try {
        const result = this.wfgyVerifier.detect(verifyText);
        newPage.confidence = 1 - (result.confidence || 0);
      } catch (e) {}
    }
    return id;
  }

  async addEntity(entity) {
    const now = new Date().toISOString();
    const id = entity.id || `entity_${Date.now()}`;
    const newEntity = {
      absolutePath: entity.absolutePath || `./entities/${id}.md`,
      relativePath: entity.relativePath || `entities/${id}.md`,
      kind: 'entity', type: entity.type || 'concept',
      title: entity.title || id, id,
      aliases: entity.aliases || [],
      attributes: entity.attributes || {},
      relations: [], sourceIds: entity.sourceIds || [],
      linkTargets: entity.linkTargets || [],
      claims: entity.claims || [],
      confidence: entity.confidence ?? 0.5,
      updatedAt: now, createdAt: now
    };
    this.entities.set(id, newEntity);
    this.updateInvertedIndex(newEntity);
    return id;
  }

  async addRelation(sourceId, targetId, type, confidence = 0.5, evidence = []) {
    const relationId = `rel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const sourceEntity = this.entities.get(sourceId);
    if (sourceEntity) {
      sourceEntity.relations.push({ targetId, type, confidence, evidence, createdAt: new Date().toISOString() });
    }
    this.relations.set(relationId, { id: relationId, sourceId, targetId, type, confidence, evidence, createdAt: new Date().toISOString() });
    return relationId;
  }

  async addClaim(pageId, claim) {
    const page = this.pages.get(pageId);
    if (!page) throw new Error(`页面不存在: ${pageId}`);
    const claimId = `claim_${Date.now()}`;
    const newClaim = {
      id: claimId, text: claim.text,
      status: claim.status || 'supported',
      confidence: claim.confidence ?? 0.5,
      evidence: claim.evidence || [],
      updatedAt: new Date().toISOString(), createdAt: new Date().toISOString()
    };
    if (this.wfgyVerifier) {
      try {
        const result = this.wfgyVerifier.detect(claim.text);
        newClaim.confidence = 1 - (result.confidence || 0);
      } catch (e) {}
    }
    page.claims.push(newClaim);
    page.updatedAt = new Date().toISOString();
    return claimId;
  }

  async search(query, kind = null, limit = 10) {
    const lowerQuery = query.toLowerCase();
    const results = { pages: [], entities: [], matchingClaims: [], suggestedRelations: [] };
    for (const [id, page] of this.pages) {
      if (kind && page.kind !== kind) continue;
      const text = `${page.title} ${page.claims.map(c => c.text).join(' ')}`.toLowerCase();
      if (text.includes(lowerQuery)) results.pages.push(page);
    }
    for (const [id, entity] of this.entities) {
      const text = `${entity.title} ${entity.aliases.join(' ')} ${JSON.stringify(entity.attributes)}`.toLowerCase();
      if (text.includes(lowerQuery)) results.entities.push(entity);
    }
    for (const [id, page] of this.pages) {
      for (const claim of page.claims) {
        if (claim.text.toLowerCase().includes(lowerQuery)) {
          results.matchingClaims.push({ page, claim, relevanceScore: 0.8 });
        }
      }
    }
    for (const [id, rel] of this.relations) {
      const source = this.entities.get(rel.sourceId);
      const target = this.entities.get(rel.targetId);
      if ((source && source.title.toLowerCase().includes(lowerQuery)) || (target && target.title.toLowerCase().includes(lowerQuery))) {
        results.suggestedRelations.push({ from: source?.title || rel.sourceId, to: target?.title || rel.targetId, type: rel.type, confidence: rel.confidence });
      }
    }
    return { pages: results.pages.slice(0, limit), entities: results.entities.slice(0, limit), matchingClaims: results.matchingClaims.slice(0, limit), suggestedRelations: results.suggestedRelations.slice(0, limit) };
  }

  async getPage(id) { return this.pages.get(id) || null; }
  async getEntity(id) { return this.entities.get(id) || null; }

  async getStats() {
    let totalClaims = 0, totalRelations = 0, totalEvidence = 0, avgConfidence = 0, contradictionCount = 0;
    for (const [id, page] of this.pages) {
      totalClaims += page.claims.length;
      avgConfidence += page.confidence;
      contradictionCount += (page.contradictions || []).length;
      for (const claim of page.claims) totalEvidence += (claim.evidence || []).length;
    }
    for (const [id, entity] of this.entities) totalRelations += entity.relations.length;
    const totalPages = this.pages.size;
    avgConfidence = totalPages > 0 ? avgConfidence / totalPages : 0;
    const topEntities = Array.from(this.entities.values()).map(e => ({ id: e.id, title: e.title, relationCount: e.relations.length })).sort((a, b) => b.relationCount - a.relationCount).slice(0, 5);
    return { totalPages, totalEntities: this.entities.size, totalClaims, totalRelations, totalEvidence, avgConfidence, contradictionCount, stalePages: 0, topEntities };
  }

  async getRelatedPages(pageId, limit = 5) {
    const page = this.pages.get(pageId);
    if (!page) return [];
    const related = [];
    const pageText = `${page.title} ${page.claims.map(c => c.text).join(' ')}`.toLowerCase();
    for (const [id, other] of this.pages) {
      if (id === pageId) continue;
      const otherText = `${other.title} ${other.claims.map(c => c.text).join(' ')}`.toLowerCase();
      const words = pageText.split(/\s+/);
      let matchCount = 0;
      for (const word of words) { if (word.length > 3 && otherText.includes(word)) matchCount++; }
      const relevanceScore = matchCount / Math.max(words.length, 1);
      if (relevanceScore > 0.1) related.push({ page: other, relevanceScore });
    }
    return related.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
  }

  async buildEntityGraph(entityId, depth = 1, limit = 20) {
    const nodes = new Map(); const edges = []; const visited = new Set(); const queue = [[entityId, 0]];
    while (queue.length > 0 && nodes.size < limit) {
      const [currentId, currentDepth] = queue.shift();
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      const entity = this.entities.get(currentId);
      if (!entity) continue;
      nodes.set(currentId, { id: currentId, title: entity.title, kind: 'entity' });
      if (currentDepth < depth) {
        for (const rel of entity.relations) {
          edges.push({ source: currentId, target: rel.targetId, type: rel.type, confidence: rel.confidence });
          queue.push([rel.targetId, currentDepth + 1]);
        }
      }
    }
    return { nodes: Array.from(nodes.values()), edges };
  }

  async getClaimHealth(pageId) {
    const page = pageId ? this.pages.get(pageId) : null;
    if (!page) return [];
    return page.claims.map(claim => ({
      key: claim.id, pagePath: page.relativePath, pageTitle: page.title, claimId: claim.id,
      text: claim.text, status: claim.status, confidence: claim.confidence,
      evidenceCount: (claim.evidence || []).length,
      missingEvidence: !claim.evidence || claim.evidence.length === 0,
      freshness: { level: 'fresh', reason: 'Recently added' }
    }));
  }

  async getContradictions() {
    const contradictions = [];
    for (const [id, page] of this.pages) {
      if (page.contradictions && page.contradictions.length > 0) {
        contradictions.push({ key: `contradiction_${id}`, label: `页面 "${page.title}" 存在 ${page.contradictions.length} 个矛盾`, entries: page.contradictions.map(c => ({ pagePath: page.relativePath, pageTitle: page.title, note: c, confidence: page.confidence })) });
      }
    }
    return contradictions;
  }
}

module.exports = { KnowledgeGraphSystem };
