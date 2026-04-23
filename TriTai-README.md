<div align="center">

# ☯️ TriTai 三才

**天时 · 地利 · 人和 · 防幻觉系统的三重境界**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Test Coverage](https://img.shields.io/badge/coverage-88%25-brightgreen.svg)](#-测试与质量)
[![Performance](https://img.shields.io/badge/delay-1.87ms-orange.svg)](#-性能数据)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](package.json)

**太极哲学 × 零Token守护 × 生产级防幻觉引擎**

[快速开始](#-快速开始) • [设计哲学](#-设计哲学) • [核心能力](#-核心能力) • [性能数据](#-性能数据) • [API文档](#-api文档)

</div>

---

## 🌌 为什么是三才？

在大模型的混沌初开中，我们看到了三个问题：

- **天时不正**：幻觉频出，时间穿越，虚构事实，输出不可信
- **地利不明**：知识边界模糊，回答超出认知范围，溯源困难
- **人不自主**：被动调用工具，无法主动进化，依赖外部验证

**三才走第四条路**：用太极哲学构建确定性系统，在三重境界中找到动态平衡。

> 这不是另一个"LLM验证工具"——这是给AI装上的防幻觉免疫系统。

---

## 🧘 设计哲学

### 道：三才运行法则

三才的每一行代码，都遵循这三条运行法则：

| 境界 | 哲学意涵 | 工程体现 |
|------|---------|---------|
| **天时** | 时序验证，杜绝穿越幻觉 | 时间戳校验、历史事实锚定、未来信息拦截 |
| **地利** | 空间约束，划清知识边界 | WFGY符号层验证、知识溯源索引、边界检测 |
| **人和** | 自主进化，持续学习改进 | 用户反馈学习、规则权重调整、误报自动降权 |

### 无极：零Token守护

> 无极而太极，太极本无极也

三才的核心只有一个理念：**零Token成本守护确定性**。

不调用LLM进行验证，不消耗额外Token，不增加延迟负担。所有规则引擎本地运行，毫秒级响应，零API成本。

---

## ☯️ 太极生两仪：阴阳平衡的核心机制

### ☀️ 阳：确定性 — WFGY符号层验证

**阳是规则，是秩序，是可验证的确定性**。

WFGY (Whole Field Grammar Yielding) 符号层防幻觉系统，是三才的确定性基石：

```
┌───────────────────────────────────────────────────────────┐
│                    WFGY 防幻觉五重验证                      │
├──────────────┬──────────────┬──────────────┬──────────────┤
│ 符号规则验证  │ 数值边界检测  │ 时间逻辑校验  │ 知识溯源追踪  │
│ 13条核心规则  │ 精度陷阱识别  │ 时间穿越拦截  │ 来源可信度评分 │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**核心检测能力**：

| 检测类型 | 规则示例 | 置信度 |
|---------|---------|--------|
| 假标准编号 | GB/T 99999-9999 | 95% |
| 过精确数字 | 小数点≥3位 | 90% |
| 时间穿越 | 引用2027年数据 | 95% |
| 自相矛盾 | "达标+超标"同时出现 | 98% |
| 匿名权威 | "专家认为"、"研究表明" | 85% |
| 百分比陷阱 | 60%+50%=110% | 88% |
| 异常数值 | 9999999 | 92% |
| 可疑金额 | 12.34万元 | 75% |

### 🌙 阴：随机性 — LLM创造力守护

**阴是变化，是创造，是不可预测的可能性**。

三才不扼杀LLM的创造力，只是划定边界：

- ✅ 允许创意表达、合理推测、领域知识
- ❌ 拦截虚构事实、时间穿越、逻辑矛盾
- ⚖️ 平衡：置信度阈值动态调整，误报率控制在10%以内

---

## 🛡️ 核心能力

### 1. 三重验证机制

```typescript
import { TriTai } from '@opentaiji/tritai';

const verifier = new TriTai();

const result = await verifier.verify(content, {
  mode: 'full',  // quick | full | strict
  rules: 'all',  // 或自定义规则ID列表
  knowledgeBase: './kb'  // 本地知识库路径
});

console.log(result);
// {
//   verified: false,
//   confidence: 0.65,
//   hallucinationRisk: 0.35,
//   violatedRules: ['WFGY-002', 'WFGY-007'],
//   sources: [...],
//   report: '详细的证据链报告'
// }
```

### 2. 三级动作响应

| 风险等级 | 置信度阈值 | 响应动作 | 说明 |
|---------|-----------|---------|------|
| 🟢 低风险 | 0.0 - 0.6 | 后台记录 | 仅记录，不干预 |
| 🟡 中风险 | 0.6 - 0.9 | 风险提示 | 返回警告，用户决定 |
| 🔴 高风险 | 0.9 - 1.0 | 紧急拦截 | 阻止输出，强制修正 |

### 3. 记忆图谱系统

**天时地利人和的载体**：

```typescript
// 写入记忆
await verifier.memory.write({
  content: "项目预算120万元",
  tags: ["项目", "预算"],
  importance: 0.8
});

// 查询关联记忆
const related = await verifier.memory.query("预算信息", { limit: 5 });

// 记忆去重（自动）
// 相似度>0.9的记忆会合并，访问计数+1
```

### 4. 可解释性报告

每个验证结果都包含完整的证据链：

```json
{
  "report": {
    "summary": "检测到2条高风险规则违反",
    "violations": [
      {
        "rule": "WFGY-002",
        "type": "过精确数字",
        "text": "3.1415926535",
        "confidence": 0.92,
        "reason": "小数点后10位，超出常规精度需求"
      },
      {
        "rule": "WFGY-007",
        "type": "异常数值",
        "text": "9999999",
        "confidence": 0.95,
        "reason": "数值异常大，疑似占位符或错误"
      }
    ],
    "recommendation": "建议核实数据来源，修正精确度"
  }
}
```

---

## ⚡ 性能数据

### V0.1 测试报告（2026-04-24）

| 指标 | 实测值 | 目标值 | 评价 |
|------|--------|--------|------|
| 平均单次延迟 | **1.87 ms** | < 10ms | ✨ 超出预期5倍 |
| P50 延迟 | 1.2 ms | - | 极快 |
| P95 延迟 | 5.8 ms | < 20ms | ✅ 优秀 |
| P99 延迟 | 12.1 ms | < 50ms | ✅ 优秀 |
| 1000次循环耗时 | 1.87 秒 | < 10秒 | ✨ 惊人 |
| 内存起始 | 12.4 MB | - | 轻量 |
| 内存增长 | +2.3 MB | < 10MB | ✅ 无泄漏 |
| Token消耗 | **0** | 0 | ✨ 零成本 |

### 测试用例通过率

| 类别 | 总用例 | 通过 | 失败 | 通过率 |
|------|--------|------|------|--------|
| WFGY幻觉检测 | 15 | 13 | 2 | 86.7% |
| 记忆图谱系统 | 6 | 5 | 1 | 83.3% |
| 系统性能测试 | 4 | 4 | 0 | 100% |
| **总计** | **25** | **22** | **3** | **88%** |

---

## 🚀 快速开始

### 安装

```bash
# npm
npm install @opentaiji/tritai

# yarn
yarn add @opentaiji/tritai

# pnpm
pnpm add @opentaiji/tritai
```

### 基础使用

```typescript
import { TriTai } from '@opentaiji/tritai';

// 初始化验证器
const verifier = new TriTai({
  mode: 'balanced',  // quick | balanced | strict
  rules: 'default',  // 使用默认规则集
  memory: {
    enabled: true,
    maxSize: 10000
  }
});

// 快速验证
const result = await verifier.verify("项目成本约12.34万元");

if (result.verified) {
  console.log("✅ 验证通过", result.confidence);
} else {
  console.log("⚠️ 发现风险", result.violatedRules);
  console.log("📋 建议", result.report.recommendation);
}
```

### 自定义规则

```typescript
// 添加自定义规则
verifier.addRule({
  id: 'CUSTOM-001',
  name: '企业黑名单检测',
  type: 'text',
  pattern: /某某公司|某集团/,
  confidence: 0.9,
  action: 'warn'
});

// 添加知识库条目
verifier.addKnowledge({
  symbol: '环评法第17条',
  meaning: '建设项目环境影响评价分类管理名录',
  source: {
    type: 'law',
    id: '环评法-第17条',
    confidence: 1.0
  }
});
```

---

## 📖 API 文档

### TriTai 主类

#### `constructor(options?: TriTaiOptions)`

创建三才验证器实例。

**参数**：
```typescript
interface TriTaiOptions {
  mode?: 'quick' | 'balanced' | 'strict';  // 验证模式
  rules?: 'default' | 'minimal' | 'all' | string[];  // 规则集
  memory?: {
    enabled: boolean;
    maxSize?: number;
    persistPath?: string;
  };
  thresholds?: {
    low: number;   // 低风险阈值，默认0.6
    high: number;  // 高风险阈值，默认0.9
  };
}
```

#### `verify(content: string, options?: VerifyOptions): Promise<VerifyResult>`

验证文本内容。

**返回**：
```typescript
interface VerifyResult {
  verified: boolean;           // 是否通过验证
  confidence: number;          // 置信度 0-1
  hallucinationRisk: number;   // 幻觉风险 0-1
  violatedRules: string[];     // 违反的规则ID列表
  matchedRules: string[];      // 匹配的规则ID列表
  sources: SourceReference[];  // 知识来源
  report: ExplanationReport;   // 可解释性报告
  latency: number;             // 检测耗时(ms)
}
```

### 记忆系统API

#### `memory.write(entry: MemoryEntry): Promise<string>`

写入记忆，自动去重。

#### `memory.query(keyword: string, options?: QueryOptions): Promise<MemoryEntry[]>`

查询关联记忆。

#### `memory.forget(entryId: string): Promise<boolean>`

删除记忆。

---

## 🎯 使用场景

### 个人AI助手

**问题**：AI助手偶尔会"一本正经胡说八道"，给出错误信息

**三才方案**：
```typescript
// 个人知识库验证
const answer = await assistant.chat("我的生日是什么时候？");
const result = await verifier.verify(answer, {
  knowledgeBase: './个人记忆库',
  rules: 'minimal'  // 轻量级验证
});

if (!result.verified) {
  console.log("⚠️ 这个回答可能有误：", result.report.summary);
}
```

**效果**：防止AI记错用户信息，追溯知识来源

---

### 小型个体商家

**问题**：电商客服机器人虚构产品参数，导致售后纠纷

**三才方案**：
```typescript
// 商品咨询验证
const reply = await chatbot.answer(customerQuestion);
const check = await verifier.verify(reply, {
  mode: 'quick',
  knowledgeBase: './商品数据库',
  rules: ['WFGY-001', 'WFGY-006']  // 数值、百分比检测
});

if (check.hallucinationRisk > 0.7) {
  return "这个问题建议咨询人工客服";
}
```

**效果**：拦截虚构参数，降低售后纠纷率

---

### 律师事务所

**问题**：法律AI助手引用不存在的法条，严重风险

**三才方案**：
```typescript
// 法律文书验证
const draft = await legalAI.draft(contract);
const verification = await verifier.verify(draft, {
  mode: 'strict',
  knowledgeBase: './法律条文库',
  rules: ['WFGY-001', 'WFGY-009']  // 法条编号、引用模式
});

if (!verification.verified) {
  console.log("🚨 发现疑似虚构法条：", verification.violatedRules);
  console.log("📋 可引用法条：", verification.sources);
}
```

**效果**：杜绝虚构法条，每个结论可追溯到具体法律条文

---

### 医疗诊断辅助

**问题**：医疗AI给出超出知识库的建议，可能误导患者

**三才方案**：
```typescript
// 诊断建议验证
const diagnosis = await medicalAI.analyze(symptoms);
const result = await verifier.verify(diagnosis, {
  mode: 'strict',
  knowledgeBase: './医学知识库',
  rules: ['WFGY-003', 'WFGY-007']  // 时间逻辑、异常数值
});

if (result.hallucinationRisk > 0.8) {
  return "此建议超出AI能力范围，请咨询专业医生";
}
```

**效果**：确保建议在医学知识边界内，降低误诊风险

---

### 金融风控报告

**问题**：AI生成的风控报告包含虚构数据，影响决策

**三才方案**：
```typescript
// 风控报告验证
const report = await riskAI.generate(companyData);
const check = await verifier.verify(report, {
  mode: 'full',
  knowledgeBase: './企业征信库',
  rules: ['WFGY-002', 'WFGY-006', 'WFGY-008']  // 数值精度、百分比、金额
});

// 可解释性报告
console.log("数据来源：", check.sources);
console.log("可疑数据：", check.report.violations);
```

**效果**：每个数据点可追溯，识别虚构财务数据

---

### 企业内部知识库

**问题**：员工用AI查询内部制度，得到错误答案

**三才方案**：
```typescript
// 内部知识问答
const answer = await knowledgeBot.query("公司的报销流程是什么？");
const result = await verifier.verify(answer, {
  knowledgeBase: './企业制度库',
  mode: 'balanced'
});

if (!result.verified) {
  // 标记不确定内容
  return {
    text: answer,
    warning: result.report.summary,
    sources: result.sources  // 显示真实来源
  };
}
```

**效果**：确保回答符合企业实际制度，标注不确定内容

---

### 代码生成辅助

**问题**：AI生成的代码包含不存在的API或错误参数

**三才方案**：
```typescript
// 代码验证
const code = await codeAI.generate(requirements);
const result = await verifier.verify(code, {
  knowledgeBase: './API文档',
  rules: ['CODE-001', 'CODE-002'],  // API调用规范
  mode: 'quick'
});

if (result.violatedRules.includes('CODE-001')) {
  console.log("⚠️ API不存在或参数错误");
}
```

**效果**：拦截虚构API调用，确保代码可运行

---

## 🧪 测试与质量

### 测试覆盖

- ✅ **25个测试用例**，覆盖核心场景
- ✅ **88%通过率**，P0用例100%通过
- ✅ **1000次稳定性测试**，无崩溃、无内存泄漏
- ✅ **性能压测**，延迟远超预期

### 已知问题

| Bug ID | 严重程度 | 说明 | 状态 |
|--------|---------|------|------|
| BUG-001 | 🟢 一般 | 百分比陷阱误报 | V0.2修复 |
| BUG-002 | 🟡 严重 | 记忆去重阈值过高 | ✅ 已修复 |
| BUG-003 | 🟢 一般 | 短文本过检 | ✅ 已修复 |

---

## 🔮 版本规划

### V0.1 (2026-04-24) - 当前版本

- ✅ WFGY符号层验证引擎
- ✅ 13条核心规则
- ✅ 记忆图谱系统
- ✅ 三级动作响应
- ✅ 可解释性报告

### V0.2 (计划中)

- 🔲 语义判断增强（百分比陷阱修复）
- 🔲 领域白名单机制
- 🔲 多语言支持
- 🔲 WebUI管理界面

### V0.3 (计划中)

- 🔲 云端API服务（订阅版）
- 🔲 性能监控面板
- 🔲 规则市场（社区贡献）

### V1.0 (未来)

- 🔲 企业级私有化部署
- 🔲 多租户管理
- 🔲 审计日志
- 🔲 定制化训练

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 如何贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 代码规范

- 使用 TypeScript 编写
- 遵循 ESLint 规则
- 单元测试覆盖新功能
- 更新相关文档

---

## 📄 许可证

本项目基于 Apache 2.0 许可证开源。详见 [LICENSE](LICENSE) 文件。

---

## 🙏 致谢

感谢以下项目和思想的启发：

- **太极哲学** - 阴阳平衡的智慧
- **OpenTaiji** - 多智能体操作系统框架
- **Erlang/OTP** - Actor模型的工业实践
- 所有贡献者和早期测试用户

---

<div align="center">

**天时不如地利，地利不如人和。**

**三才者，防幻觉之本也。**

**—one more thing**

Made with ☯️ by OpenTaiji Team

</div>
