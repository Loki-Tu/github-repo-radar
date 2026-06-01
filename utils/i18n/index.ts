/**
 * 简易 i18n 系统
 *
 * - 支持：English, 简体中文
 * - 语言优先级：用户手动选择 > 浏览器首选语言 > 默认英文
 * - 浏览器语言检测：遍历 navigator.languages，匹配首个支持的语言，无匹配则 fallback 英文
 */

import { createContext, useContext } from "react";
import en from "./en";
import zhCN from "./zh-CN";

export type Locale = Record<string, string>;

export type Lang = "en" | "zh-CN";

/** 支持的语言列表，按优先级排列 */
const SUPPORTED_LANGS: Lang[] = ["zh-CN", "en"];

const LOCALES: Record<Lang, Locale> = {
  en,
  "zh-CN": zhCN,
};

export const I18nContext = createContext<Locale>(en);

/** 获取当前翻译对象（在组件中使用） */
export function useI18n(): Locale {
  return useContext(I18nContext);
}

/**
 * 从浏览器语言列表中检测匹配的语言
 *
 * 遍历 navigator.languages（按用户偏好排序），找到首个支持的语言。
 * 示例：["zh-TW", "zh", "en-US", "en"] → 匹配 "zh-CN"（zh 前缀匹配）
 * 示例：["ja", "en"] → 无匹配，fallback "en"
 */
export function detectBrowserLang(): Lang {
  const languages = navigator.languages || [navigator.language || "en"];

  for (const lang of languages) {
    const normalized = lang.toLowerCase();

    // 精确匹配
    if (normalized === "zh-cn" || normalized === "zh-hans") return "zh-CN";
    if (normalized === "en") return "en";

    // 前缀匹配：zh-* → zh-CN, en-* → en
    if (normalized.startsWith("zh")) return "zh-CN";
    if (normalized.startsWith("en")) return "en";
  }

  // 无匹配，fallback 英文
  return "en";
}

/** 获取语言对应的翻译包 */
export function getLocale(lang: Lang): Locale {
  return LOCALES[lang] ?? en;
}

const LANG_STORAGE_KEY = "ui_lang";

/** 从存储读取语言偏好，无存储则检测浏览器语言 */
export async function getSavedLang(): Promise<Lang> {
  const result = await chrome.storage.local.get(LANG_STORAGE_KEY);
  const saved = result[LANG_STORAGE_KEY] as Lang | undefined;
  if (saved && LOCALES[saved]) return saved;
  return detectBrowserLang();
}

/** 保存语言偏好 */
export async function setSavedLang(lang: Lang): Promise<void> {
  await chrome.storage.local.set({ [LANG_STORAGE_KEY]: lang });
}
