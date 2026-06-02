/**
 * PostHog Analytics 封装
 *
 * - 未配置 VITE_POSTHOG_KEY 时所有函数为空操作
 * - 用户可在设置中关闭埋点
 * - 事件属性尽量精简，不收集敏感信息
 */

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string) || "https://us.i.posthog.com";

const ANALYTICS_OPT_OUT_KEY = "analytics_opt_out";

/** 生成随机用户 ID */
function generateUserId(): string {
  return "user-" + Math.random().toString(36).substring(2, 15);
}

/** 获取或创建用户 ID */
function getUserId(): string {
  const storageKey = "analytics_user_id";
  let userId = localStorage.getItem(storageKey);
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem(storageKey, userId);
  }
  return userId;
}

/** 直接发送事件到 PostHog（不依赖 posthog-js 库） */
async function sendEvent(eventName: string, properties: Record<string, any> = {}): Promise<void> {
  if (!POSTHOG_KEY) return;

  const userId = getUserId();
  const event = {
    api_key: POSTHOG_KEY,
    event: eventName,
    properties: {
      distinct_id: userId,
      ...properties,
    },
    timestamp: new Date().toISOString(),
  };

  try {
    console.log("[Analytics] Sending event:", eventName, properties);
    const response = await fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    const data = await response.json();
    console.log("[Analytics] Event sent:", eventName, data);
  } catch (error) {
    console.error("[Analytics] Failed to send event:", eventName, error);
  }
}

/** 检查用户是否已关闭埋点 */
export async function isAnalyticsOptedOut(): Promise<boolean> {
  const result = await chrome.storage.local.get(ANALYTICS_OPT_OUT_KEY);
  return !!result[ANALYTICS_OPT_OUT_KEY];
}

/** 设置埋点开关 */
export async function setAnalyticsOptOut(optedOut: boolean): Promise<void> {
  await chrome.storage.local.set({ [ANALYTICS_OPT_OUT_KEY]: optedOut });
}

// ─── 事件追踪函数 ───────────────────────────────────────────────────────────

/** Popup 打开 */
export async function trackPopupOpened(hasConfig: boolean, lang: string): Promise<void> {
  if (await isAnalyticsOptedOut()) return;
  await sendEvent("extension_opened", { has_config: hasConfig, lang });
}

/** 搜索开始 */
export async function trackSearchStarted(params: {
  llm_platform: string;
  has_embedding: boolean;
  has_github_token: boolean;
}): Promise<void> {
  if (await isAnalyticsOptedOut()) return;
  await sendEvent("search_started", params);
}

/** 搜索完成 */
export async function trackSearchCompleted(params: {
  result_count: number;
  used_embedding: boolean;
  duration_ms: number;
}): Promise<void> {
  if (await isAnalyticsOptedOut()) return;
  await sendEvent("search_completed", params);
}

/** 点击搜索结果 */
export async function trackResultClicked(params: {
  rank: number;
  score: number;
}): Promise<void> {
  if (await isAnalyticsOptedOut()) return;
  await sendEvent("result_clicked", params);
}

/** 打开设置页 */
export async function trackSettingsOpened(): Promise<void> {
  if (await isAnalyticsOptedOut()) return;
  await sendEvent("settings_opened", {});
}
