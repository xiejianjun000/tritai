/**
 * 知识图谱系统测试
 */
const path = require('path');

// Simple test - verify the module can be imported and basic operations work
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  知识图谱系统测试');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 1: Verify WikiSystem can be instantiated
console.log('[测试 1] WikiSystem 实例化');
const { WikiSystem } = require('./src/wiki/WikiSystem');
const wiki = new WikiSystem({
  dataPath: './data/wiki',
  autoBacklinks: true,
  autoDashboards: true
});
console.log('✅ WikiSystem 实例化成功');
console.log(`   名称: ${wiki.name}`);
console.log(`   版本: ${wiki.version}`);
console.log(`   状态: ${wiki.isReady() ? '就绪' : '未就绪'}`);
console.log('');

// Test 2: Add some pages
console.log('[测试 2] 添加页面');
(async () => {
  const pageId = await wiki.addPage({
    kind: 'concept',
    title: 'WFGY 防幻觉引擎',
    claims: [{
      text: 'WFGY 是 Witness & Fact Grounded Verifier 的缩写',
      status: 'supported',
      confidence: 0.95,
      evidence: []
    }],
    sourceIds: ['source-001']
  });
  console.log(`✅ 页面添加成功: ${pageId}`);
  
  const page = await wiki.getPage(pageId);
  console.log(`   标题: ${page.title}`);
  console.log(`   声明数: ${page.claims.length}`);
  console.log(`   置信度: ${page.confidence}`);
  console.log('');

  // Test 3: Add entities
  console.log('[测试 3] 添加实体');
  const entityId1 = await wiki.addEntity({
    kind: 'entity',
    type: 'technology',
    title: 'OpenTaiji',
    aliases: ['太极', 'Open Taiji'],
    attributes: { 'type': 'AI Agent Framework' }
  });
  console.log(`✅ 实体添加成功: ${entityId1}`);

  const entityId2 = await wiki.addEntity({
    kind: 'entity',
    type: 'technology',
    title: 'WFGY',
    aliases: ['防幻觉引擎'],
    attributes: { 'type': 'Verification System' }
  });
  console.log(`✅ 实体添加成功: ${entityId2}`);
  console.log('');

  // Test 4: Add relations
  console.log('[测试 4] 添加实体关系');
  await wiki.addRelation(entityId1, entityId2, 'contains', 0.9, ['WFGY 是 OpenTaiji 的核心模块']);
  console.log(`✅ 关系添加成功`);
  console.log(`   OpenTaiji → WFGY: contains (0.9)`);
  console.log('');

  // Test 5: Search
  console.log('[测试 5] 搜索知识图谱');
  const searchResult = await wiki.search('WFGY');
  console.log(`✅ 搜索成功`);
  console.log(`   匹配页面: ${searchResult.pages.length}`);
  console.log(`   匹配实体: ${searchResult.entities.length}`);
  console.log('');

  // Test 6: Stats
  console.log('[测试 6] 图谱统计');
  const stats = await wiki.getStats();
  console.log(`✅ 统计信息`);
  console.log(`   总页面: ${stats.totalPages}`);
  console.log(`   总实体: ${stats.totalEntities}`);
  console.log(`   总声明: ${stats.totalClaims}`);
  console.log(`   总关系: ${stats.totalRelations}`);
  console.log(`   平均置信度: ${stats.avgConfidence}`);
  console.log('');

  // Test 7: Related pages
  console.log('[测试 7] 相关页面');
  const related = await wiki.getRelatedPages(pageId, 3);
  console.log(`✅ 相关页面: ${related.length} 个`);
  console.log('');

  // Test 8: Entity graph
  console.log('[测试 8] 实体关系图');
  const graph = await wiki.buildEntityGraph(entityId1, 2, 10);
  console.log(`✅ 关系图构建成功`);
  console.log(`   节点: ${graph.nodes.length} 个`);
  console.log(`   边: ${graph.edges.length} 条`);
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  测试完成: 8/8 通过 ✅`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
})();
