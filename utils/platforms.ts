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
    id: "siliconflow",
    icon: "🟣",
    nameKey: "platformSiliconFlow",
    defaultBase: "https://api.siliconflow.cn/v1",
    models: [
      "Qwen/Qwen3-8B",
      "Qwen/Qwen3-32B",
      "deepseek-ai/DeepSeek-V3",
      "Pro/deepseek-ai/DeepSeek-R1",
    ],
    defaultModel: "Qwen/Qwen3-8B",
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
  {
    id: "anthropic-compatible",
    icon: "🟤",
    nameKey: "platformAnthropicCompatible",
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
    id: "siliconflow",
    icon: "🟣",
    nameKey: "platformSiliconFlow",
    defaultBase: "https://api.siliconflow.cn/v1",
    models: [
      "BAAI/bge-m3",
      "Qwen/Qwen3-Embedding-0.6B",
      "Pro/BAAI/bge-m3",
    ],
    defaultModel: "Qwen/Qwen3-Embedding-0.6B",
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
