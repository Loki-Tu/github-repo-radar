/**
 * 两阶段排序逻辑
 * 移植自 ref/src/finder/ranker.py
 */

import type { Repo, RankedResult } from "./types";
import {
  topicOverlap,
  computeActivityWeight,
  tokenizeDescription,
  buildEmbeddingText,
  cosineSimilarity,
} from "../lib/utils";
import { getEmbedding } from "../api/embedding";
import type { ApiConfig } from "./types";
import { Semaphore } from "../lib/semaphore";
import { fetchCandidateReadme } from "../api/github";
import {
  FAST_FILTER_TOP_K,
  README_FETCH_CONCURRENCY,
  README_FETCH_DELAY_MS,
  EMBEDDING_BATCH_SIZE,
  EMBEDDING_BATCH_PAUSE_MS,
} from "../config";

/**
 * 第一阶段快速过滤：用 topic + description 关键词 + star 数选出 top K 候选
 * 不需要 embedding，速度快
 * 移植自 ranker.py: Ranker.rank_fast()
 */
export function rankFast(
  candidates: Repo[],
  targetTopics: string[],
  targetDescription: string,
  topK: number = FAST_FILTER_TOP_K,
): Repo[] {
  if (candidates.length === 0) return [];

  const targetWords = tokenizeDescription(targetDescription);
  const maxStars = Math.max(...candidates.map((c) => c.stargazers_count), 1);

  const scored: Array<[number, Repo]> = candidates.map((c) => {
    // Topic 重叠分
    const topicScore = topicOverlap(targetTopics, c.topics);

    // 描述关键词匹配分
    let descScore = 0;
    if (c.description && targetWords.size > 0) {
      const candWords = tokenizeDescription(c.description);
      let matchCount = 0;
      for (const w of targetWords) {
        if (candWords.has(w)) matchCount++;
      }
      descScore = matchCount / Math.max(targetWords.size, 1);
    }

    // Star 活跃度分（对数归一化）
    const starScore =
      c.stargazers_count > 0
        ? Math.log1p(c.stargazers_count) / Math.log1p(maxStars)
        : 0;

    const total = topicScore * 0.4 + descScore * 0.4 + starScore * 0.2;
    return [total, c];
  });

  scored.sort((a, b) => b[0] - a[0]);
  return scored.slice(0, topK).map(([, c]) => c);
}

/**
 * 并发获取候选项目的 README
 * 移植自 fetcher.py: fetch_readmes_concurrent()
 */
export async function fetchReadmesConcurrent(
  candidates: Repo[],
  token?: string,
  maxCount: number = candidates.length,
): Promise<void> {
  const sem = new Semaphore(README_FETCH_CONCURRENCY);

  const fetchOne = async (candidate: Repo): Promise<void> => {
    await sem.acquire();
    try {
      if (!candidate.readme) {
        candidate.readme = await fetchCandidateReadme(
          candidate.full_name,
          token,
        );
      }
    } catch {
      // 失败时保留空 readme
    } finally {
      sem.release();
    }
    await new Promise((r) => setTimeout(r, README_FETCH_DELAY_MS));
  };

  await Promise.all(candidates.slice(0, maxCount).map(fetchOne));
}

/**
 * 批量获取 embedding（带限流）
 * 每 EMBEDDING_BATCH_SIZE 个请求后暂停 EMBEDDING_BATCH_PAUSE_MS
 */
export async function getEmbeddingsBatch(
  texts: string[],
  config: ApiConfig,
): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i++) {
    try {
      const emb = await getEmbedding({
        apiBase: config.embeddingApiBase,
        apiKey: config.embeddingApiKey,
        model: config.embeddingModel,
        input: texts[i],
      });
      embeddings.push(emb);
    } catch {
      // 失败时用零向量填充
      embeddings.push(new Array(embeddings[0]?.length || 1536).fill(0));
    }

    // 限流：每 N 个请求后暂停
    if ((i + 1) % EMBEDDING_BATCH_SIZE === 0 && i < texts.length - 1) {
      await new Promise((r) => setTimeout(r, EMBEDDING_BATCH_PAUSE_MS));
    }
  }

  return embeddings;
}

/**
 * 第二阶段精准排序：embedding 相似度 + topic overlap + 活跃度
 * 移植自 ranker.py: Ranker.rank()
 *
 * Score = Cosine_Similarity × 0.6 + Topic_Overlap × 0.3 + Activity_Weight × 0.1
 */
export function rank(
  targetEmbedding: number[],
  candidates: Repo[],
  candidateEmbeddings: number[][],
  targetTopics: string[],
  topK: number,
): RankedResult[] {
  if (candidates.length === 0) return [];

  const maxStars = Math.max(...candidates.map((c) => c.stargazers_count), 1);

  const results: RankedResult[] = candidates.map((candidate, i) => {
    const cosSim = cosineSimilarity(targetEmbedding, candidateEmbeddings[i] || []);
    const topicOv = topicOverlap(targetTopics, candidate.topics);
    const activity = computeActivityWeight(candidate.stargazers_count, maxStars);
    const score = cosSim * 0.6 + topicOv * 0.3 + activity * 0.1;

    return {
      repo: candidate,
      score,
      cosine_similarity: cosSim,
      topic_overlap: topicOv,
      activity_weight: activity,
    };
  });

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}
