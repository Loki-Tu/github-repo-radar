/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** PostHog 埋点 Key */
  readonly VITE_POSTHOG_KEY: string;
  /** PostHog 埋点 Host */
  readonly VITE_POSTHOG_HOST: string;
  /** 是否启用开发环境自动填写 API Key */
  readonly VITE_ENABLE_DEV_AUTO_KEY: string;
  /** 开发环境 API 配置（由 wxt.config.ts 注入） */
  readonly VITE_DEV_API_CONFIG: Record<string, string>;
}
