# GitHub Repo Radar

[English](./README.md) | 简体中文

> 🎯 基于 LLM 和向量检索的相似 GitHub 仓库发现引擎 — 浏览器扩展

输入一个 GitHub 仓库 URL，自动分析项目特征，通过多路召回 + 两阶段排序，找到最相似的开源项目。

## 🔒 安全与隐私

**本项目完全开源。** 所有代码透明可审计。

- **所有数据存本地** — 搜索结果、特征缓存、设置项均存储在浏览器的 `chrome.storage.local` 中，不会发送到任何第三方服务器（你自己配置的 API 除外）。
- **API Key 不会离开你的浏览器** — 密钥仅存储在本地，仅直接发送到你配置的 API 端点（OpenAI、Anthropic、SiliconFlow 等）。无遥测、无追踪、无中间人。
- **无需注册账号** — 填入你自己的 API Key 即可使用。

## 工作原理

```
用户输入 GitHub URL
      ↓
  获取仓库信息 + README
      ↓
  LLM 提取结构化特征（核心问题、系统类型、关键特性、竞品、搜索词）
      ↓
  并行多路召回（LLM 搜索词 / "xxx alternative" / 竞品名）
      ↓
  两阶段排序
    ├─ Pass 1: Topic + 描述关键词 + Stars（纯 CPU，快速过滤 top 30）
    └─ Pass 2: Embedding 语义相似度 + Topic 重叠 + 活跃度（精准排序 top N）
      ↓
  展示结果列表
```

## 技术栈

| 层级 | 选型 |
|------|------|
| 构建框架 | [WXT](https://wxt.dev/) + Vite |
| 前端框架 | React 19 |
| 类型系统 | TypeScript (strict) |
| 样式方案 | Tailwind CSS |
| 扩展规范 | Manifest V3 |

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 API Key

点击扩展图标打开 Popup，底部点击「⚙️ Settings」进入设置页面：

| 配置项 | 说明 | 是否必需 |
|--------|------|----------|
| GitHub Token | 提升 API 限流至 5000 次/小时 | 推荐 |
| LLM API Key | 选择平台后填写对应密钥 | ✅ |
| Embedding API Key | 可选，启用后结果更精准 | 可选 |

支持的 LLM 平台：OpenAI、Anthropic、SiliconFlow、OpenAI 兼容（如 MiMo）、Anthropic 兼容

### 3. 开发

```bash
npm run dev
```

在 Chrome 中加载 `.output/chrome-mv3/` 为扩展：

1. 打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `.output/chrome-mv3/` 目录

### 4. 构建

```bash
npm run build        # Chrome
npm run build:firefox # Firefox
```

## 项目结构

```
├── entrypoints/
│   ├── background.ts                # Service Worker — CORS 代理
│   ├── popup/                       # Popup UI（React）
│   │   ├── App.tsx
│   │   └── components/
│   │       ├── SearchBar.tsx        # URL 输入 + 自动检测当前页面
│   │       ├── ProgressIndicator.tsx # 7 阶段进度展示
│   │       ├── ResultList.tsx       # 结果列表
│   │       └── ResultItem.tsx       # 结果卡片
│   └── options/                     # Options Page — 完整设置页
│       ├── App.tsx
│       └── index.html
├── utils/
│   ├── api/                         # API 调用层（GitHub / LLM / Embedding）
│   ├── core/                        # 核心算法（特征提取 / 召回 / 排序 / 流程编排）
│   ├── i18n/                        # 国际化（en / zh-CN）
│   ├── lib/                         # 工具库（Semaphore / Storage / 向量计算）
│   ├── platforms.ts                 # 平台预设配置
│   └── config.ts                    # 默认配置
├── public/                          # 扩展图标
└── docs/                            # 设计文档
```

## 算法细节

- **Topic 重叠度**：使用 Overlap Coefficient（非 Jaccard），避免集合大小差异过大时的误惩罚
- **快速过滤**：Topic 重叠 40% + 描述关键词匹配 40% + Stars 20%
- **精准排序**（需 Embedding）：余弦相似度 60% + Topic 重叠 30% + 活跃度 10%
- **降级模式**：未配置 Embedding 时仅使用快速过滤，仍可正常搜索
- **并发控制**：README 获取 Semaphore(5)，Embedding 每 5 个暂停 300ms
- **缓存**：LLM 提取的特征按仓库名缓存在 `chrome.storage.local`

## 多语言

扩展支持英文和简体中文，自动匹配浏览器首选语言，也可在界面中手动切换。

## 跨浏览器支持

```bash
npm run dev            # Chrome 开发
npm run dev:firefox    # Firefox 开发
npm run build          # Chrome 生产构建
npm run build:firefox  # Firefox 生产构建
```

## 反馈

遇到 Bug 或有建议？在 GitHub 上 [提交 Issue](https://github.com/your-username/repo-radar/issues)。

## License

MIT
