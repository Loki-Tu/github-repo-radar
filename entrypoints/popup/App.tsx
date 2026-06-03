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
import { useI18n, type Lang } from "../../utils/i18n";
import { GITHUB_REPO_URL } from "../../utils/config";
import {
  trackPopupOpened,
  trackSearchStarted,
  trackSearchCompleted,
  trackSettingsOpened,
} from "../../utils/analytics";
import SearchBar from "./components/SearchBar";
import ProgressIndicator from "./components/ProgressIndicator";
import ResultList from "./components/ResultList";

type AppState = "idle" | "searching" | "results" | "error";

interface AppProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
}

export default function App({ lang, onLangChange }: AppProps) {
  const t = useI18n();
  const [state, setState] = useState<AppState>("idle");
  const [config, setConfig] = useState<ApiConfig | null>(null);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [results, setResults] = useState<RankedResult[]>([]);
  const [targetName, setTargetName] = useState("");
  const [lastUrl, setLastUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 加载配置 + 恢复上次搜索状态
  useEffect(() => {
    getApiConfig().then((c) => {
      setConfig(c);
      // 埋点：Popup 打开
      trackPopupOpened(!!c.llmApiKey, lang);
    });
    // 获取当前页面的 URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentUrl = tabs[0]?.url || "";

      getSearchState().then((saved) => {
        // 只有当当前页面的 URL 与上次搜索的 URL 匹配时，才恢复搜索结果
        if (saved && saved.results.length > 0 && saved.lastUrl === currentUrl) {
          setResults(saved.results);
          setTargetName(saved.targetName);
          setLastUrl(saved.lastUrl);
          setState("results");
        }
        // 否则显示初始的搜索界面
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 从 storage 变化中实时刷新配置（用户在 options 页保存后）
  useEffect(() => {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "local" && changes.api_config) {
        setConfig(changes.api_config.newValue as ApiConfig);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const handleSearch = useCallback(
    async (url: string) => {
      if (!config) return;

      if (!config.llmApiKey) {
        setError(t.errorNoKeys);
        setState("error");
        return;
      }

      setState("searching");
      setProgress(null);
      setResults([]);
      setError(null);

      // 埋点：搜索开始
      const searchStartTime = Date.now();
      trackSearchStarted({
        llm_platform: config.llmPlatformId,
        has_embedding: !!config.embeddingApiKey,
        has_github_token: !!config.githubToken,
      });

      try {
        const result = await runPipeline(url, config, 10, setProgress, t);
        setResults(result.results);
        setTargetName(result.repo.full_name);
        setLastUrl(url);
        setState(result.results.length > 0 ? "results" : "error");

        // 埋点：搜索完成
        trackSearchCompleted({
          result_count: result.results.length,
          used_embedding: result.usedEmbedding,
          duration_ms: Date.now() - searchStartTime,
        });

        if (result.results.length === 0) {
          setError(t.errorNoResults);
        } else {
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
    [config, t],
  );

  const handleReset = useCallback(async () => {
    setState("idle");
    setProgress(null);
    setResults([]);
    setError(null);
    await clearSearchState();
  }, []);

  const openSettings = () => {
    trackSettingsOpened();
    chrome.runtime.openOptionsPage();
  };

  const hasKeys = !!config?.llmApiKey;

  return (
    <div className="w-[420px] min-h-[300px] max-h-[600px] bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-base font-bold flex items-center gap-1.5">
            🎯 {t.appName}
          </h1>
          <div className="flex items-center gap-2">
            {state !== "idle" && state !== "searching" && (
              <button
                onClick={handleReset}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {t.backToSearch}
              </button>
            )}
            <button
              onClick={() => onLangChange(lang === "en" ? "zh-CN" : "en")}
              className="text-xs px-2 py-0.5 rounded border border-border
                         text-muted-foreground hover:text-foreground hover:border-ring
                         transition-colors"
            >
              {lang === "en" ? "中文" : "EN"}
            </button>
          </div>
        </div>

        <SearchBar
          onSearch={handleSearch}
          disabled={state === "searching"}
          initialUrl={state === "results" ? lastUrl : undefined}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Idle — 未配置 */}
        {state === "idle" && !hasKeys && (
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-muted-foreground">{t.idleNoKey}</p>
            <button
              onClick={openSettings}
              className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground
                         hover:opacity-90 transition-opacity"
            >
              ⚙️ {t.settings}
            </button>
          </div>
        )}

        {/* Idle — 已配置 */}
        {state === "idle" && hasKeys && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">{t.idleReady}</p>
          </div>
        )}

        {/* Searching */}
        {state === "searching" && <ProgressIndicator progress={progress} hasEmbedding={!!config?.embeddingApiKey} />}

        {/* Results */}
        {state === "results" && (
          <ResultList results={results} targetName={targetName} hasEmbedding={!!config?.embeddingApiKey} />
        )}

        {/* Error */}
        {state === "error" && (
          <div className="text-center py-6 space-y-2">
            <p className="text-sm text-red-500">❌ {error}</p>
            {error?.includes("API Key") && (
              <button
                onClick={openSettings}
                className="block mx-auto text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground
                           hover:opacity-90 transition-opacity"
              >
                ⚙️ {t.settings}
              </button>
            )}
            <button
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              {t.retry}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border space-y-1">
        {/* 安全提示 */}
        <p className="text-[10px] text-muted-foreground/60 text-center">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
          >
            {t.openSource}
          </a>
          {" · "}{t.privacyNotice}
        </p>
        <div className="flex items-center justify-between">
          {hasKeys && (
            <button
              onClick={openSettings}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ⚙️ {t.settings}
            </button>
          )}
          <a
            href={`${GITHUB_REPO_URL}/issues`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
          >
            💬 {t.feedback}
          </a>
        </div>
      </div>
    </div>
  );
}
