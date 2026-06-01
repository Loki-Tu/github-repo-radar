/**
 * 主流程编排
 * 移植自 ref/cli.py: run()
 *
 * 串联所有步骤，通过 onProgress 回调报告进度阶段
 * Embedding 可选：无 embedding 时只用快速过滤（rank_fast）排序
 */

import type { Repo, ProjectFeatures, RankedResult, ApiConfig, ProgressInfo, PipelineStage } from "./types";
import { fetchRepoData } from "../api/github";
import { extractFeatures } from "./extractor";
import { parallelRecall } from "./recall";
import { rankFast, fetchReadmesConcurrent, getEmbeddingsBatch, rank } from "./ranker";
import { buildEmbeddingText, topicOverlap, computeActivityWeight } from "../lib/utils";
import { DEFAULT_TOP_K } from "../config";

export interface PipelineResult {
  repo: Repo;
  features: ProjectFeatures;
  results: RankedResult[];
  /** 是否使用了 embedding 精准排序 */
  usedEmbedding: boolean;
}

function reportProgress(
  onProgress: (info: ProgressInfo) => void,
  stage: PipelineStage,
  message: string,
): void {
  onProgress({ stage, message });
}

/**
 * 执行完整流水线：获取数据 → 提取特征 → 并行召回 → 两阶段排序
 * 如果没有配置 Embedding API Key，则只用快速过滤排序
 */
export async function runPipeline(
  repoUrl: string,
  config: ApiConfig,
  topK: number = DEFAULT_TOP_K,
  onProgress: (info: ProgressInfo) => void,
): Promise<PipelineResult> {
  const hasEmbedding = !!config.embeddingApiKey;

  // Step 1: 获取目标仓库数据
  reportProgress(onProgress, "fetching", "正在获取仓库数据...");
  const repoData = await fetchRepoData(repoUrl, config.githubToken);
  reportProgress(onProgress, "fetching", `已获取 ${repoData.full_name} 的数据`);

  // Step 2: LLM 特征提取
  reportProgress(onProgress, "extracting", "正在通过 LLM 提取项目特征...");
  const features = await extractFeatures(
    repoData.full_name,
    repoData.description,
    repoData.readme,
    repoData.topics,
    config,
  );
  reportProgress(onProgress, "extracting", "特征提取完成");

  // Step 3: 并行多路召回
  reportProgress(onProgress, "recalling", "正在并行搜索相似仓库...");
  const candidates = await parallelRecall(features, repoData.full_name, config);
  reportProgress(onProgress, "recalling", `共召回 ${candidates.length} 个候选项目`);

  if (candidates.length === 0) {
    return { repo: repoData, features, results: [], usedEmbedding: false };
  }

  // Step 4a: 快速过滤 — 选出 top 30
  reportProgress(onProgress, "filtering", "正在快速过滤候选...");
  const fastCandidates = rankFast(candidates, repoData.topics, repoData.description || "");
  reportProgress(onProgress, "filtering", `快速过滤完成，保留 ${fastCandidates.length} 个`);

  // ── 无 Embedding：只用快速过滤结果 ──
  if (!hasEmbedding) {
    reportProgress(onProgress, "ranking", "无 Embedding 配置，使用快速过滤结果...");
    const maxStars = Math.max(...fastCandidates.map((c) => c.stargazers_count), 1);
    const results: RankedResult[] = fastCandidates.slice(0, topK).map((repo) => {
      const topicOv = topicOverlap(repoData.topics, repo.topics);
      const activity = computeActivityWeight(repo.stargazers_count, maxStars);
      const score = topicOv * 0.5 + activity * 0.5;
      return {
        repo,
        score,
        cosine_similarity: 0,
        topic_overlap: topicOv,
        activity_weight: activity,
      };
    });
    results.sort((a, b) => b.score - a.score);
    reportProgress(onProgress, "done", `完成，共 ${results.length} 个结果（快速模式）`);
    return { repo: repoData, features, results, usedEmbedding: false };
  }

  // ── 有 Embedding：完整两阶段排序 ──

  // Step 4b: 并发获取 top 候选的 README
  reportProgress(onProgress, "fetching-readmes", `正在并发获取 README... (0/${fastCandidates.length})`);
  await fetchReadmesConcurrent(fastCandidates, config.githubToken);
  reportProgress(onProgress, "fetching-readmes", `README 获取完成 (${fastCandidates.length} 个)`);

  // Step 4c + 4d: 生成 embedding
  reportProgress(onProgress, "embedding", "正在生成 Embedding...");
  const targetText = buildEmbeddingText(repoData);
  const candidateTexts = fastCandidates.map(buildEmbeddingText);
  const allTexts = [targetText, ...candidateTexts];
  const allEmbeddings = await getEmbeddingsBatch(allTexts, config);
  const targetEmbedding = allEmbeddings[0];
  const candidateEmbeddings = allEmbeddings.slice(1);
  reportProgress(onProgress, "embedding", "Embedding 生成完成");

  // Step 5: 精准排序
  reportProgress(onProgress, "ranking", "正在进行精准排序...");
  const results = rank(targetEmbedding, fastCandidates, candidateEmbeddings, repoData.topics, topK);
  reportProgress(onProgress, "done", `排序完成，共 ${results.length} 个结果`);

  return { repo: repoData, features, results, usedEmbedding: true };
}
