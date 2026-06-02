/**
 * LLM 特征提取 + 缓存
 * 移植自 ref/src/finder/extractor.py
 */

import type { ProjectFeatures, ApiConfig } from "./types";
import { chatCompletion } from "../api/llm";
import { getCachedFeatures, setCachedFeatures } from "../lib/storage";
import { parseJsonResponse } from "../lib/utils";
import { README_TRUNCATE_FOR_LLM } from "../config";

const SYSTEM_PROMPT =
  "你是一个专业的开源项目分析师，擅长从项目文档中提取结构化信息。只返回 JSON，不要其他内容。";

const EXTRACT_PROMPT = `你是一个专业的开源项目分析师。请分析以下 GitHub 仓库信息，提取其核心特征。

仓库名称: {full_name}
仓库描述: {description}
Topics: {topics}
README (前 8000 字符):
{readme}

请严格按照以下 JSON 格式返回分析结果（不要包含其他文字，只返回 JSON）：
{{
    "core_problem": "该项目核心解决什么问题（一句话概括）",
    "system_type": "项目属于什么系统类型（如：CI/CD工具、Web框架、数据库、监控平台等）",
    "key_features": ["特性1", "特性2", "特性3", ...],
    "competitors": ["竞品1", "竞品2", ...],
    "search_query": "用于 GitHub 搜索的英文关键词（3-5 个词），要能搜到功能类似的项目"
}}

要求：
1. core_problem 要精准概括项目解决的核心痛点
2. system_type 使用通用的技术分类术语
3. key_features 列出 5-10 个最核心的技术特性关键词
4. competitors 列出 README 或描述中明确提到的竞品/替代方案（如果没有则返回空数组）
5. search_query 是 3-5 个英文关键词，用于在 GitHub 上搜索到功能类似的项目。例如：图片选择器 → "android image picker library"，Web 框架 → "python web framework async"`;

/**
 * 提取项目特征（带缓存）
 * 移植自 extractor.py: extract_features_async()
 */
export async function extractFeatures(
  fullName: string,
  description: string,
  readme: string,
  topics: string[],
  config: ApiConfig,
): Promise<ProjectFeatures> {
  // 先查缓存
  const cached = await getCachedFeatures(fullName);
  if (cached) return cached;

  const prompt = EXTRACT_PROMPT.replace("{full_name}", fullName)
    .replace("{description}", description)
    .replace("{readme}", readme.slice(0, README_TRUNCATE_FOR_LLM))
    .replace("{topics}", topics.length > 0 ? topics.join(", ") : "无");

  const resultText = await chatCompletion({
    platformId: config.llmPlatformId,
    apiBase: config.llmApiBase,
    apiKey: config.llmApiKey,
    model: config.llmModel,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.1,
  });

  const data = parseJsonResponse(resultText) as Record<string, unknown>;
  const features: ProjectFeatures = {
    core_problem: (data.core_problem as string) || "",
    system_type: (data.system_type as string) || "",
    key_features: (data.key_features as string[]) || [],
    competitors: (data.competitors as string[]) || [],
    search_query: (data.search_query as string) || "",
  };

  // 写入缓存
  await setCachedFeatures(fullName, features);
  return features;
}
