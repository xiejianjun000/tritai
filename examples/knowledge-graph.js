const { KnowledgeGraphSystem } = require('../knowledge-graph.js');
(async () => {
  const kg = new KnowledgeGraphSystem();
  const pid = await kg.addPage({ title: '生态环境法典', claims: [{ text: '2026年3月12日通过', confidence: 0.95, evidence: [] }] });
  const stats = await kg.getStats();
  console.log('知识图谱统计:', JSON.stringify(stats, null, 2));
  const result = await kg.search('生态环境法典');
  console.log('搜索结果:', result.pages.length, '页面,', result.entities.length, '实体');
})();
