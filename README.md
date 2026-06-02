# GitHub Repo Radar

English | [简体中文](./README-zh.md)

> 🎯 Find similar GitHub repos — powered by LLM and vector search. Browser extension.

Enter a GitHub repo URL, and it automatically analyzes project features, runs parallel multi-path recall + two-phase ranking, to find the most similar open-source projects.

## 🔒 Security & Privacy

**This project is fully open source.** All code is transparent and auditable.

- **All data stays local** — search results, cached features, and settings are stored in your browser's `chrome.storage.local`. Nothing is sent to any third-party server except the APIs you configure yourself.
- **Your API keys never leave your browser** — they are stored locally and only sent directly to the API endpoints you configure (OpenAI, Anthropic, SiliconFlow, etc.). No telemetry, no tracking, no middleman.
- **No accounts required** — just fill in your own API keys and start using.

## How It Works

```
User enters GitHub URL
        ↓
  Fetch repo info + README
        ↓
  LLM extracts structured features (core problem, type, features, competitors, search query)
        ↓
  Parallel multi-path recall (LLM query / "xxx alternative" / competitor names)
        ↓
  Two-phase ranking
    ├─ Pass 1: Topic + description keywords + Stars (CPU-only, fast filter top 30)
    └─ Pass 2: Embedding similarity + Topic overlap + Activity (precise ranking top N)
        ↓
  Show results
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Build | [WXT](https://wxt.dev/) + Vite |
| Framework | React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Spec | Manifest V3 |

## Quick Start

### 1. Install

```bash
npm install
```

### 2. Configure API Keys

Click the extension icon to open the Popup, then click "⚙️ Settings" at the bottom:

| Config | Description | Required |
|--------|-------------|----------|
| GitHub Token | Raises rate limit to 5,000 req/hr | Recommended |
| LLM API Key | Select a platform and fill in the key | ✅ |
| Embedding API Key | Optional — enables more accurate semantic ranking | Optional |

Supported LLM platforms: OpenAI, Anthropic, SiliconFlow, OpenAI Compatible (e.g. MiMo), Anthropic Compatible

### 3. Dev

```bash
npm run dev
```

Load `.output/chrome-mv3-dev/` as an unpacked extension in Chrome:

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `.output/chrome-mv3-dev/` directory

#### Dev Config (Optional)

For convenience during development, you can create a `dev.config.local.ts` file to pre-fill API keys. This file is gitignored and **only works in development mode**:

```typescript
// dev.config.local.ts
export default {
  llmPlatformId: "openai",
  llmApiKey: "sk-xxx",
  llmModel: "gpt-4o-mini",
  embeddingPlatformId: "siliconflow",
  embeddingApiKey: "sk-xxx",
  embeddingModel: "BAAI/bge-m3",
};
```

When you run `npm run dev`, these values will be automatically saved to the extension's settings page. You can still modify them in the UI. In production builds (`npm run build`), this file is ignored and users must configure keys manually.

### 4. Build

```bash
npm run build        # Chrome
npm run build:firefox # Firefox
```

## Project Structure

```
├── entrypoints/
│   ├── background.ts                # Service Worker — CORS proxy
│   ├── popup/                       # Popup UI (React)
│   │   ├── App.tsx
│   │   └── components/
│   │       ├── SearchBar.tsx        # URL input + auto-detect current page
│   │       ├── ProgressIndicator.tsx # 7-stage progress display
│   │       ├── ResultList.tsx       # Results list
│   │       └── ResultItem.tsx       # Result card
│   └── options/                     # Options Page — full settings
│       ├── App.tsx
│       └── index.html
├── utils/
│   ├── api/                         # API layer (GitHub / LLM / Embedding)
│   ├── core/                        # Core algorithms (extraction / recall / ranking / pipeline)
│   ├── i18n/                        # Internationalization (en / zh-CN)
│   ├── lib/                         # Utilities (Semaphore / Storage / vector math)
│   ├── platforms.ts                 # Platform presets
│   └── config.ts                    # Default config
├── public/                          # Extension icons
└── docs/                            # Design documents
```

## Algorithm Details

- **Topic overlap**: Overlap Coefficient (not Jaccard) — avoids penalizing sets of very different sizes
- **Fast filter**: Topic overlap 40% + Description keywords 40% + Stars 20%
- **Precise ranking** (requires Embedding): Cosine similarity 60% + Topic overlap 30% + Activity 10%
- **Degraded mode**: Without Embedding, falls back to fast keyword matching only
- **Concurrency**: README fetch Semaphore(5), Embedding pauses 300ms every 5 requests
- **Caching**: LLM-extracted features cached by repo name in `chrome.storage.local`

## i18n

Supports English and Simplified Chinese. Auto-detects browser language preference, with manual toggle in the UI.

## Cross-browser

```bash
npm run dev            # Chrome dev
npm run dev:firefox    # Firefox dev
npm run build          # Chrome production
npm run build:firefox  # Firefox production
```

## Feedback

Found a bug or have a suggestion? [Open an issue](https://github.com/your-username/repo-radar/issues) on GitHub.

## License

MIT
