const zhCN: Record<string, string> = {
  appName: "GitHub Repo Radar",

  // Search bar
  searchPlaceholder: "GitHub 仓库 URL，例如 https://github.com/fastapi/fastapi",
  search: "搜索",
  searching: "搜索中...",
  backToSearch: "← 重新搜索",

  // Idle state
  idleNoKey: "👋 请先在下方设置中配置 API Key",
  idleReady: "输入 GitHub 仓库 URL，点击搜索发现相似项目",

  // Settings
  settings: "设置",
  needsConfig: "需要配置 API Key",
  githubToken: "GitHub Token",
  githubTokenHint: "推荐 — 提升限流至 5,000 次/小时",
  llmPlatform: "LLM 平台",
  embeddingPlatform: "Embedding 平台",
  apiKey: "API Key",
  apiBase: "API Base URL",
  model: "模型",
  selectPlatform: "选择平台...",
  save: "保存设置",
  saved: "✓ 已保存",

  // Platforms
  platformOpenai: "OpenAI",
  platformAnthropic: "Anthropic",
  platformSiliconFlow: "SiliconFlow",
  platformOpenaiCompatible: "OpenAI 兼容",
  platformAnthropicCompatible: "Anthropic 兼容",

  // Progress stages
  stageFetching: "获取仓库数据",
  stageExtracting: "LLM 特征提取",
  stageRecalling: "并行多路召回",
  stageFiltering: "快速过滤",
  stageFetchingReadmes: "获取 README",
  stageEmbedding: "生成 Embedding",
  stageRanking: "精准排序",

  // Results
  topResults: "🏆 Top {count} 相关项目",
  target: "目标:",
  scoreFormula: "综合得分 = 语义×0.6 + Topic×0.3 + 活跃度×0.1",
  noDescription: "无描述",
  score: "综合",
  semantic: "语义",
  topic: "Topic",

  // Errors
  errorNoKeys: "请先在设置中配置 LLM API Key 和 Embedding API Key",
  errorNoResults: "未找到相似仓库，请检查网络或 API 配置",
  retry: "重试",
} as const;

export default zhCN;
