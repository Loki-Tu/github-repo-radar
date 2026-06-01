/**
 * Embedding API 调用层（OpenAI 兼容格式）
 * 移植自 ref/src/finder/ranker.py
 */

import type { EmbeddingPayload } from "../core/types";

interface EmbeddingResponse {
  data: { embedding: number[] }[];
}

/** 通过 background script 代理获取文本 embedding */
export async function getEmbedding(payload: EmbeddingPayload): Promise<number[]> {
  const response = await chrome.runtime.sendMessage({
    type: "GET_EMBEDDING",
    payload,
  });
  if (response.error) {
    throw new Error(response.error);
  }
  const data = response.data as EmbeddingResponse;
  return data.data[0].embedding;
}
