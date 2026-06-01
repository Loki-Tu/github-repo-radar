/**
 * Embedding API 调用层
 *
 * 通过 background script 代理，使用 OpenAI SDK 处理实际请求。
 * 支持所有 OpenAI 兼容的 embedding provider（OpenAI、SiliconFlow、Qwen 等）。
 */

import type { EmbeddingPayload } from "../core/types";

/**
 * 获取文本的 embedding 向量
 * @returns 浮点数数组（向量）
 */
export async function getEmbedding(
  payload: EmbeddingPayload,
): Promise<number[]> {
  const response = await chrome.runtime.sendMessage({
    type: "GET_EMBEDDING",
    payload,
  });
  if (response.error) {
    throw new Error(response.error);
  }
  // OpenAI SDK 返回的 EmbeddingResponse 对象
  return response.data.data[0].embedding;
}
