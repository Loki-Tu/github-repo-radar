/**
 * Background Service Worker — CORS 代理 + Vercel AI SDK
 *
 * 浏览器扩展中，Popup 直接调用外部 API 会受 CORS 限制。
 * Background Service Worker 不受此限制，使用 Vercel AI SDK 处理所有 LLM/Embedding 请求。
 */

import { createOpenAI } from "@ai-sdk/openai";
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

async function handleLlmChat(
  payload: Record<string, unknown>,
): Promise<unknown> {
  const { apiBase, apiKey, model, messages, temperature } = payload as {
    apiBase: string;
    apiKey: string;
    model: string;
    messages: { role: "system" | "user" | "assistant"; content: string }[];
    temperature?: number;
  };

  const provider = createOpenAI({ baseURL: apiBase, apiKey });

  const result = await generateText({
    model: provider.chat(model),
    messages,
    temperature: temperature ?? 0.1,
  });

  return { data: { text: result.text } };
}

// ─── Embedding（Vercel AI SDK）─────────────────────────────────────────────

async function handleGetEmbedding(
  payload: Record<string, unknown>,
): Promise<unknown> {
  const { apiBase, apiKey, model, input } = payload as {
    apiBase: string;
    apiKey: string;
    model: string;
    input: string;
  };

  const provider = createOpenAI({ baseURL: apiBase, apiKey });

  const result = await embed({
    model: provider.textEmbedding(model),
    value: input,
  });

  return { data: { embedding: result.embedding } };
}
