import { useState, useEffect } from "react";
import type { ApiConfig } from "../../utils/core/types";
import { getApiConfig, setApiConfig } from "../../utils/lib/storage";
import { useI18n, type Lang } from "../../utils/i18n";
import {
  LLM_PLATFORMS,
  EMBEDDING_PLATFORMS,
  findPlatform,
  type PlatformPreset,
} from "../../utils/platforms";

interface AppProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
}

export default function App({ lang, onLangChange }: AppProps) {
  const t = useI18n();
  const [config, setConfig] = useState<ApiConfig | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getApiConfig().then(setConfig);
  }, []);

  const handleSave = async () => {
    if (!config) return;
    await setApiConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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

  const llmPreset = findPlatform(LLM_PLATFORMS, config.llmPlatformId);
  const embPreset = findPlatform(EMBEDDING_PLATFORMS, config.embeddingPlatformId);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              🎯 {t.appName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t.settings}</p>
          </div>
          <button
            onClick={() => onLangChange(lang === "en" ? "zh-CN" : "en")}
            className="text-sm px-3 py-1.5 rounded-md border border-border
                       text-muted-foreground hover:text-foreground hover:border-ring
                       transition-colors"
          >
            {lang === "en" ? "中文" : "EN"}
          </button>
        </div>

        {/* ── GitHub Token ── */}
        <Section title="GitHub" icon="🔑">
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
        </Section>

        {/* ── LLM 平台 ── */}
        <Section title={t.llmPlatform} icon="🤖">
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
        </Section>

        {/* ── Embedding 平台 ── */}
        <Section title={t.embeddingPlatform} icon="🧮">
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
        </Section>

        {/* ── 保存按钮 ── */}
        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 text-sm font-medium rounded-md
                       bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {saved ? t.saved : t.save}
          </button>
          {saved && (
            <span className="text-sm text-green-600 dark:text-green-400">
              {t.saved}
            </span>
          )}
        </div>
      </div>

      <style>{`
        .setting-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
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
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
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

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      <div className="space-y-4 pl-1">{children}</div>
    </div>
  );
}

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
          {p.icon} {t[p.nameKey] ?? p.nameKey}
        </option>
      ))}
    </select>
  );
}

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
    <div className="mt-4 space-y-3 p-4 rounded-lg border border-border bg-card">
      {/* API Key */}
      <FieldGroup label={t.apiKey}>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="sk-xxx..."
          className="setting-input"
        />
      </FieldGroup>

      {/* Base URL — 仅 Compatible 平台 */}
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

      {/* Model */}
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
      <label className="text-sm text-muted-foreground block mb-1.5">
        {label}
      </label>
      {hint && (
        <p className="text-xs text-muted-foreground/70 mb-1.5">{hint}</p>
      )}
      {children}
    </div>
  );
}
