/**
 * LLM Chat API 调用层
 *
 * 通过 background script 代理，使用 Vercel AI SDK 处理实际请求。
 * 支持所有 OpenAI 兼容的 provider（OpenAI、MiMo、SiliconFlow 等）。
 */

import type { LlmChatPayload } from "../core/types";

/**
 * 发送 Chat Completion 请求
 * @returns LLM 回复的文本内容
 */
export async function chatCompletion(
  payload: LlmChatPayload,
): Promise<string> {
  const response = await chrome.runtime.sendMessage({
    type: "LLM_CHAT",
    payload,
  });
  if (response.error) {
    throw new Error(response.error);
  }
  // Vercel AI SDK generateText 返回 { text: string }
  return response.data.text;
}
