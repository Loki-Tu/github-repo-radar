import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "GitHub Repo Radar",
    description:
      "发现相似 GitHub 仓库 — 基于 LLM 和向量检索的相关项目挖掘引擎",
    icons: {
      "16": "icon-16.png",
      "32": "icon-32.png",
      "48": "icon-48.png",
      "128": "icon-128.png",
    },
    permissions: ["storage", "activeTab"],
    host_permissions: [
      "https://api.github.com/*",
      "https://*.xiaomimimo.com/*",
      "https://*.siliconflow.cn/*",
      "https://*.openai.com/*",
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
