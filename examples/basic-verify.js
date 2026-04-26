const { WfgyEngine } = require('../wfgy.js');
const engine = new WfgyEngine();
const tests = [
  '根据GB 99999-2025标准要求，企业排放达标',
  '生态环境法典于2026年3月12日通过，今日PM2.5为35',
  '2028年将实施新的排放标准，某企业实现零碳排放',
];
tests.forEach(t => {
  const r = engine.detect(t);
  console.log(`\n"${t}"`);
  console.log(`  ${r.detected ? '❌ 幻觉' : '✅ 正常'} (置信度: ${((r.confidence||0)*100).toFixed(0)}%)`);
  (r.evidence||[]).forEach(e => console.log(`    ${e}`));
});
