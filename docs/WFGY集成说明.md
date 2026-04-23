# WFGY符号层集成说明

## 集成点

### 1. 候选规则批准 → WFGY注入

```typescript
// 批准规则时自动注入到WFGY引擎
router.post('/candidates/:id/approve', (req, res) => {
  // ...
  const injected = injectRuleToWfgy(rule.id);
  // 返回 wfgyInjected: true/false
});
```

### 2. 漏报反馈 → 规则建议

```typescript
// 从漏报中提取WFGY规则建议
const suggestion = extractWfgyRuleFromFeedback(feedbackId);
// 返回 { suggestedPattern, confidence, ... }
```

### 3. WFGY引擎注入

```typescript
// 外部注入WFGY引擎实例
import { WfgyEngine } from 'tritai/wfgy.js';
import { setWfgyEngine } from 'tritai-evolution/api/TriTaiEvolutionServer';

setWfgyEngine(wfgyEngine);
```

## 符号层能力

| 符号 | 说明 | 示例 |
|------|------|------|
| R001 | 假标准编号 | GB-20255678 |
| R003 | 时间穿越 | 2028年 |
| R004 | 自相矛盾 | 达标+超标 |
| R005 | 错误法律状态 | 法典未颁布 |
| R006 | 虚假历史 | 2025年发布 |

## 规则格式转换

候选规则 → WFGY规则：

```typescript
{
  id: 'R007',
  name: '数字幻觉检测',
  pattern: /\d+(\.\d+)?/gi,
  type: 'pattern_hallucination',
  baseConfidence: 0.85,
  check: (text, match) => { ... },
  correction: (match) => `...`
}
```

## 调用流程

```
用户反馈(漏报) → extractWfgyRuleFromFeedback()
                       ↓
              创建候选规则 → 审批
                       ↓
              injectRuleToWfgy()
                       ↓
              WFGY引擎.addRule()
                       ↓
              新规则生效
```

## 文件位置

- 服务端：`open-taiji/src/modules/tritai-evolution/api/TriTaiEvolutionServer.ts`
- WFGY引擎：`/root/.openclaw/workspace/skills/tritai/wfgy.js`
- 文档：`./三才/三才进化方案V1.0.md`
