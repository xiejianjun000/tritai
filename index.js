/**
 * TriTai 三才 - OpenClaw Skill 入口
 * V0.4 - 集成太极开源知识图谱
 */

const { WfgyEngine, ZeroTokenGuard, TaijiClient } = require('./wfgy');

// 创建全局实例
let globalEngine = null;
let globalGuard = null;

function getEngine() {
  if (!globalEngine) {
    globalEngine = new WfgyEngine();
  }
  return globalEngine;
}

function getGuard() {
  if (!globalGuard) {
    globalGuard = new ZeroTokenGuard();
  }
  return globalGuard;
}

module.exports = {
  // 导出核心类
  WfgyEngine,
  ZeroTokenGuard,
  TaijiClient,
  
  // 便捷方法
  verify: (text, options = {}) => getEngine().verify(text),
  verifyWithKnowledgeGraph: (text, options = {}) => getEngine().verifyWithKnowledgeGraph(text, options),
  injectKnowledge: (knowledge) => getEngine().injectKnowledge(knowledge),
  getKnowledgeGraphStatus: () => getEngine().getKnowledgeGraphStatus(),
  
  // Skill hooks
  async beforeChat(context) {
    const engine = getEngine();
    const result = engine.detect(context.message);
    
    // 如果启用了知识图谱，进行增强验证
    if (context.options?.enableKnowledgeGraph) {
      const kgResult = await engine.verifyWithKnowledgeGraph(context.message, context.options);
      if (kgResult.hasHallucination && kgResult.confidence > 0.85) {
        return {
          block: true,
          reason: 'WFGY+知识图谱检测到潜在幻觉',
          evidence: kgResult.evidence,
          corrections: kgResult.corrections
        };
      }
    }
    
    if (result.detected && result.confidence > 0.9) {
      return {
        block: true,
        reason: 'WFGY检测到潜在幻觉',
        evidence: result.evidence
      };
    }
    
    return { continue: true };
  },
  
  async duringChat(token, context) {
    const guard = getGuard();
    
    // 增强模式：使用知识图谱验证
    if (context.options?.enableKnowledgeGraph) {
      const result = await guard.verifyTokenWithKnowledgeGraph(token, context.options);
      if (result.hasHallucination && result.confidence > 0.92) {
        return {
          interrupt: true,
          reason: 'WFGY+知识图谱紧急拦截',
          evidence: result.evidence,
          corrections: result.corrections
        };
      }
      return { continue: true };
    }
    
    // 标准模式
    const result = guard.detectToken(token);
    if (result.detected && result.confidence > 0.95) {
      return {
        interrupt: true,
        reason: 'WFGY紧急拦截',
        evidence: result.evidence
      };
    }
    
    return { continue: true };
  },
  
  async afterChat(response, context) {
    const engine = getEngine();
    
    // 增强模式
    if (context.options?.enableKnowledgeGraph) {
      const kgResult = await engine.verifyWithKnowledgeGraph(response.text, context.options);
      if (kgResult.hasHallucination) {
        return {
          warning: true,
          message: 'WFGY+知识图谱检测到潜在幻觉，请注意核实',
          evidence: kgResult.evidence,
          corrections: kgResult.corrections
        };
      }
      return response;
    }
    
    // 标准模式
    const result = engine.detect(response.text);
    if (result.detected) {
      return {
        warning: true,
        message: 'WFGY检测到潜在幻觉，请注意核实',
        evidence: result.evidence
      };
    }
    
    return response;
  }
};
