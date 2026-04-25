import { MemoryEntry } from '../interfaces/IMemorySystem';

/**
 * 向量化工具函数
 * 基于 OpenClaw 的 embedding 实现
 */

/**
 * 计算余弦相似度
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`向量维度不匹配: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const norm = Math.sqrt(normA) * Math.sqrt(normB);
  return norm === 0 ? 0 : dotProduct / norm;
}

/**
 * 简单的本地语义相似度计算（无模型时的降级方案）
 * 基于 TF-IDF + Jaccard 相似度的改进版本
 */
export function calculateSemanticSimilarity(
  textA: string,
  textB: string
): number {
  // 分词：支持中英文
  const wordsA = tokenize(textA);
  const wordsB = tokenize(textB);

  if (wordsA.length === 0 && wordsB.length === 0) {
    return 1;
  }
  if (wordsA.length === 0 || wordsB.length === 0) {
    return 0;
  }

  // 计算词频
  const tfA = calculateTF(wordsA);
  const tfB = calculateTF(wordsB);

  // 计算 IDF
  const allWords = new Set([...wordsA, ...wordsB]);
  const idf = calculateIDF([wordsA, wordsB], allWords);

  // 计算 TF-IDF 向量的余弦相似度
  return calculateTfIdfSimilarity(tfA, tfB, idf);
}

/**
 * 分词 - 支持中英文混合
 */
export function tokenize(text: string): string[] {
  const result: string[] = [];
  const lowerText = text.toLowerCase();

  // 匹配中文字符
  const chineseRegex = /[\u4e00-\u9fa5]/g;
  // 匹配英文单词
  const englishRegex = /[a-zA-Z]{2,}/g;

  // 提取中文字符
  let match;
  while ((match = chineseRegex.exec(lowerText)) !== null) {
    result.push(match[0]);
  }

  // 提取英文单词
  while ((match = englishRegex.exec(lowerText)) !== null) {
    result.push(match[0]);
  }

  return result;
}

/**
 * 计算词频 (TF)
 */
function calculateTF(words: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  const total = words.length;

  for (const word of words) {
    tf.set(word, (tf.get(word) || 0) + 1);
  }

  // 归一化
  for (const [word, count] of tf.entries()) {
    tf.set(word, count / total);
  }

  return tf;
}

/**
 * 计算逆文档频率 (IDF)
 */
function calculateIDF(documents: string[][], allWords: Set<string>): Map<string, number> {
  const idf = new Map<string, number>();
  const docCount = documents.length;

  for (const word of allWords) {
    let containingDocs = 0;
    for (const doc of documents) {
      if (doc.includes(word)) {
        containingDocs++;
      }
    }
    idf.set(word, Math.log((docCount + 1) / (containingDocs + 1)) + 1);
  }

  return idf;
}

/**
 * 计算 TF-IDF 向量相似度
 */
function calculateTfIdfSimilarity(
  tfA: Map<string, number>,
  tfB: Map<string, number>,
  idf: Map<string, number>
): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  const allWords = new Set([...tfA.keys(), ...tfB.keys()]);

  for (const word of allWords) {
    const tfidfA = (tfA.get(word) || 0) * (idf.get(word) || 0);
    const tfidfB = (tfB.get(word) || 0) * (idf.get(word) || 0);

    dotProduct += tfidfA * tfidfB;
    normA += tfidfA * tfidfA;
    normB += tfidfB * tfidfB;
  }

  const norm = Math.sqrt(normA) * Math.sqrt(normB);
  return norm === 0 ? 0 : dotProduct / norm;
}

/**
 * 计算记忆条目的语义相似度向量
 */
export function calculateEmbeddingScores(
  query: string,
  candidates: MemoryEntry[]
): number[] {
  const scores: number[] = [];

  for (const candidate of candidates) {
    if (candidate.embedding) {
      // 如果有预计算的 embedding，使用它
      // 这里简化处理：用内容相似度代替
      scores.push(calculateSemanticSimilarity(query, candidate.content));
    } else {
      // 无 embedding，回退到文本相似度
      scores.push(calculateSemanticSimilarity(query, candidate.content));
    }
  }

  return scores;
}

/**
 * 简单的 embedding 生成（用于演示）
 * 在生产环境中应该使用真实的 embedding 模型
 */
export function generateSimpleEmbedding(text: string, dimensions: number = 1536): number[] {
  const words = tokenize(text);
  const embedding = new Array(dimensions).fill(0);

  // 使用哈希函数将词映射到向量维度
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = ((hash << 5) - hash) + word.charCodeAt(j);
      hash |= 0;
    }

    // 使用多个维度来表示这个词
    const baseIdx = Math.abs(hash) % dimensions;
    const weight = 1 / (1 + i * 0.1); // 位置衰减

    // 在局部区域设置值
    for (let k = 0; k < 5; k++) {
      const idx = (baseIdx + k) % dimensions;
      embedding[idx] += weight * (1 - k * 0.2);
    }
  }

  // L2 归一化
  let norm = 0;
  for (const v of embedding) {
    norm += v * v;
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      embedding[i] /= norm;
    }
  }

  return embedding;
}
