import { defineConfig } from "wxt";
import { loadEnv } from "vite";
import { existsSync } from "fs";
import { resolve } from "path";

/** 尝试加载本地开发配置（仅开发模式） */
async function loadDevConfig(isDev: boolean): Promise<Record<string, string>> {
  if (!isDev) {
    console.log("[WXT] Production mode - skipping dev config");
    return {};
  }

  const devConfigPath = resolve(process.cwd(), "dev.config.local.ts");
  if (!existsSync(devConfigPath)) return {};

  try {
    // 使用动态 import 加载 TS 文件（Node.js 会自动处理）
    const mod = await import(devConfigPath);
    const config = mod.default || mod;
    if (typeof config === "object" && config !== null) {
      console.log("[WXT] Dev mode - loaded config from dev.config.local.ts");
      return config as Record<string, string>;
    }
  } catch (e) {
    // 如果 import 失败，尝试使用 tsx/ts-node
    console.warn("[WXT] Could not import dev.config.local.ts directly, trying alternative...");
  }

  return {};
}

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: async (env) => {
    const viteEnv = loadEnv(env.mode, process.cwd(), "");

    // 判断是否为开发模式
    // wxt 命令默认 mode=development，wxt build 默认 mode=production
    const isDev = env.mode === "development";

    // 检查是否启用开发环境自动填写 API Key
    const enableDevAutoKey = viteEnv.VITE_ENABLE_DEV_AUTO_KEY !== "false";

    // 尝试加载本地开发配置（仅开发模式且开关开启）
    const devApiConfig = isDev && enableDevAutoKey ? await loadDevConfig(isDev) : {};

    return {
      define: {
        "import.meta.env.VITE_POSTHOG_KEY": JSON.stringify(viteEnv.VITE_POSTHOG_KEY || devApiConfig.VITE_POSTHOG_KEY || ""),
        "import.meta.env.VITE_POSTHOG_HOST": JSON.stringify(viteEnv.VITE_POSTHOG_HOST || devApiConfig.VITE_POSTHOG_HOST || "https://us.i.posthog.com"),
        "import.meta.env.VITE_ENABLE_DEV_AUTO_KEY": JSON.stringify(enableDevAutoKey),
        "import.meta.env.VITE_DEV_API_CONFIG": JSON.stringify(devApiConfig),
      },
    };
  },
  manifest: {
    name: "GitHub Repo Radar",
    description:
      "Discover similar GitHub repos — powered by LLM and vector search",
    icons: {
      "16": "icon-16.png",
      "32": "icon-32.png",
      "48": "icon-48.png",
      "128": "icon-128.png",
    },
    permissions: ["storage", "activeTab", "permissions"],
    host_permissions: [
      "https://api.github.com/*",
      "https://*.posthog.com/*",
    ],
    optional_host_permissions: [
      "<all_urls>",
    ],
  },
  hooks: {
    "build:manifestGenerated": (_wxt, manifest) => {
      if (manifest.options_ui) {
        manifest.options_ui.open_in_tab = true;
      }
    },
  },
});
