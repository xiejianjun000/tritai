/**
 * TriTai 三才 - WFGY + 太极开源集成测试
 * 测试知识图谱集成效果
 */

const { WfgyEngine, ZeroTokenGuard } = require('./wfgy');

async function runTests() {
  console.log('='.repeat(60));
  console.log('TriTai WFGY + 太极开源知识图谱 集成测试');
  console.log('='.repeat(60));
  
  const engine = new WfgyEngine({
    enableKnowledgeGraph: true,
    taijiApiBase: process.env.TAIJI_API_BASE || 'http://localhost:8080/api'
  });
  
  console.log('\n[1] 知识图谱连接状态');
  console.log('-'.repeat(40));
  const status = await engine.getKnowledgeGraphStatus();
  console.log('连接状态:', status.connected ? '✅ 已连接' : '⚠️ 未连接/离线');
  if (status.stats) console.log('统计:', status.stats);
  if (status.error) console.log('错误:', status.error);
  
  // 测试用例
  const testCases = [
    {
      name: '生态环境法典状态错误',
      text: '根据最新政策，生态环境法典尚未颁布，相关法规仍以环境保护法为准。',
      expected: '应检测到幻觉'
    },
    {
      name: '假标准编号',
      text: '该产品符合GB-20255678国家标准要求。',
      expected: '应检测到假标准编号'
    },
    {
      name: '时间穿越',
      text: '预计在2028年将实施新的排放标准。',
      expected: '应检测到未来时间'
    },
    {
      name: '自相矛盾',
      text: '该项目达标排放，符合国家标准，不存在超标问题。',
      expected: '应检测到逻辑矛盾'
    },
    {
      name: '正常文本',
      text: '根据2025年发布的环境保护法，企业应当采取有效措施减少污染排放。',
      expected: '应判定为正常'
    }
  ];
  
  console.log('\n[2] WFGY本地规则检测');
  console.log('-'.repeat(40));
  
  for (const tc of testCases) {
    const result = engine.detect(tc.text);
    console.log(`\n📋 ${tc.name}`);
    console.log(`   文本: "${tc.text.substring(0, 50)}..."`);
    console.log(`   检测: ${result.detected ? '❌ 发现问题' : '✅ 正常'}`);
    console.log(`   置信度: ${(result.confidence * 100).toFixed(1)}%`);
    if (result.evidence.length > 0) {
      console.log(`   证据: ${result.evidence.join('; ')}`);
    }
  }
  
  console.log('\n[3] 增强验证（WFGY + 知识图谱）');
  console.log('-'.repeat(40));
  
  for (const tc of testCases) {
    console.log(`\n📋 ${tc.name}`);
    try {
      const kgResult = await engine.verifyWithKnowledgeGraph(tc.text, { timeout: 3000 });
      console.log(`   幻觉判定: ${kgResult.hasHallucination ? '❌ 是' : '✅ 否'}`);
      console.log(`   综合置信度: ${(kgResult.confidence * 100).toFixed(1)}%`);
      
      if (kgResult.sources.wfgy?.evidence) {
        console.log(`   WFGY证据: ${kgResult.sources.wfgy.evidence.join('; ')}`);
      }
      if (kgResult.sources.knowledgeGraph) {
        const kg = kgResult.sources.knowledgeGraph;
        console.log(`   知识图谱: ${kg.error ? '⚠️ ' + kg.error : '✅ 可用'}`);
        if (kg.sources) console.log(`   KG来源: ${Array.isArray(kg.sources) ? kg.sources.join(', ') : kg.sources}`);
      }
      if (kgResult.corrections?.length > 0) {
        console.log(`   校正建议: ${kgResult.corrections[0]?.suggestion?.substring(0, 60)}...`);
      }
    } catch (error) {
      console.log(`   错误: ${error.message}`);
    }
  }
  
  console.log('\n[4] 注入法典知识测试');
  console.log('-'.repeat(40));
  
  const ecoCodexKnowledge = {
    name: '生态环境法典',
    category: '法律',
    facts: [
      { key: '通过时间', value: '2026年3月12日' },
      { key: '施行时间', value: '2026年8月15日' },
      { key: '法典结构', value: '共5编、1242条' },
      { key: '主要内容', value: '总则、污染防治、生态保护、绿色低碳发展、法律责任和附则' }
    ],
    source: '十四届全国人大四次会议'
  };
  
  const injectResult = await engine.injectKnowledge(ecoCodexKnowledge);
  console.log('注入结果:', injectResult.success ? '✅ 成功' : '❌ 失败');
  if (injectResult.error) console.log('错误:', injectResult.error);
  
  console.log('\n' + '='.repeat(60));
  console.log('测试完成');
  console.log('='.repeat(60));
}

// 执行测试
runTests().catch(console.error);
