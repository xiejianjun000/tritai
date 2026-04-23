# 三才技能 TriTai Skill

## 核心理念
**天时 · 地利 · 人和** - 太极哲学驱动的防幻觉引擎

- **天时**：WFGY规则引擎（时间检测R003/R006）
- **地利**：知识图谱验证（太极开源Wiki API）
- **人和**：自一致性检查（多次验证结果一致）

## 技术核心
**WFGY是技术核心，知识图谱、进化闭环都是加持**

## 快速验证
```bash
cd /root/.openclaw/workspace/skills/tritai
node verify.js
```

## 核心能力

### 1. WFGY规则检测
| 规则 | 名称 | 检测内容 |
|------|------|----------|
| R001 | 假标准编号 | GB编号超过4位数字 |
| R003 | 时间穿越 | 未来年份作为已发生事件 |
| R004 | 自相矛盾 | 同时出现达标/超标等矛盾表述 |
| R005 | 法律状态错误 | 生态环境法典未颁布的错误说法 |
| R006 | 虚假历史 | 法典颁布时间早于2026年 |

### 2. 知识图谱验证
```javascript
const { WfgyEngine } = require('./wfgy.js');
const engine = new WfgyEngine({ enableKnowledgeGraph: true });

// 本地WFGY检测
const result = engine.detect(text);

// WFGY + 知识图谱联合验证
const fullResult = await engine.verifyWithKnowledgeGraph(text);
```

### 3. 零Token守护
```javascript
const { ZeroTokenGuard } = require('./wfgy.js');
const guard = new ZeroTokenGuard({ threshold: 10 });

// 流式检测
stream.on('token', token => {
  const result = guard.detectToken(token);
  if (result.detected) {
    console.log('检测到幻觉:', result.evidence);
  }
});
```

## 文档索引
- `docs/WFGY核心原理.md` - 技术核心详解
- `docs/太极哲学驱动.md` - 核心理念（天时地利人和）
- `docs/三才进化方案V1.0.md` - 进化闭环设计
- `docs/前瞻性风险预判.md` - 15个风险预判
- `docs/商业前瞻布局.md` - 商业策略

## 版本
V0.5 - 2026-04-24
