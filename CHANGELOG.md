# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-06-03

### Added
- Sort options for search results (Score, Relevance, Stars, Topics)
- Dev auto-fill API key toggle via `VITE_ENABLE_DEV_AUTO_KEY` environment variable
- Dynamic permission request on settings save (Popup & Options)
- Two new recall strategies: system_type search and key_features search
- `env.d.ts` for TypeScript type declarations
- `CHANGELOG.md` for version tracking

### Changed
- LLM prompt switched from Chinese to English for better model compatibility
- Permission request moved from API calls to settings save time
- Increased competitor recall from 2 to 3
- Host permissions use `optional_host_permissions` for Manifest V3 compliance
- UI hides Embedding-related elements when Embedding is not configured

### Fixed
- Embedding return value structure mismatch causing semantic scores to be 0
- Permission request not showing popup (use `optional_host_permissions` instead of `optional_permissions`)

## [0.1.0] - 2026-06-02

### Added
- Initial release
- GitHub repo similarity search powered by LLM and vector search
- Multi-platform LLM support (OpenAI, Anthropic, Google, xAI, DeepSeek, OpenRouter, Azure, Bedrock, Ollama, OpenAI Compatible)
- Multi-platform Embedding support (OpenAI, Google, Azure, Bedrock, OpenRouter, Ollama, OpenAI Compatible)
- Two-phase ranking: fast keyword filtering + semantic embedding ranking
- Parallel multi-path recall strategy
- PostHog analytics with privacy opt-out
- i18n support (English, Chinese)
- Chrome Manifest V3 support
