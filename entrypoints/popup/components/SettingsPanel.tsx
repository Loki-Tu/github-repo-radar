import { useState, useEffect } from "react";
import type { ApiConfig } from "../../../utils/core/types";
import { getApiConfig, setApiConfig } from "../../../utils/lib/storage";
import { useI18n } from "../../../utils/i18n";
import {
  LLM_PLATFORMS,
  EMBEDDING_PLATFORMS,
  findPlatform,
  type PlatformPreset,
} from "../../../utils/platforms";

interface SettingsPanelProps {
  onConfigSaved: (config: ApiConfig) => void;
}

export default function SettingsPanel({ onConfigSaved }: SettingsPanelProps) {
  const t = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ApiConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getApiConfig().then(setConfig);
  }, []);

  /** 根据平台 ID 和 apiBase 获取需要授权的 URL */
  const getApiUrl = (platformId: string, apiBase: string): string => {
    switch (platformId) {
      case "openai": return "https://api.openai.com";
      case "anthropic": return "https://api.anthropic.com";
      case "google": return "https://generativelanguage.googleapis.com";
      case "xai": return "https://api.x.ai";
      case "deepseek": return "https://api.deepseek.com";
      case "openrouter": return "https://openrouter.ai";
      case "azure": return apiBase || "https://*.openai.azure.com";
      case "bedrock": return "https://*.amazonaws.com";
      case "ollama": return "http://localhost:11434";
      case "openai-compatible": return apiBase;
      default: return apiBase;
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setError(null);

    // 收集需要授权的 URL（去重）
    const urlsToRequest = new Set<string>();
    if (config.llmApiKey) {
      urlsToRequest.add(getApiUrl(config.llmPlatformId, config.llmApiBase));
    }
    if (config.embeddingApiKey) {
      urlsToRequest.add(getApiUrl(config.embeddingPlatformId, config.embeddingApiBase));
    }
    if (config.githubToken) {
      urlsToRequest.add("https://api.github.com");
    }

    // 一次性请求所有权限
    if (urlsToRequest.size > 0) {
      const origins = Array.from(urlsToRequest)
        .filter(Boolean)
        .map(url => new URL(url).origin + "/*");

      console.log("[Save] Requesting permissions for:", origins);
      const granted = await chrome.permissions.request({ permissions: [], origins });
      console.log("[Save] Permission result:", granted);

      if (!granted) {
        setError("Permission denied");
        return;
      }
    }

    await setApiConfig(config);
    onConfigSaved(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  /** 选择 LLM 平台后自动填充 base URL 和默认模型 */
  const handleLlmPlatformChange = (platformId: string) => {
    const preset = findPlatform(LLM_PLATFORMS, platformId);
    if (!config || !preset) return;
    setConfig({
      ...config,
      llmPlatformId: platformId,
      llmApiBase: preset.requiresBaseUrl ? "" : preset.defaultBase,
      llmModel: preset.requiresBaseUrl ? "" : preset.defaultModel,
    });
  };

  /** 选择 Embedding 平台后自动填充 */
  const handleEmbeddingPlatformChange = (platformId: string) => {
    const preset = findPlatform(EMBEDDING_PLATFORMS, platformId);
    if (!config || !preset) return;
    setConfig({
      ...config,
      embeddingPlatformId: platformId,
      embeddingApiBase: preset.requiresBaseUrl ? "" : preset.defaultBase,
      embeddingModel: preset.requiresBaseUrl ? "" : preset.defaultModel,
    });
  };

  if (!config) return null;

  const hasRequiredKeys = config.llmApiKey && config.embeddingApiKey;
  const llmPreset = findPlatform(LLM_PLATFORMS, config.llmPlatformId);
  const embPreset = findPlatform(EMBEDDING_PLATFORMS, config.embeddingPlatformId);

  return (
    <div className="border-t border-border pt-3 mt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <span className={`transition-transform ${isOpen ? "rotate-90" : ""}`}>
          ▶
        </span>
        <span>⚙️ {t.settings}</span>
        {!hasRequiredKeys && (
          <span className="ml-auto text-xs text-red-500">{t.needsConfig}</span>
        )}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-4">
          {/* ── GitHub Token ── */}
          <FieldGroup label={t.githubToken} hint={t.githubTokenHint}>
            <input
              type="password"
              value={config.githubToken}
              onChange={(e) =>
                setConfig({ ...config, githubToken: e.target.value })
              }
              placeholder="ghp_xxx..."
              className="setting-input"
            />
          </FieldGroup>

          {/* ── LLM 平台 ── */}
          <SectionDivider label={t.llmPlatform} />
          <PlatformSelector
            platforms={LLM_PLATFORMS}
            selectedId={config.llmPlatformId}
            onChange={handleLlmPlatformChange}
          />
          <PlatformFields
            preset={llmPreset}
            apiKey={config.llmApiKey}
            apiBase={config.llmApiBase}
            model={config.llmModel}
            onApiKeyChange={(v) => setConfig({ ...config, llmApiKey: v })}
            onApiBaseChange={(v) => setConfig({ ...config, llmApiBase: v })}
            onModelChange={(v) => setConfig({ ...config, llmModel: v })}
          />

          {/* ── Embedding 平台 ── */}
          <SectionDivider label={t.embeddingPlatform} />
          <PlatformSelector
            platforms={EMBEDDING_PLATFORMS}
            selectedId={config.embeddingPlatformId}
            onChange={handleEmbeddingPlatformChange}
          />
          <PlatformFields
            preset={embPreset}
            apiKey={config.embeddingApiKey}
            apiBase={config.embeddingApiBase}
            model={config.embeddingModel}
            onApiKeyChange={(v) => setConfig({ ...config, embeddingApiKey: v })}
            onApiBaseChange={(v) =>
              setConfig({ ...config, embeddingApiBase: v })
            }
            onModelChange={(v) => setConfig({ ...config, embeddingModel: v })}
          />

          {/* ── 错误提示 ── */}
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          {/* ── 保存按钮 ── */}
          <button
            onClick={handleSave}
            className="w-full py-2 text-sm font-medium rounded-md
                       bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {saved ? t.saved : t.save}
          </button>
        </div>
      )}

      <style>{`
        .setting-input {
          width: 100%;
          padding: 0.375rem 0.5rem;
          font-size: 0.75rem;
          border-radius: 0.375rem;
          border: 1px solid hsl(var(--input));
          background: hsl(var(--background));
          color: hsl(var(--foreground));
        }
        .setting-input:focus {
          outline: none;
          box-shadow: 0 0 0 2px hsl(var(--ring));
        }
        .setting-select {
          width: 100%;
          padding: 0.375rem 0.5rem;
          font-size: 0.75rem;
          border-radius: 0.375rem;
          border: 1px solid hsl(var(--input));
          background: hsl(var(--background));
          color: hsl(var(--foreground));
          cursor: pointer;
        }
        .setting-select:focus {
          outline: none;
          box-shadow: 0 0 0 2px hsl(var(--ring));
        }
      `}</style>
    </div>
  );
}

