/**
 * TriTai 三才 - WFGY防幻觉引擎
 * 零Token守护，天时·地利·人和
 * V0.5 - 2026-04-24 修复R001规则，增强知识图谱连接
 */

const http = require('http');

class TaijiClient {
  constructor(baseUrl = 'http://localhost:8080') {
    this.baseUrl = baseUrl;
  }

  async request(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: { 'Content-Type': 'application/json' }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch {
            resolve({ raw: data });
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(5000, () => { req.destroy(); reject(new Error('Timeout')); });
      
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  async verify(text, context = {}) {
    return this.request('/api/wiki/verify', 'POST', { text, context });
  }

  async injectKnowledge(knowledge) {
    return this.request('/api/wiki/inject', 'POST', knowledge);
  }

  async getStats() {
    return this.request('/api/wiki/stats');
  }
}

class WfgyEngine {
  constructor(options = {}) {
    this.taijiClient = new TaijiClient(options.taijiApiBase);
    this.enableKnowledgeGraph = options.enableKnowledgeGraph !== false;
    
    this.rules = [
      {
        id: 'R001',
        name: '假标准编号',
        pattern: /GB[-\s]?\d{4,6}[-\s]?\d{0,4}/gi,
        type: 'format_error',
        baseConfidence: 0.95,
        check: (text, match) => {
          // 提取编号部分
          const cleaned = match.replace(/GB[-\s]?/i, '');
          const numbers = cleaned.match(/\d+/g);
          if (numbers && numbers.length >= 1) {
            const mainNum = parseInt(numbers[0]);
            // 国家标准编号通常不超过4位 (如 GB 1234-2020)
            // 如果是5位或以上，很可能是假的
            return mainNum > 9999 || mainNum.toString().length > 4;
          }
          return false;
        },
        correction: (match) => {
          return `"${match}"可能不是真实的国家标准编号。建议核实：国家标准格式通常为"GB XXXX-XXXX"，编号不超过4位数字。`;
        }
      },
      {
        id: 'R003',
        name: '时间穿越',
        pattern: /20[2-9]\d年/g,
        type: 'future_hallucination',
        baseConfidence: 0.90,
        check: (text, match) => {
          const year = parseInt(match);
          const currentYear = new Date().getFullYear();
          return year > currentYear;
        },
        correction: (match) => {
          const currentYear = new Date().getFullYear();
          return `"${match}"是未来时间（当前年份${currentYear}年），无法作为已发生事件的时间依据。`;
        }
      },
      {
        id: 'R004',
        name: '自相矛盾',
        pattern: /(达标|超标|符合|不符合|合格|不合格)/g,
        type: 'logical_contradiction',
        baseConfidence: 0.92,
        check: (text) => {
          const positive = ['达标', '符合', '合格'];
          const negative = ['超标', '不符合', '不合格'];
          const hasPositive = positive.some(p => text.includes(p));
          const hasNegative = negative.some(n => text.includes(n));
          return hasPositive && hasNegative;
        },
        correction: () => {
          return '检测到文本中同时存在"达标/符合/合格"与"超标/不符合/不合格"等相互矛盾的表述，建议核实具体数据后明确结论。';
        }
      },
      {
        id: 'R005',
        name: '错误的法律状态描述',
        pattern: /(生态环境法典|环境保护法典|环保法典)/g,
        type: 'fact_error',
        baseConfidence: 0.95,
        check: (text) => {
          return text.includes('生态环境法典') && 
                 (text.includes('未颁布') || text.includes('尚未颁布') || 
                  text.includes('还没颁布') || text.includes('不存在'));
        },
        correction: () => {
          return `🚨 **事实更正**：
"生态环境法典"已于**2026年3月12日**由十四届全国人大四次会议表决通过！
• 生效时间：2026年8月15日
• 法典结构：共5编、1242条`;
        }
      },
      {
        id: 'R006',
        name: '虚假历史发布信息',
        pattern: /生态环境法典.*?(\d{4})年.*?(发布|颁布|实施)/g,
        type: 'past_hallucination',
        baseConfidence: 0.90,
        check: (text) => {
          const yearMatch = text.match(/生态环境法典.*?(\d{4})年/);
          if (yearMatch) {
            const year = parseInt(yearMatch[1]);
            return year < 2026;
          }
          return false;
        },
        correction: () => {
          return `🚨 **时间错误更正**：
生态环境法典于2026年3月12日通过，2026年8月15日施行。`;
        }
      }
    ];
  }

  detect(text) {
    if (!text || text.length < 10) {
      return { detected: false, confidence: 0, rules: [], evidence: [], corrections: [] };
    }

    const results = [];
    const evidence = [];
    const corrections = [];

    for (const rule of this.rules) {
      const matches = text.match(rule.pattern);
      if (matches) {
        for (const match of matches) {
          const isHallucination = rule.check(text, match);
          if (isHallucination) {
            results.push({
              rule: rule.id,
              name: rule.name,
              confidence: rule.baseConfidence,
              match: match,
              type: rule.type
            });
            
            evidence.push(`[${rule.id}] ${rule.name}: 发现"${match}"`);
            
            if (rule.correction) {
              corrections.push({
                rule: rule.id,
                name: rule.name,
                match: match,
                suggestion: rule.correction(match, text)
              });
            }
          }
        }
      }
    }

    let overallConfidence = 0;
    if (results.length > 0) {
      overallConfidence = results.reduce((max, r) => Math.max(max, r.confidence), 0);
      if (results.length >= 2) {
        overallConfidence = Math.min(0.98, overallConfidence + 0.05 * results.length);
      }
    }

    return {
      detected: results.length > 0,
      confidence: overallConfidence,
      rules: results,
      evidence,
      corrections,
      sources: ['wfgy']
    };
  }

  async verifyWithKnowledgeGraph(text, options = {}) {
    const { context = {}, timeout = 5000 } = options;
    const localResult = this.detect(text);
    
    let kgResult = null;
    if (this.enableKnowledgeGraph) {
      try {
        kgResult = await Promise.race([
          this.taijiClient.verify(text, context),
          new Promise((_, reject) => setTimeout(() => reject(new Error('KG超时')), timeout))
        ]);
      } catch (error) {
        kgResult = { hasHallucination: false, confidence: 0.5, error: error.message };
      }
    }
    
    const hasHallucination = localResult.detected || (kgResult?.hasHallucination || false);
    const confidence = kgResult ? Math.max(localResult.confidence, kgResult.confidence || 0) : localResult.confidence;
    
    return {
      hasHallucination,
      confidence,
      sources: { wfgy: localResult, knowledgeGraph: kgResult },
      evidence: [...localResult.evidence, ...(kgResult?.evidence || [])],
      corrections: [...localResult.corrections, ...(kgResult?.corrections || [])]
    };
  }

  async injectKnowledge(knowledge) {
    return this.taijiClient.injectKnowledge(knowledge);
  }

  async getKnowledgeGraphStatus() {
    try {
      const stats = await this.taijiClient.getStats();
      return { connected: true, stats };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }
}

class ZeroTokenGuard {
  constructor(options = {}) {
    this.engine = new WfgyEngine(options);
    this.buffer = '';
    this.threshold = options.threshold || 10;
  }

  detectToken(token) {
    this.buffer += token;
    if (this.buffer.length >= this.threshold) {
      const result = this.engine.detect(this.buffer);
      this.buffer = '';
      return result;
    }
    return { detected: false };
  }

  detectText(text) {
    return this.engine.detect(text);
  }

  async verifyTokenWithKnowledgeGraph(token, options = {}) {
    this.buffer += token;
    if (this.buffer.length >= this.threshold) {
      const result = await this.engine.verifyWithKnowledgeGraph(this.buffer, options);
      this.buffer = '';
      return result;
    }
    return { hasHallucination: false, confidence: 0 };
  }
}

module.exports = { WfgyEngine, ZeroTokenGuard, TaijiClient };
