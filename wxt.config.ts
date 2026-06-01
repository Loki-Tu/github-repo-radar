import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "GitHub Repo Radar",
    description:
      "发现相似 GitHub 仓库 — 基于 LLM 和向量检索的相关项目挖掘引擎",
    permissions: ["storage", "activeTab"],
    host_permissions: [
      "https://api.github.com/*",
      "https://*.xiaomimimo.com/*",
      "https://*.siliconflow.cn/*",
      "https://*.openai.com/*",
    ],
  },
});
