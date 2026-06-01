/**
 * LLM Chat API 调用层（OpenAI 兼容格式）
 * 移植自 ref/src/finder/extractor.py
 */

import type { LlmChatPayload } from "../core/types";

interface ChatCompletionResponse {
  choices: { message: { content: string } }[];
}

/** 通过 background script 代理发送 LLM 请求 */
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
  const data = response.data as ChatCompletionResponse;
  return data.choices[0].message.content;
}
