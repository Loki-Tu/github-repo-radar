/**
 * 并行多路召回
 * 移植自 ref/cli.py: _parallel_recall()
 */

import type { ProjectFeatures, Repo, ApiConfig } from "./types";
import { searchRepos } from "../api/github";

/**
 * 并行执行多路召回策略
 *
 * 策略A: LLM 生成的 search_query（最精准）
 * 策略B: "{repo_name} alternative"
 * 策略C: 竞品名搜索（最多 2 个）
 */
export async function parallelRecall(
  features: ProjectFeatures,
  repoFullName: string,
  config: ApiConfig,
): Promise<Repo[]> {
  const exclude = new Set([repoFullName]);
  const repoShortName = repoFullName.split("/").pop() || "";

  const searchTasks: Promise<Repo[]>[] = [];

  // 策略 A: LLM 生成的搜索 query
  searchTasks.push(
    searchRepos(features.search_query, config.githubToken, 30, exclude).catch(
      () => [] as Repo[],
    ),
  );

  // 策略 B: "{repo_name} alternative"
  searchTasks.push(
    searchRepos(`${repoShortName} alternative`, config.githubToken, 20, exclude).catch(
      () => [] as Repo[],
    ),
  );

  // 策略 C: 竞品名搜索（最多 2 个）
  for (const comp of features.competitors.slice(0, 2)) {
    searchTasks.push(
      searchRepos(comp, config.githubToken, 15, exclude).catch(
        () => [] as Repo[],
      ),
    );
  }

  // 并行执行所有搜索
  const results = await Promise.all(searchTasks);

  // 合并去重
  const seen = new Set<string>();
  const candidates: Repo[] = [];
  for (const result of results) {
    for (const repo of result) {
      if (!seen.has(repo.full_name) && repo.full_name !== repoFullName) {
        seen.add(repo.full_name);
        candidates.push(repo);
      }
    }
  }

  return candidates;
}
