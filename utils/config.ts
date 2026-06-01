/**
 * 默认配置常量
 */

export const DEFAULT_CONFIG = {
  llmModel: "mimo-v2.5-pro",
  llmApiBase: "https://token-plan-cn.xiaomimimo.com/v1",
  embeddingModel: "Qwen/Qwen3-Embedding-0.6B",
  embeddingApiBase: "https://api.siliconflow.cn/v1",
} as const;

export const FAST_FILTER_TOP_K = 30;
export const DEFAULT_TOP_K = 10;
export const README_FETCH_CONCURRENCY = 5;
export const README_FETCH_DELAY_MS = 200;
export const EMBEDDING_BATCH_PAUSE_MS = 300;
export const EMBEDDING_BATCH_SIZE = 5;
export const README_MAX_LENGTH = 3000;
export const README_TRUNCATE_FOR_LLM = 8000;