// ─── 子组件 ──────────────────────────────────────────────────────────────────

/** 平台选择器（下拉） */
function PlatformSelector({
  platforms,
  selectedId,
  onChange,
}: {
  platforms: PlatformPreset[];
  selectedId: string;
  onChange: (id: string) => void;
}) {
  const t = useI18n();
  return (
    <select
      className="setting-select"
      value={selectedId}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>
        {t.selectPlatform}
      </option>
      {platforms.map((p) => (
        <option key={p.id} value={p.id}>
          {p.icon} {t[p.nameKey as keyof typeof t]}
        </option>
      ))}
    </select>
  );
}

/** 根据平台预设动态渲染配置字段 */
function PlatformFields({
  preset,
  apiKey,
  apiBase,
  model,
  onApiKeyChange,
  onApiBaseChange,
  onModelChange,
}: {
  preset: PlatformPreset | undefined;
  apiKey: string;
  apiBase: string;
  model: string;
  onApiKeyChange: (v: string) => void;
  onApiBaseChange: (v: string) => void;
  onModelChange: (v: string) => void;
}) {
  const t = useI18n();
  if (!preset) return null;

  return (
    <div className="space-y-2 pl-3 border-l-2 border-border">
      {/* API Key — 所有平台都需要 */}
      <FieldGroup label={t.apiKey}>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="sk-xxx..."
          className="setting-input"
        />
      </FieldGroup>

      {/* Base URL — 仅 Compatible 平台显示 */}
      {preset.requiresBaseUrl && (
        <FieldGroup label={t.apiBase}>
          <input
            type="text"
            value={apiBase}
            onChange={(e) => onApiBaseChange(e.target.value)}
            placeholder="https://api.example.com/v1"
            className="setting-input"
          />
        </FieldGroup>
      )}

      {/* Model — 有预设列表则下拉，否则文本输入 */}
      <FieldGroup label={t.model}>
        {preset.models.length > 0 ? (
          <select
            className="setting-select"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
          >
            {preset.models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            placeholder="model-name"
            className="setting-input"
          />
        )}
      </FieldGroup>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-foreground">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      {hint && (
        <p className="text-[10px] text-muted-foreground/70 mb-1">{hint}</p>
      )}
      {children}
    </div>
  );
}
