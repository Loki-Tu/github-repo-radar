/**
 * chrome.storage.local 封装
 * 用于缓存 ProjectFeatures 和存储 API 配置
 */

import type { ApiConfig, ProjectFeatures } from "../core/types";
import { DEFAULT_CONFIG } from "../config";

const FEATURES_CACHE_KEY = "repo_features_cache";
const CONFIG_KEY = "api_config";

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
  return {
    githubToken: saved?.githubToken ?? "",
    llmApiKey: saved?.llmApiKey ?? "",
    llmModel: saved?.llmModel ?? DEFAULT_CONFIG.llmModel,
    llmApiBase: saved?.llmApiBase ?? DEFAULT_CONFIG.llmApiBase,
    embeddingApiKey: saved?.embeddingApiKey ?? "",
    embeddingModel: saved?.embeddingModel ?? DEFAULT_CONFIG.embeddingModel,
    embeddingApiBase: saved?.embeddingApiBase ?? DEFAULT_CONFIG.embeddingApiBase,
  };
}

/** 保存 API 配置 */
export async function setApiConfig(config: ApiConfig): Promise<void> {
  await chrome.storage.local.set({ [CONFIG_KEY]: config });
}
