const en: Record<string, string> = {
  appName: "GitHub Repo Radar",

  // Search bar
  searchPlaceholder: "GitHub repo URL, e.g. https://github.com/fastapi/fastapi",
  search: "Search",
  searching: "Searching...",
  backToSearch: "← New search",

  // Idle state
  idleNoKey: "👋 Configure your API keys in Settings below to get started",
  idleReady: "Enter a GitHub repo URL to discover similar projects",

  // Settings
  settings: "Settings",
  needsConfig: "API keys required",
  githubToken: "GitHub Token",
  githubTokenHint: "Recommended — raises rate limit to 5,000 req/hr",
  githubTokenGuideTitle: "How to get a GitHub Token",
  githubTokenGuideStep1: "1. Go to",
  githubTokenGuideStep1Link: "github.com/settings/tokens",
  githubTokenGuideStep2: '2. Click "Generate new token (classic)"',
  githubTokenGuideStep3: '3. Check the "repo" scope',
  githubTokenGuideStep4: "4. Generate and paste the token here",
  llmPlatform: "LLM Platform",
  embeddingPlatform: "Embedding Platform",
  embeddingOptional: "Optional",
  embeddingHint: "Enables semantic ranking for more accurate results. Without it, uses fast keyword matching only.",
  embeddingGuideTitle: "What does Embedding do?",
  embeddingGuideP1: "Embedding converts code/repo descriptions into vectors, enabling semantic similarity comparison — much more accurate than keyword matching alone.",
  embeddingGuideP2: "Configured → Full two-phase ranking (semantic + keyword + activity)",
  embeddingGuideP3: "Not configured → Fast keyword matching only (still works, less precise)",
  apiKey: "API Key",
  apiBase: "API Base URL",
  model: "Model",
  selectPlatform: "Select a platform...",
  save: "Save",
  saved: "✓ Saved",

  // Platforms
  platformOpenai: "OpenAI",
  platformAnthropic: "Anthropic",
  platformGoogle: "Google Gemini",
  platformXai: "xAI Grok",
  platformDeepseek: "DeepSeek",
  platformOpenrouter: "OpenRouter",
  platformAzure: "Azure OpenAI",
  platformBedrock: "Amazon Bedrock",
  platformOllama: "Ollama",
  platformOpenaiCompatible: "OpenAI Compatible",

  // Progress stages
  stageFetching: "Fetching repo data",
  stageExtracting: "LLM feature extraction",
  stageRecalling: "Parallel multi-path recall",
  stageFiltering: "Fast filtering",
  stageFetchingReadmes: "Fetching READMEs",
  stageEmbedding: "Generating embeddings",
  stageRanking: "Precise ranking",

  // Results
  topResults: "Top {count} Similar Projects",
  target: "Target:",
  scoreFormula: "Score = Semantic×0.6 + Topic×0.3 + Activity×0.1",
  noDescription: "No description",
  score: "Score",
  semantic: "Semantic",
  topic: "Topic",

  // Errors
  errorNoKeys: "Please configure LLM API Key and Embedding API Key in Settings first",
  errorNoResults: "No similar repos found. Check your network or API config",
  retry: "Retry",

  // Footer
  feedback: "Feedback & Issues",
  openSource: "Open source",
  privacyNotice: "All data stored locally · Your API keys never leave your browser",

  // Analytics
  analyticsTitle: "Usage Analytics",
  analyticsDesc: "Helps improve the extension by collecting anonymous usage data (e.g. search count, features used). No personal data, API keys, or search content is collected.",
  analyticsOptOut: "Disable anonymous analytics",
} as const;

export type Locale = Record<string, string>;
export default en;
