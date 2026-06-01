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
  githubTokenGuideTitle: "如何获取 GitHub Token",
  githubTokenGuideStep1: "1. 打开",
  githubTokenGuideStep1Link: "github.com/settings/tokens",
  githubTokenGuideStep2: '2. 点击 "Generate new token (classic)"',
  githubTokenGuideStep3: '3. 勾选 "repo" 权限范围',
  githubTokenGuideStep4: "4. 生成后将 Token 粘贴到上方",
  llmPlatform: "LLM 平台",
  embeddingPlatform: "Embedding 平台",
  embeddingOptional: "可选",
  embeddingHint: "启用语义排序，结果更精准。未配置时仅使用关键词快速匹配。",
  embeddingGuideTitle: "Embedding 是什么？",
  embeddingGuideP1: "Embedding 将代码/仓库描述转换为向量，实现语义相似度比对，比纯关键词匹配精准得多。",
  embeddingGuideP2: "已配置 → 完整两阶段排序（语义 + 关键词 + 活跃度）",
  embeddingGuideP3: "未配置 → 仅关键词快速匹配（仍可用，精度较低）",
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
