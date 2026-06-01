/**
 * Background Service Worker — CORS 代理
 *
 * 浏览器扩展中，Content Script 和 Popup 直接调用外部 API 会受 CORS 限制。
 * Background Service Worker 不受此限制，因此作为请求代理。
 */

export default defineBackground(() => {
  console.log("GitHub Repo Radar background loaded");

  chrome.runtime.onMessage.addListener(
    (message, _sender, sendResponse) => {
      handleMessage(message)
        .then(sendResponse)
        .catch((err) => sendResponse({ error: String(err) }));
      // 返回 true 以保持 sendResponse 通道开放（异步响应）
      return true;
    },
  );
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

/** 代理 GitHub API 请求 */
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

/** 代理 LLM Chat API 请求 */
async function handleLlmChat(
  payload: Record<string, unknown>,
): Promise<unknown> {
  const { apiBase, apiKey, model, messages, temperature } = payload as {
    apiBase: string;
    apiKey: string;
    model: string;
    messages: { role: string; content: string }[];
    temperature?: number;
  };

  const resp = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: temperature ?? 0.1,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    return { error: `LLM API ${resp.status}: ${text}` };
  }
  const data = await resp.json();
  return { data };
}

/** 代理 Embedding API 请求 */
async function handleGetEmbedding(
  payload: Record<string, unknown>,
): Promise<unknown> {
  const { apiBase, apiKey, model, input } = payload as {
    apiBase: string;
    apiKey: string;
    model: string;
    input: string;
  };

  const resp = await fetch(`${apiBase}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [input],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    return { error: `Embedding API ${resp.status}: ${text}` };
  }
  const data = await resp.json();
  return { data };
}
