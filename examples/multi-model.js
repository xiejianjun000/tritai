const { WfgyEngine } = require('../wfgy.js');
const engine = new WfgyEngine();
console.log('WFGY 规则检测示例:');
const rules = engine.rules || [];
rules.forEach(r => console.log(`  ${r.id}: ${r.name} (置信度: ${(r.baseConfidence*100).toFixed(0)}%)`));
