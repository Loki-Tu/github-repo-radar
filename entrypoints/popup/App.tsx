import { useState, useEffect, useCallback } from "react";
import type {
  ApiConfig,
  ProgressInfo,
  RankedResult,
} from "../../utils/core/types";
import {
  getApiConfig,
  getSearchState,
  setSearchState,
  clearSearchState,
} from "../../utils/lib/storage";
import { runPipeline } from "../../utils/core/pipeline";
import SearchBar from "./components/SearchBar";
import ProgressIndicator from "./components/ProgressIndicator";
import ResultList from "./components/ResultList";
import SettingsPanel from "./components/SettingsPanel";

type AppState = "idle" | "searching" | "results" | "error";

export default function App() {
  const [state, setState] = useState<AppState>("idle");
  const [config, setConfig] = useState<ApiConfig | null>(null);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [results, setResults] = useState<RankedResult[]>([]);
  const [targetName, setTargetName] = useState("");
  const [lastUrl, setLastUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 加载配置 + 恢复上次搜索状态
  useEffect(() => {
    getApiConfig().then(setConfig);
    getSearchState().then((saved) => {
      if (saved && saved.results.length > 0) {
        setResults(saved.results);
        setTargetName(saved.targetName);
        setLastUrl(saved.lastUrl);
        setState("results");
      }
    });
  }, []);

  const handleSearch = useCallback(
    async (url: string) => {
      if (!config) return;

      // 检查必要的 API Key
      if (!config.llmApiKey || !config.embeddingApiKey) {
        setError("请先在设置中配置 LLM API Key 和 Embedding API Key");
        setState("error");
        return;
      }

      setState("searching");
      setProgress(null);
      setResults([]);
      setError(null);

      try {
        const result = await runPipeline(url, config, 10, setProgress);
        setResults(result.results);
        setTargetName(result.repo.full_name);
        setLastUrl(url);
        setState(result.results.length > 0 ? "results" : "error");

        if (result.results.length === 0) {
          setError("未找到相似仓库，请检查网络或 API 配置");
        } else {
          // 持久化搜索结果
          await setSearchState({
            results: result.results,
            targetName: result.repo.full_name,
            lastUrl: url,
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setState("error");
      }
    },
    [config],
  );

  const handleReset = useCallback(async () => {
    setState("idle");
    setProgress(null);
    setResults([]);
    setError(null);
    await clearSearchState();
  }, []);

  return (
    <div className="w-[420px] min-h-[300px] max-h-[600px] bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-base font-bold flex items-center gap-1.5">
            🎯 GitHub Repo Radar
          </h1>
          {state !== "idle" && state !== "searching" && (
            <button
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← 重新搜索
            </button>
          )}
        </div>

        <SearchBar
          onSearch={handleSearch}
          disabled={state === "searching"}
          initialUrl={state === "results" ? lastUrl : undefined}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Idle state */}
        {state === "idle" && !config?.llmApiKey && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              👋 请先在下方设置中配置 API Key
            </p>
          </div>
        )}

        {state === "idle" && config?.llmApiKey && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              输入 GitHub 仓库 URL，点击搜索发现相似项目
            </p>
          </div>
        )}

        {/* Searching state */}
        {state === "searching" && <ProgressIndicator progress={progress} />}

        {/* Results state */}
        {state === "results" && (
          <ResultList results={results} targetName={targetName} />
        )}

        {/* Error state */}
        {state === "error" && (
          <div className="text-center py-6">
            <p className="text-sm text-red-500 mb-2">❌ {error}</p>
            <button
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              重试
            </button>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="px-4 pb-4">
        <SettingsPanel onConfigSaved={setConfig} />
      </div>
    </div>
  );
}
