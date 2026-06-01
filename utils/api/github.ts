/**
 * GitHub API 调用层
 * 移植自 ref/src/finder/fetcher.py
 *
 * 所有请求通过 background script 代理以绕过 CORS 限制
 */

import type { Repo } from "../core/types";
import { parseGitHubUrl } from "../lib/utils";

/** 通过 background script 代理发送 GitHub API 请求 */
async function githubFetch<T>(
  url: string,
  token?: string,
  params?: Record<string, string>,
): Promise<T> {
  const response = await chrome.runtime.sendMessage({
    type: "FETCH_GITHUB",
    payload: { url, token, params },
  });
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data as T;
}

/** 解码 base64 编码的 README 内容 */
function decodeBase64(content: string): string {
  try {
    return atob(content);
  } catch {
    // atob 不支持 UTF-8，用 TextDecoder 处理
    const binary = atob(content);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  }
}

/**
 * 获取目标仓库的基础数据
 * 移植自 fetcher.py: fetch_repo_data()
 */
export async function fetchRepoData(
  url: string,
  token?: string,
): Promise<Repo> {
  const { owner, repo } = parseGitHubUrl(url);
  const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;

  const repoInfo = await githubFetch<Record<string, unknown>>(repoUrl, token);

  // 获取 README（先尝试 main，再尝试 master）
  let readme = "";
  try {
    const readmeData = await githubFetch<Record<string, unknown>>(
      `${repoUrl}/readme?ref=main`,
      token,
    );
    readme = decodeBase64((readmeData.content as string) || "");
  } catch {
    try {
      const readmeData = await githubFetch<Record<string, unknown>>(
        `${repoUrl}/readme?ref=master`,
        token,
      );
      readme = decodeBase64((readmeData.content as string) || "");
    } catch {
      readme = (repoInfo.description as string) || "";
    }
  }

  return {
    full_name: (repoInfo.full_name as string) || `${owner}/${repo}`,
    description: (repoInfo.description as string) || "",
    readme,
    topics: (repoInfo.topics as string[]) || [],
    stargazers_count: (repoInfo.stargazers_count as number) || 0,
    html_url: (repoInfo.html_url as string) || url,
  };
}

/**
 * 通过 GitHub Search API 搜索仓库
 * 移植自 fetcher.py: search_repos()
 */
export async function searchRepos(
  query: string,
  token?: string,
  perPage: number = 30,
  excludeRepos: Set<string> = new Set(),
): Promise<Repo[]> {
  const results: Repo[] = [];
  const seen = new Set(excludeRepos);

  let page = 1;
  while (page <= 10) {
    const params: Record<string, string> = {
      q: query,
      per_page: String(Math.min(perPage, 100)),
      sort: "stars",
      order: "desc",
      page: String(page),
    };

    const data = await githubFetch<Record<string, unknown>>(
      "https://api.github.com/search/repositories",
      token,
      params,
    );

    const items = (data.items as Array<Record<string, unknown>>) || [];
    if (items.length === 0) break;

    for (const item of items) {
      const name = item.full_name as string;
      if (seen.has(name)) continue;
      seen.add(name);
      results.push({
        full_name: name,
        description: (item.description as string) || "",
        readme: "", // 搜索 API 不返回 README
        topics: (item.topics as string[]) || [],
        stargazers_count: (item.stargazers_count as number) || 0,
        html_url: (item.html_url as string) || "",
      });
    }

    if (results.length >= 100) break;
    const total = (data.total_count as number) || 0;
    if (page * perPage >= total) break;
    page++;
  }

  return results;
}

/**
 * 获取单个候选项目的 README
 * 移植自 fetcher.py: fetch_candidate_readme()
 */
export async function fetchCandidateReadme(
  fullName: string,
  token?: string,
): Promise<string> {
  const [owner, repo] = fullName.split("/", 2);
  const baseUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;

  try {
    const data = await githubFetch<Record<string, unknown>>(
      `${baseUrl}?ref=main`,
      token,
    );
    return decodeBase64((data.content as string) || "");
  } catch {
    try {
      const data = await githubFetch<Record<string, unknown>>(
        `${baseUrl}?ref=master`,
        token,
      );
      return decodeBase64((data.content as string) || "");
    } catch {
      return "";
    }
  }
}
