/**
 * 纯工具函数 — 向量计算、文本处理、相似度算法
 * 移植自 ref/src/finder/ranker.py
 */

import type { Repo } from "../core/types";
import { README_MAX_LENGTH } from "../config";

/** 英文停用词集合 */
const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "can", "shall",
  "of", "in", "to", "for", "with", "on", "at", "from", "by",
  "and", "or", "not", "but", "if", "this", "that", "it", "as",
  "its", "their", "they", "them", "we", "our", "you", "your",
  "he", "she", "him", "her", "his", "hers", "my", "me", "i",
]);

/**
 * 计算两个向量的余弦相似度
 * 移植自 ranker.py: cosine_similarity()
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  if (normA === 0 || normB === 0) return 0;
  return dot / (normA * normB);
}

/**
 * 计算 Topic 重叠度 — Overlap Coefficient
 * 移植自 ranker.py: compute_topic_overlap()
 *
 * 使用 overlap coefficient 而非 Jaccard，避免大小差异大的集合被过度惩罚。
 */
export function topicOverlap(topicsA: string[], topicsB: string[]): number {
  const setA = new Set(topicsA.map((t) => t.toLowerCase()));
  const setB = new Set(topicsB.map((t) => t.toLowerCase()));
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const minSize = Math.min(setA.size, setB.size);
  return minSize === 0 ? 0 : intersection / minSize;
}

/**
 * 基于 Star 数计算活跃度权重（对数归一化）
 * 移植自 ranker.py: compute_activity_weight()
 */
export function computeActivityWeight(stars: number, maxStars: number): number {
  if (maxStars === 0 || stars === 0) return 0;
  return Math.min(Math.log1p(stars) / Math.log1p(maxStars), 1.0);
}

/**
 * 构建用于 embedding 的文本
 * 移植自 ranker.py: _build_text_for_embedding()
 */
export function buildEmbeddingText(repo: Repo): string {
  const parts: string[] = [];
  if (repo.description) parts.push(`Description: ${repo.description}`);
  if (repo.topics.length > 0) parts.push(`Topics: ${repo.topics.join(", ")}`);
  if (repo.readme) parts.push(`README: ${repo.readme.slice(0, README_MAX_LENGTH)}`);
  return parts.join("\n");
}

/**
 * 对描述文本进行分词并去停用词
 * 移植自 ranker.py: rank_fast() 中的 targetWords 逻辑
 */
export function tokenizeDescription(text: string): Set<string> {
  if (!text) return new Set();
  const words = text.toLowerCase().split(/\s+/);
  return new Set(words.filter((w) => w.length > 0 && !STOPWORDS.has(w)));
}

/**
 * 从 GitHub URL 中提取 owner 和 repo
 * 移植自 fetcher.py: parse_url()
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } {
  let cleaned = url.trim().replace(/\/+$/, "");
  if (cleaned.startsWith("https://github.com/")) {
    cleaned = cleaned.replace("https://github.com/", "");
  } else if (cleaned.startsWith("http://github.com/")) {
    cleaned = cleaned.replace("http://github.com/", "");
  }
  if (cleaned.endsWith(".git")) {
    cleaned = cleaned.slice(0, -4);
  }
  const parts = cleaned.split("/");
  if (parts.length < 2) {
    throw new Error(`无法从 URL 解析 owner/repo: ${url}`);
  }
  return { owner: parts[parts.length - 2], repo: parts[parts.length - 1] };
}

/**
 * 解析 LLM 返回的 JSON（处理 markdown 代码块包裹）
 * 移植自 extractor.py 中的 JSON 解析容错逻辑
 */
export function parseJsonResponse(text: string): unknown {
  let cleaned = text.trim();
  if (cleaned.includes("```json")) {
    cleaned = cleaned.split("```json").pop()!.split("```")[0].trim();
  } else if (cleaned.includes("```")) {
    cleaned = cleaned.split("```")[1].split("```")[0].trim();
  }
  return JSON.parse(cleaned);
}
