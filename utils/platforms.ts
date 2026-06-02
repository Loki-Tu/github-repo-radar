/**
 * LLM / Embedding 平台预设
 *
 * 主流平台只需填 API Key + 选模型。
 * "Compatible" 选项需要手动填 Base URL。
 */

/** 平台预设定义 */
export interface PlatformPreset {
  id: string;
  /** 平台图标 */
  icon: string;
  /** i18n 翻译 key（对应 en.ts / zh-CN.ts 中的 platformXxx） */
  nameKey: string;
  /** 固定的 base URL（为空表示用户自填） */
  defaultBase: string;
  /** 可选模型列表（为空表示用户自填） */
  models: string[];
  /** 默认选中的模型 */
  defaultModel: string;
  /** 是否需要用户填写 Base URL */
  requiresBaseUrl: boolean;
}

/** LLM 平台预设 */
export const LLM_PLATFORMS: PlatformPreset[] = [
  {
    id: "openai",
    icon: "🟢",
    nameKey: "platformOpenai",
    defaultBase: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    defaultModel: "gpt-4o-mini",
    requiresBaseUrl: false,
  },
  {
    id: "anthropic",
    icon: "🟠",
    nameKey: "platformAnthropic",
    defaultBase: "https://api.anthropic.com/v1",
    models: ["claude-sonnet-4-20250514", "claude-haiku-4-5-20251001"],
    defaultModel: "claude-haiku-4-5-20251001",
    requiresBaseUrl: false,
  },
  {
    id: "google",
    icon: "🔵",
    nameKey: "platformGoogle",
    defaultBase: "https://generativelanguage.googleapis.com/v1beta",
    models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
    defaultModel: "gemini-2.0-flash",
    requiresBaseUrl: false,
  },
  {
    id: "xai",
    icon: "🟣",
    nameKey: "platformXai",
    defaultBase: "https://api.x.ai/v1",
    models: ["grok-2", "grok-2-mini"],
    defaultModel: "grok-2",
    requiresBaseUrl: false,
  },
  {
    id: "deepseek",
    icon: "🟤",
    nameKey: "platformDeepseek",
    defaultBase: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-reasoner"],
    defaultModel: "deepseek-chat",
    requiresBaseUrl: false,
  },
  {
    id: "openrouter",
    icon: "⚫",
    nameKey: "platformOpenrouter",
    defaultBase: "https://openrouter.ai/api/v1",
    models: [
      "anthropic/claude-sonnet-4-20250514",
      "anthropic/claude-haiku-4-5-20251001",
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "google/gemini-2.0-flash",
      "x-ai/grok-2",
      "deepseek/deepseek-chat",
    ],
    defaultModel: "anthropic/claude-sonnet-4-20250514",
    requiresBaseUrl: false,
  },
  {
    id: "azure",
    icon: "🔷",
    nameKey: "platformAzure",
    defaultBase: "",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
    defaultModel: "gpt-4o-mini",
    requiresBaseUrl: true,
  },
  {
    id: "bedrock",
    icon: "🟧",
    nameKey: "platformBedrock",
    defaultBase: "",
    models: ["anthropic.claude-3-5-sonnet-20241022-v2:0", "anthropic.claude-3-5-haiku-20241022-v2:0"],
    defaultModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    requiresBaseUrl: false,
  },
  {
    id: "ollama",
    icon: "🦙",
    nameKey: "platformOllama",
    defaultBase: "http://localhost:11434",
    models: ["llama3.2", "llama3.1", "mistral", "codellama"],
    defaultModel: "llama3.2",
    requiresBaseUrl: false,
  },
  {
    id: "openai-compatible",
    icon: "⚪",
    nameKey: "platformOpenaiCompatible",
    defaultBase: "",
    models: [],
    defaultModel: "",
    requiresBaseUrl: true,
  },
];

/** Embedding 平台预设（通常与 LLM 平台不同） */
export const EMBEDDING_PLATFORMS: PlatformPreset[] = [
  {
    id: "openai",
    icon: "🟢",
    nameKey: "platformOpenai",
    defaultBase: "https://api.openai.com/v1",
    models: ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"],
    defaultModel: "text-embedding-3-small",
    requiresBaseUrl: false,
  },
  {
    id: "google",
    icon: "🔵",
    nameKey: "platformGoogle",
    defaultBase: "https://generativelanguage.googleapis.com/v1beta",
    models: ["text-embedding-004", "embedding-001"],
    defaultModel: "text-embedding-004",
    requiresBaseUrl: false,
  },
  {
    id: "azure",
    icon: "🔷",
    nameKey: "platformAzure",
    defaultBase: "",
    models: ["text-embedding-3-small", "text-embedding-3-large"],
    defaultModel: "text-embedding-3-small",
    requiresBaseUrl: true,
  },
  {
    id: "bedrock",
    icon: "🟧",
    nameKey: "platformBedrock",
    defaultBase: "",
    models: ["amazon.titan-embed-text-v2:0"],
    defaultModel: "amazon.titan-embed-text-v2:0",
    requiresBaseUrl: false,
  },
  {
    id: "openrouter",
    icon: "⚫",
    nameKey: "platformOpenrouter",
    defaultBase: "https://openrouter.ai/api/v1",
    models: ["openai/text-embedding-3-small"],
    defaultModel: "openai/text-embedding-3-small",
    requiresBaseUrl: false,
  },
  {
    id: "ollama",
    icon: "🦙",
    nameKey: "platformOllama",
    defaultBase: "http://localhost:11434",
    models: ["nomic-embed-text", "mxbai-embed-large"],
    defaultModel: "nomic-embed-text",
    requiresBaseUrl: false,
  },
  {
    id: "openai-compatible",
    icon: "⚪",
    nameKey: "platformOpenaiCompatible",
    defaultBase: "",
    models: [],
    defaultModel: "",
    requiresBaseUrl: true,
  },
];

/** 根据 platform id 查找预设 */
export function findPlatform(
  platforms: PlatformPreset[],
  id: string,
): PlatformPreset | undefined {
  return platforms.find((p) => p.id === id);
}
