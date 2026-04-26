const { WfgyEngine, ZeroTokenGuard } = require('../wfgy.js');
const { KnowledgeGraphSystem } = require('../knowledge-graph.js');
// API 集成示例
const engine = new WfgyEngine();
const kg = new KnowledgeGraphSystem();
kg.setWfgyVerifier(engine);
console.log('API 集成测试完成');
console.log('WFGY 引擎:', engine.name);
console.log('知识图谱:', kg.name);
