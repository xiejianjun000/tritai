/**
 * 三才技能验证系统
 * 随时验证WFGY + 知识图谱 + 进化闭环
 */

const { WfgyEngine, ZeroTokenGuard, TaijiClient } = require('./wfgy.js');

class TriTaiVerifier {
  constructor() {
    this.engine = new WfgyEngine({ 
      taijiApiBase: 'http://localhost:8080',
      enableKnowledgeGraph: true 
    });
    this.guard = new ZeroTokenGuard({ threshold: 10, enableKnowledgeGraph: true });
    this.results = [];
  }

  log(name, passed, details = {}) {
    const result = {
      test: name,
      passed,
      timestamp: new Date().toISOString(),
      ...details
    };
    this.results.push(result);
    
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${name}`);
    if (details.message) console.log(`   ${details.message}`);
    return result;
  }

  async runAllTests() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  三才技能验证系统 V0.4');
    console.log('  天时 · 地利 · 人和');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await this.testWfgyRules();
    await this.testKnowledgeGraph();
    await this.testPhilosophy();
    await this.testIntegration();
    
    this.printSummary();
    return this.results;
  }

  async testWfgyRules() {
    console.log('\n【天时 - WFGY规则引擎】');
    
    // R001 假标准编号
    const r1 = this.engine.detect('根据GB 99999-2020标准要求...');
    this.log('R001 假标准编号检测', r1.detected && r1.rules[0]?.rule === 'R001', {
      message: r1.detected ? `检测到: ${r1.evidence[0]}` : '未检测到'
    });

    // R003 时间穿越
    const r3 = this.engine.detect('2028年发布的政策规定...');
    this.log('R003 时间穿越检测', r3.detected, {
      message: r3.detected ? `检测到: ${r3.evidence[0]}` : '未检测到'
    });

    // R004 自相矛盾
    const r4 = this.engine.detect('该项目达标但部分指标超标...');
    this.log('R004 自相矛盾检测', r4.detected, {
      message: r4.detected ? `检测到: ${r4.evidence[0]}` : '未检测到'
    });

    // R005 生态环境法典状态
    const r5 = this.engine.detect('生态环境法典尚未颁布...');
    this.log('R005 法典状态更正', r5.detected && r5.corrections[0]?.suggestion.includes('2026年3月12日'), {
      message: r5.detected ? '法典通过日期已更正' : '未检测到错误'
    });

    // R006 虚假历史
    const r6 = this.engine.detect('生态环境法典于2023年颁布实施...');
    this.log('R006 虚假历史检测', r6.detected, {
      message: r6.detected ? `检测到: ${r6.evidence[0]}` : '未检测到'
    });
  }

  async testKnowledgeGraph() {
    console.log('\n【地利 - 知识图谱验证】');
    
    try {
      const kgStatus = await this.engine.getKnowledgeGraphStatus();
      this.log('知识图谱连接', kgStatus.connected, {
        message: kgStatus.connected 
          ? `实体: ${kgStatus.stats?.totalEntities}, 事实: ${kgStatus.stats?.totalFacts}` 
          : kgStatus.error
      });

      // 验证集成
      const verifyResult = await this.engine.verifyWithKnowledgeGraph(
        '根据GB 88888-2025规定...',
        { timeout: 3000 }
      );
      this.log('WFGY+KG联合验证', verifyResult.sources.knowledgeGraph !== undefined, {
        message: `置信度: ${(verifyResult.confidence * 100).toFixed(1)}%`
      });
    } catch (error) {
      this.log('知识图谱验证', false, { message: error.message });
    }
  }

  async testPhilosophy() {
    console.log('\n【人和 - 自一致性检查】');
    
    // 测试自一致性（同一问题多次验证结果一致）
    const testText = '生态环境法典已于2023年颁布实施';
    const results = [];
    for (let i = 0; i < 3; i++) {
      results.push(this.engine.detect(testText));
    }
    
    const consistent = results.every(r => r.detected === results[0].detected);
    this.log('自一致性验证', consistent, {
      message: `3次验证结果${consistent ? '一致' : '不一致'}`
    });
  }

  async testIntegration() {
    console.log('\n【集成测试】');
    
    // 测试完整流程
    const testCases = [
      {
        text: '根据GB 123456-2024标准，2029年将实施新政策',
        expected: ['R001', 'R003']
      },
      {
        text: '生态环境法典已于2025年颁布，目前达标同时超标',
        expected: ['R004', 'R006']
      }
    ];

    for (const tc of testCases) {
      const result = this.engine.detect(tc.text);
      const detectedRules = result.rules.map(r => r.rule);
      const allFound = tc.expected.every(e => detectedRules.includes(e));
      this.log(`综合测试: ${tc.text.substring(0, 20)}...`, allFound, {
        message: `预期[${tc.expected.join(',')}] 检测到[${detectedRules.join(',')}]`
      });
    }
  }

  printSummary() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const rate = ((passed / total) * 100).toFixed(0);
    
    console.log(`  验证完成: ${passed}/${total} 通过 (${rate}%)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (passed === total) {
      console.log('🎉 三才技能状态正常，随时可用！');
    } else {
      console.log('⚠️ 部分测试未通过，请检查相关模块');
    }
  }
}

// 快速验证入口
async function quickVerify() {
  const verifier = new TriTaiVerifier();
  return await verifier.runAllTests();
}

// 导出
module.exports = { TriTaiVerifier, quickVerify };

// 直接运行
if (require.main === module) {
  quickVerify().catch(console.error);
}
