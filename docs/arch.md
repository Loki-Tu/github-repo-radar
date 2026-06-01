# 现代化浏览器插件开发技术要求文档 (Technical Requirements Document)

## 1. 概述 (Overview)
本项目旨在基于当前最成熟、最现代化的 Web 前端技术栈，构建一款高性能、跨浏览器兼容的浏览器扩展插件。文档规定了项目的底层基础设施、编程语言、前端框架、UI 规范及工程化标准，全体开发人员须严格遵守此技术规范。

---

## 2. 核心技术栈架构 (Core Architecture)

项目采用以下“黄金组合”架构，以确保极致的开发体验与工业级的产物质量：


| 架构分层 | 选型技术 | 核心定位与技术价值 |
| :--- | :--- | :--- |
| **骨架层 (Infrastructure)** | **WXT + Vite** | 基于 Vite 的下一代插件框架，支持多浏览器全自动打包与零延迟热更新 (HMR)。 |
| **语言层 (Language)** | **TypeScript** | 提供强类型约束、智能代码补全与编译期错误检查，杜绝低级运行时 Bug。 |
| **逻辑层 (Framework)** | **React 19 / Vue 3** | 采用成熟的组件化驱动模式，完美承载 Popup、SidePanel 与 Options 多单页场景。 |
| **视图层 (UI & CSS)** | **Tailwind CSS + Shadcn/ui** | 原子化 CSS 配合无样式组件，提供高颜值的 UI 响应能力，彻底避免宿主页面样式污染。 |

---

## 3. 详细技术规范与要求 (Technical Specifications)

### 3.1 基础设施与构建工具 (WXT + Vite)
* **规范标准**：必须完全基于 **Manifest V3 (MV3)** 规范进行开发。
* **跨平台兼容**：源码必须保持平台无关性，通过 WXT 构建命令一键分发至 `Chrome`、`Firefox`、`Edge` 及 `Safari`。
* **目录路由化**：严禁手动硬编码 `manifest.json`。必须利用 WXT 的文件路由系统，将核心入口组织在 `entrypoints/` 目录下（如 `entrypoints/popup.html`, `entrypoints/background.ts`）。

### 3.2 编程语言 (TypeScript)
* **类型安全**：项目全局开启严格模式 (`strict: true`)。严禁滥用 `any` 类型，所有浏览器原生 API 交互、消息通信（Runtime Messaging）必须显式定义 Interface 或 Type。
* **API 调用**：统一采用 Promise 风格的现代化异步调用，杜绝传统的回调地狱（Callback Hell）。

### 3.3 前端框架 (React / Vue 3)
* **状态管理**：
  * 若采用 **React**：必须使用 React 19 规范，全面拥抱 Hooks（`useState`, `useEffect`），状态提升需合理，避免不必要的全局 Context 滥用。
  * 若采用 **Vue 3**：必须使用组合式 API（`Composition API`）与 `<script setup>` 语法糖，确保逻辑高内聚。
* **存储同步**：针对插件持久化数据，优先使用 WXT 封装的响应式 Storage 机制，确保 `Content Script`、`Background` 和 `Popup` 之间的状态多端实时同步。

### 3.4 视图与样式控制 (Tailwind CSS + Shadcn/ui)
* **样式隔离**：在 `Content Script`（注入到宿主页面的脚本）中构建 UI 时，**必须使用 Shadow DOM** 进行包裹，严禁直接向宿主页面全局盲目插入 CSS，防止样式相互污染。
* **组件抽离**：UI 组件库采用 `Shadcn/ui` 模式。所有通用组件（如 Button, Dialog, Switch）的代码必须落地在项目的本地源码中（如 `@/components/ui/*`），以便进行 100% 的自由定制与摇树优化（Tree Shaking），从而控制产物提交体积。

---

## 4. 工程化与依赖管理 (Engineering & Package Management)

### 4.1 依赖安装规范
* **构建隔离**：严禁依赖本地 Homebrew、Npm 全局包等带有环境污染风险的构建链路。
* **CLI 工具链**：开发依赖中的脚手架、独立二进制工具（如 `ripgrep` 等），优先采用基于专属语言的高效本地管理方案（如前端工具链走 npm/pnpm，系统工具优先走 Rust 的 `cargo install` 并做好全局软链接配置），确保开发环境的一致性。

### 4.2 结构化数据存储
* 若插件涉及大量本地结构化数据或历史记录缓存，严禁单一依赖脆弱的 `chrome.storage.local`（易受体积和性能限制）。
* **技术要求**：必须引入 `Dexie.js` 针对浏览器原生的 `IndexedDB` 进行高层级事务封装，确保数据读写的高性能与稳定性。

---

## 5. 起步执行命令 (Getting Started)

新项目初始化及开发流程必须严格执行以下标准命令：

```bash
# 1. 依托 WXT 官方脚手架初始化现代骨架（依次选择 React/Vue -> TypeScript）
npx wxt@latest init my-modern-extension

# 2. 进入项目并安装现代 UI 依赖
cd my-modern-extension
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 3. 启动本地极速实时热更新开发环境
npm run dev