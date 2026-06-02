/**
 * Background Service Worker — CORS 代理 + Vercel AI SDK
 *
 * 浏览器扩展中，Popup 直接调用外部 API 会受 CORS 限制。
 * Background Service Worker 不受此限制，使用 Vercel AI SDK 处理所有 LLM/Embedding 请求。
 */

import { createOpenAI } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { xai } from "@ai-sdk/xai";
import { deepseek } from "@ai-sdk/deepseek";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { azure } from "@ai-sdk/azure";
import { bedrock } from "@ai-sdk/amazon-bedrock";
import { ollama } from "ollama-ai-provider";
import { generateText, embed } from "ai";

export default defineBackground(() => {
  console.log("GitHub Repo Radar background loaded");

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    handleMessage(message)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: String(err) }));
    return true; // 保持异步通道开放
  });
});

/** 请求访问指定 URL 的权限 */
async function requestPermission(url: string): Promise<boolean> {
  try {
    const origin = new URL(url).origin + "/*";
    const granted = await chrome.permissions.request({
      permissions: [],
      origins: [origin],
    });
    return granted;
  } catch (error) {
    console.error("Failed to request permission:", error);
    return false;
  }
}

/** 获取平台对应的 API URL */
function getPlatformApiUrl(platformId: string, apiBase: string): string {
  switch (platformId) {
    case "openai":
      return "https://api.openai.com";
    case "anthropic":
      return "https://api.anthropic.com";
    case "google":
      return "https://generativelanguage.googleapis.com";
    case "xai":
      return "https://api.x.ai";
    case "deepseek":
      return "https://api.deepseek.com";
    case "openrouter":
      return "https://openrouter.ai";
    case "azure":
      return apiBase || "https://*.openai.azure.com";
    case "bedrock":
      return "https://*.amazonaws.com";
    case "ollama":
      return "http://localhost:11434";
    case "openai-compatible":
      return apiBase;
    default:
      return apiBase;
  }
}

interface MessagePayload {
  type: string;
  payload: Record<string, unknown>;
}

async function handleMessage(message: MessagePayload): Promise<unknown> {
  switch (message.type) {
    case "FETCH_GITHUB":
      return handleGitHubFetch(message.payload);
    case "LLM_CHAT":
      return handleLlmChat(message.payload);
    case "GET_EMBEDDING":
      return handleGetEmbedding(message.payload);
    default:
      return { error: `Unknown message type: ${message.type}` };
  }
}

// ─── GitHub API（fetch，非 OpenAI 兼容格式）─────────────────────────────────

async function handleGitHubFetch(
  payload: Record<string, unknown>,
): Promise<unknown> {
  const { url, token, params } = payload as {
    url: string;
    token?: string;
    params?: Record<string, string>;
  };

  let requestUrl = url;
  if (params) {
    const searchParams = new URLSearchParams(params);
    requestUrl += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "github-repo-radar",
  };
  if (token) {
    headers["Authorization"] = `token ${token}`;
  }

  const resp = await fetch(requestUrl, { headers });
  if (!resp.ok) {
    const text = await resp.text();
    return { error: `GitHub API ${resp.status}: ${text}` };
  }
  const data = await resp.json();
  return { data };
}

// ─── LLM Chat（Vercel AI SDK）──────────────────────────────────────────────

/** 根据平台 ID 获取 LLM provider */
function getLlmProvider(platformId: string, apiBase: string, apiKey: string) {
  switch (platformId) {
    case "openai":
      return createOpenAI({ apiKey });
    case "anthropic":
      return anthropic;
    case "google":
      return google;
    case "xai":
      return xai;
    case "deepseek":
      return deepseek;
    case "openrouter":
      return createOpenRouter({ apiKey });
    case "azure":
      return azure;
    case "bedrock":
      return bedrock;
    case "ollama":
      return ollama;
    case "openai-compatible":
      return createOpenAI({ baseURL: apiBase, apiKey });
    default:
      // 默认使用 OpenAI 兼容模式
      return createOpenAI({ baseURL: apiBase, apiKey });
  }
}

async function handleLlmChat(
  payload: Record<string, unknown>,
): Promise<unknown> {
  const { platformId, apiBase, apiKey, model, messages, temperature } = payload as {
    platformId: string;
    apiBase: string;
    apiKey: string;
    model: string;
    messages: { role: "system" | "user" | "assistant"; content: string }[];
    temperature?: number;
  };

  // 动态请求平台 API 权限
  const apiUrl = getPlatformApiUrl(platformId, apiBase);
  const granted = await requestPermission(apiUrl);
  if (!granted) {
    throw new Error(`Permission denied for ${apiUrl}`);
  }

  const provider = getLlmProvider(platformId, apiBase, apiKey);

  const result = await generateText({
    model: provider.chat(model),
    messages,
    temperature: temperature ?? 0.1,
  });

  return { data: { text: result.text } };
}

// ─── Embedding（Vercel AI SDK）─────────────────────────────────────────────

/** 根据平台 ID 获取 Embedding provider */
function getEmbeddingProvider(platformId: string, apiBase: string, apiKey: string) {
  switch (platformId) {
    case "openai":
      return createOpenAI({ apiKey });
    case "google":
      return google;
    case "azure":
      return azure;
    case "bedrock":
      return bedrock;
    case "openrouter":
      return createOpenRouter({ apiKey });
    case "ollama":
      return ollama;
    case "openai-compatible":
      return createOpenAI({ baseURL: apiBase, apiKey });
    default:
      // 默认使用 OpenAI 兼容模式
      return createOpenAI({ baseURL: apiBase, apiKey });
  }
}

async function handleGetEmbedding(
  payload: Record<string, unknown>,
): Promise<unknown> {
  const { platformId, apiBase, apiKey, model, input } = payload as {
    platformId: string;
    apiBase: string;
    apiKey: string;
    model: string;
    input: string;
  };

  // 动态请求平台 API 权限
  const apiUrl = getPlatformApiUrl(platformId, apiBase);
  const granted = await requestPermission(apiUrl);
  if (!granted) {
    throw new Error(`Permission denied for ${apiUrl}`);
  }

  const provider = getEmbeddingProvider(platformId, apiBase, apiKey);

  const result = await embed({
    model: provider.textEmbedding(model),
    value: input,
  });

  return { data: { embedding: result.embedding } };
}
