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
  "You are an expert open-source project analyst. Extract structured information from project documentation. Return JSON only, no other content.";

const EXTRACT_PROMPT = `You are an expert open-source project analyst. Analyze the following GitHub repository and extract its core features.

Repository: {full_name}
Description: {description}
Topics: {topics}
README (first 8000 chars):
{readme}

Return the analysis in the following JSON format strictly (no other text, JSON only):
{{
    "core_problem": "What core problem does this project solve? (one sentence)",
    "system_type": "What system category does this project belong to? (e.g., CI/CD tool, Web framework, Database, Monitoring platform, etc.)",
    "key_features": ["feature1", "feature2", "feature3", ...],
    "competitors": ["competitor1", "competitor2", ...],
    "search_query": "English keywords for GitHub search (3-5 words) to find similar projects"
}}

Requirements:
1. core_problem: Precisely summarize the core pain point the project solves
2. system_type: Use generic technical category terms
3. key_features: List 5-10 core technical feature keywords
4. competitors: MUST list all well-known alternatives in this domain, including:
   - Competitors explicitly mentioned in README or description
   - The 3-5 most popular alternatives in this field (list them even if not mentioned in README)
   - Example: For a Node version manager, MUST include nvm, volta, nodenv, etc.
5. search_query: 3-5 English keywords for searching similar projects on GitHub. Examples: image picker → "android image picker library", web framework → "python web framework async"`;

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
    .replace("{topics}", topics.length > 0 ? topics.join(", ") : "None");

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
