/**
 * GitHub Repo Radar — 核心数据结构定义
 * 直接翻译自 tech.md 中的 TypeScript 接口
 */

/** 仓库基础数据（目标仓库 / 候选仓库共用） */
export interface Repo {
  full_name: string; // "owner/repo"
  description: string; // 仓库描述，可能为空
  readme: string; // README 全文，搜索结果中为空字符串
  topics: string[]; // GitHub topics 标签
  stargazers_count: number;
  html_url: string;
}

/** LLM 提取的项目特征 */
export interface ProjectFeatures {
  core_problem: string; // 核心解决的问题
  system_type: string; // 系统类型分类
  key_features: string[]; // 特性关键词列表
  competitors: string[]; // 文档中明确提及的竞品名列表
  search_query: string; // GitHub 搜索关键词（3-5 个英文词）
}

/** 排序后的结果 */
export interface RankedResult {
  repo: Repo;
  score: number; // 综合得分 (0-1)
  cosine_similarity: number; // 语义相似度 (0-1)
  topic_overlap: number; // topic 重叠度 (0-1)
  activity_weight: number; // 活跃度权重 (0-1)
}

/** 进度阶段 */
export type PipelineStage =
  | "idle"
  | "fetching"
  | "extracting"
  | "recalling"
  | "filtering"
  | "fetching-readmes"
  | "embedding"
  | "ranking"
  | "done"
  | "error";

/** 进度回调 */
export interface ProgressInfo {
  stage: PipelineStage;
  message: string;
  detail?: string;
}

/** API 配置 */
export interface ApiConfig {
  githubToken: string;
  llmPlatformId: string;
  llmApiKey: string;
  llmModel: string;
  llmApiBase: string;
  embeddingPlatformId: string;
  embeddingApiKey: string;
  embeddingModel: string;
  embeddingApiBase: string;
}

/** Background 消息类型 */
export type MessageType =
  | "FETCH_GITHUB"
  | "LLM_CHAT"
  | "GET_EMBEDDING";

export interface MessageRequest {
  type: MessageType;
  payload: unknown;
}

export interface GitHubFetchPayload {
  url: string;
  params?: Record<string, string>;
  token?: string;
}

export interface LlmChatPayload {
  apiBase: string;
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
}

export interface EmbeddingPayload {
  apiBase: string;
  apiKey: string;
  model: string;
  input: string;
}
