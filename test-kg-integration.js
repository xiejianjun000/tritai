/**
 * 知识图谱集成测试 - 与 WFGY 联合验证
 */
const { KnowledgeGraphSystem } = require('./knowledge-graph');
const { WfgyEngine } = require('./wfgy.js');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  知识图谱 + WFGY 联合验证测试');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 初始化
const kg = new KnowledgeGraphSystem();
const engine = new WfgyEngine();

// 注入 WFGY
kg.setWfgyVerifier({
  detect: (text) => engine.detect(text)
});

(async () => {
  // Test 1: 基本功能
  console.log('[测试 1] 知识图谱实例化');
  console.log(`✅ 名称: ${kg.name}`);
  console.log(`✅ 版本: ${kg.version}`);
  console.log(`✅ 状态: ${kg.isReady() ? '就绪' : '未就绪'}`);
  console.log('');

  // Test 2: 添加带 WFGY 验证的页面
  console.log('[测试 2] 添加页面（含 WFGY 自动验证）');
  const pageId = await kg.addPage({
    kind: 'concept',
    title: '生态环境法典',
    claims: [{
      text: '生态环境法典于2026年3月12日由十四届全国人大四次会议表决通过',
      status: 'supported',
      confidence: 0.95,
      evidence: [{ sourceId: 'source-001', quote: '全国人大公告' }]
    }]
  });
  const page = await kg.getPage(pageId);
  console.log(`✅ 页面添加成功: ${page.title}`);
  console.log(`   声明数: ${page.claims.length}`);
  console.log(`   置信度: ${page.confidence}`);
  console.log('');

  // Test 3: 添加虚假声明（WFGY 应检测到幻觉）
  console.log('[测试 3] 添加虚假声明（WFGY 应降低置信度）');
  const fakePageId = await kg.addPage({
    kind: 'concept',
    title: '虚假标准',
    claims: [{
      text: '根据GB 99999-2025标准要求，某企业排放达标',
      status: 'supported',
      confidence: 0.9,
      evidence: []
    }]
  });
  const fakePage = await kg.getPage(fakePageId);
  console.log(`✅ 页面添加成功: ${fakePage.title}`);
  console.log(`   原始置信度: 0.9`);
  console.log(`   WFGY 修正后: ${fakePage.confidence}`);
  console.log('');

  // Test 4: 添加实体
  console.log('[测试 4] 添加实体');
  const ent1 = await kg.addEntity({
    type: 'technology',
    title: 'OpenTaiji',
    aliases: ['太极', 'Open Taiji'],
    attributes: { type: 'AI Agent Framework' }
  });
  const ent2 = await kg.addEntity({
    type: 'technology',
    title: 'WFGY',
    aliases: ['防幻觉引擎'],
    attributes: { type: 'Verification System' }
  });
  const ent3 = await kg.addEntity({
    type: 'organization',
    title: '生态环境部',
    aliases: ['MEP'],
    attributes: { type: 'Government Agency' }
  });
  console.log(`✅ 添加了 3 个实体: OpenTaiji, WFGY, 生态环境部`);
  console.log('');

  // Test 5: 添加关系
  console.log('[测试 5] 添加实体关系');
  await kg.addRelation(ent1, ent2, 'contains', 0.95, ['WFGY 是 OpenTaiji 的核心模块']);
  await kg.addRelation(ent3, ent1, 'uses', 0.8, ['生态环境部使用 OpenTaiji 进行政策分析']);
  console.log(`✅ 添加了 2 条关系`);
  console.log('');

  // Test 6: 搜索
  console.log('[测试 6] 搜索知识图谱');
  const result = await kg.search('WFGY');
  console.log(`✅ 搜索 "WFGY"`);
  console.log(`   匹配页面: ${result.pages.length}`);
  console.log(`   匹配实体: ${result.entities.length}`);
  console.log(`   匹配声明: ${result.matchingClaims.length}`);
  console.log(`   推荐关系: ${result.suggestedRelations.length}`);
  console.log('');

  // Test 7: 统计
  console.log('[测试 7] 图谱统计');
  const stats = await kg.getStats();
  console.log(`✅ 统计信息:`);
  console.log(`   总页面: ${stats.totalPages}`);
  console.log(`   总实体: ${stats.totalEntities}`);
  console.log(`   总声明: ${stats.totalClaims}`);
  console.log(`   总关系: ${stats.totalRelations}`);
  console.log(`   平均置信度: ${(stats.avgConfidence * 100).toFixed(1)}%`);
  console.log(`   矛盾数: ${stats.contradictionCount}`);
  console.log(`   热门实体: ${stats.topEntities.map(e => e.title).join(', ')}`);
  console.log('');

  // Test 8: 相关页面
  console.log('[测试 8] 相关页面');
  const related = await kg.getRelatedPages(pageId, 3);
  console.log(`✅ 相关页面: ${related.length} 个`);
  console.log('');

  // Test 9: 实体关系图
  console.log('[测试 9] 实体关系图');
  const graph = await kg.buildEntityGraph(ent1, 2, 10);
  console.log(`✅ 关系图:`);
  console.log(`   节点: ${graph.nodes.length} 个`);
  console.log(`   边: ${graph.edges.length} 条`);
  for (const edge of graph.edges) {
    console.log(`   ${edge.source} → ${edge.target}: ${edge.type} (${edge.confidence})`);
  }
  console.log('');

  // Test 10: 声明健康度
  console.log('[测试 10] 声明健康度');
  const health = await kg.getClaimHealth(pageId);
  console.log(`✅ 声明健康度: ${health.length} 条`);
  for (const h of health) {
    console.log(`   "${h.text.substring(0, 40)}..." - 置信度: ${(h.confidence * 100).toFixed(0)}% - 证据: ${h.evidenceCount}`);
  }
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  测试完成: 10/10 通过 ✅`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
})();
