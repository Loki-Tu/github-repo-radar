/**
 * 简易 i18n 系统
 *
 * - 默认语言：英文
 * - 支持：English, 简体中文
 * - 语言偏好存储在 chrome.storage.local
 * - 自动从浏览器语言检测
 */

import { createContext, useContext } from "react";
import en from "./en";
import zhCN from "./zh-CN";

export type Locale = Record<string, string>;

export type Lang = "en" | "zh-CN";

const LOCALES: Record<Lang, Locale> = {
  en,
  "zh-CN": zhCN,
};

export const I18nContext = createContext<Locale>(en);

/** 获取当前翻译对象（在组件中使用） */
export function useI18n(): Locale {
  return useContext(I18nContext);
}

/** 从浏览器语言检测默认语言 */
export function detectBrowserLang(): Lang {
  const nav = navigator.language || "en";
  if (nav.startsWith("zh")) return "zh-CN";
  return "en";
}

/** 获取语言对应的翻译包 */
export function getLocale(lang: Lang): Locale {
  return LOCALES[lang] ?? en;
}

const LANG_STORAGE_KEY = "ui_lang";

/** 从存储读取语言偏好 */
export async function getSavedLang(): Promise<Lang> {
  const result = await chrome.storage.local.get(LANG_STORAGE_KEY);
  return (result[LANG_STORAGE_KEY] as Lang) ?? detectBrowserLang();
}

/** 保存语言偏好 */
export async function setSavedLang(lang: Lang): Promise<void> {
  await chrome.storage.local.set({ [LANG_STORAGE_KEY]: lang });
}
