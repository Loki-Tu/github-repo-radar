/**
 * PostHog Analytics 封装
 *
 * - 未配置 VITE_POSTHOG_KEY 时所有函数为空操作
 * - 用户可在设置中关闭埋点
 * - 事件属性尽量精简，不收集敏感信息
 */

import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string) || "https://us.i.posthog.com";

const ANALYTICS_OPT_OUT_KEY = "analytics_opt_out";
let initialized = false;

/** 初始化 PostHog（仅调用一次） */
function ensureInit(): void {
  if (initialized) return;
  initialized = true;

  if (!POSTHOG_KEY) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: false,
    // 浏览器扩展无 cookies，用 localStorage
    persistence: "localStorage",
    // 不捕获 autocapture（点击、输入等），只手动采集
    autocapture: false,
  });
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
  ensureInit();
  if (!POSTHOG_KEY) return;
  posthog.capture("extension_opened", { has_config: hasConfig, lang });
}

/** 搜索开始 */
export async function trackSearchStarted(params: {
  llm_platform: string;
  has_embedding: boolean;
  has_github_token: boolean;
}): Promise<void> {
  if (await isAnalyticsOptedOut()) return;
  ensureInit();
  if (!POSTHOG_KEY) return;
  posthog.capture("search_started", params);
}

/** 搜索完成 */
export async function trackSearchCompleted(params: {
  result_count: number;
  used_embedding: boolean;
  duration_ms: number;
}): Promise<void> {
  if (await isAnalyticsOptedOut()) return;
  ensureInit();
  if (!POSTHOG_KEY) return;
  posthog.capture("search_completed", params);
}

/** 点击搜索结果 */
export async function trackResultClicked(params: {
  rank: number;
  score: number;
}): Promise<void> {
  if (await isAnalyticsOptedOut()) return;
  ensureInit();
  if (!POSTHOG_KEY) return;
  posthog.capture("result_clicked", params);
}

/** 打开设置页 */
export async function trackSettingsOpened(): Promise<void> {
  if (await isAnalyticsOptedOut()) return;
  ensureInit();
  if (!POSTHOG_KEY) return;
  posthog.capture("settings_opened", {});
}
