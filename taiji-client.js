/**
 * TriTai 三才 - 太极开源API客户端
 * 调用太极开源知识图谱能力
 */

const TAIJI_API_BASE = process.env.TAIJI_API_BASE || 'http://localhost:8080/api';

class TaijiClient {
  constructor(baseUrl = TAIJI_API_BASE) {
    this.baseUrl = baseUrl;
  }

  /**
   * 验证知识声明（核心接口）
   * @param {string} claim - 待验证的声明
   * @param {object} context - 上下文
   * @returns {object} 验证结果
   */
  async verify(claim, context = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/wiki/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim, context })
      });
      
      if (!response.ok) {
        return { 
          hasHallucination: false, 
          confidence: 0.5, 
          error: 'API调用失败',
          source: 'taiji-fallback'
        };
      }
      
      return await response.json();
    } catch (error) {
      // 网络错误时返回默认结果
      return { 
        hasHallucination: false, 
        confidence: 0.5, 
        error: error.message,
        source: 'taiji-fallback'
      };
    }
  }

  /**
   * 注入知识到太极开源
   * @param {object} knowledge - 知识对象
   */
  async injectKnowledge(knowledge) {
    try {
      const response = await fetch(`${this.baseUrl}/wiki/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(knowledge)
      });
      
      return await response.json();
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取知识图谱统计
   */
  async getStats() {
    try {
      const response = await fetch(`${this.baseUrl}/wiki/stats`);
      return await response.json();
    } catch (error) {
      return null;
    }
  }
}

module.exports = { TaijiClient };
