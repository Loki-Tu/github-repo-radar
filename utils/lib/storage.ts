/**
 * chrome.storage.local 封装
 * 用于缓存 ProjectFeatures、存储 API 配置、持久化搜索状态
 */

import type { ApiConfig, ProjectFeatures, RankedResult } from "../core/types";
import { DEFAULT_CONFIG } from "../config";

const FEATURES_CACHE_KEY = "repo_features_cache";
const CONFIG_KEY = "api_config";
const SEARCH_STATE_KEY = "search_state";

// ─── 搜索状态持久化 ─────────────────────────────────────────────────────────

export interface PersistedSearchState {
  results: RankedResult[];
  targetName: string;
  lastUrl: string;
  timestamp: number;
}

/** 获取上次搜索状态 */
export async function getSearchState(): Promise<PersistedSearchState | null> {
  const result = await chrome.storage.local.get(SEARCH_STATE_KEY);
  return (result[SEARCH_STATE_KEY] as PersistedSearchState) ?? null;
}

/** 保存搜索状态 */
export async function setSearchState(
  state: PersistedSearchState,
): Promise<void> {
  await chrome.storage.local.set({ [SEARCH_STATE_KEY]: state });
}

/** 清除搜索状态 */
export async function clearSearchState(): Promise<void> {
  await chrome.storage.local.remove(SEARCH_STATE_KEY);
}

/** 获取缓存的 ProjectFeatures */
export async function getCachedFeatures(
  fullName: string,
): Promise<ProjectFeatures | null> {
  const result = await chrome.storage.local.get(FEATURES_CACHE_KEY);
  const cache = (result[FEATURES_CACHE_KEY] as Record<string, ProjectFeatures>) ?? {};
  return cache[fullName] ?? null;
}

/** 缓存 ProjectFeatures */
export async function setCachedFeatures(
  fullName: string,
  features: ProjectFeatures,
): Promise<void> {
  const result = await chrome.storage.local.get(FEATURES_CACHE_KEY);
  const cache = (result[FEATURES_CACHE_KEY] as Record<string, ProjectFeatures>) ?? {};
  cache[fullName] = features;
  await chrome.storage.local.set({ [FEATURES_CACHE_KEY]: cache });
}

/** 获取 API 配置（带默认值） */
export async function getApiConfig(): Promise<ApiConfig> {
  const result = await chrome.storage.local.get(CONFIG_KEY);
  const saved = result[CONFIG_KEY] as Partial<ApiConfig> | undefined;

  // 检查是否启用开发环境自动填写 API Key
  const enableDevAutoKey = import.meta.env.VITE_ENABLE_DEV_AUTO_KEY !== "false";
  // 从构建时注入的环境变量获取开发配置（仅开关开启时生效）
  const devConfig = enableDevAutoKey
    ? (import.meta.env.VITE_DEV_API_CONFIG as Record<string, string> | undefined)
    : undefined;

  // 构建配置对象
  const config: ApiConfig = {
    githubToken: saved?.githubToken ?? devConfig?.githubToken ?? "",
    llmPlatformId: saved?.llmPlatformId ?? devConfig?.llmPlatformId ?? "openai",
    llmApiKey: saved?.llmApiKey ?? devConfig?.llmApiKey ?? "",
    llmModel: saved?.llmModel ?? devConfig?.llmModel ?? DEFAULT_CONFIG.llmModel,
    llmApiBase: saved?.llmApiBase ?? devConfig?.llmApiBase ?? DEFAULT_CONFIG.llmApiBase,
    embeddingPlatformId: saved?.embeddingPlatformId ?? devConfig?.embeddingPlatformId ?? "siliconflow",
    embeddingApiKey: saved?.embeddingApiKey ?? devConfig?.embeddingApiKey ?? "",
    embeddingModel: saved?.embeddingModel ?? devConfig?.embeddingModel ?? DEFAULT_CONFIG.embeddingModel,
    embeddingApiBase: saved?.embeddingApiBase ?? devConfig?.embeddingApiBase ?? DEFAULT_CONFIG.embeddingApiBase,
  };

  // 如果 chrome.storage.local 中没有配置，但有 dev config，自动保存到 storage
  // 这样设置页面就能显示这些值，用户也可以修改
  if (!saved && devConfig && Object.keys(devConfig).length > 0) {
    await chrome.storage.local.set({ [CONFIG_KEY]: config });
  }

  return config;
}

/** 保存 API 配置 */
export async function setApiConfig(config: ApiConfig): Promise<void> {
  await chrome.storage.local.set({ [CONFIG_KEY]: config });
}
