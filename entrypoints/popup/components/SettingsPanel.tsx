import { useState, useEffect } from "react";
import type { ApiConfig } from "../../../utils/core/types";
import { getApiConfig, setApiConfig } from "../../../utils/lib/storage";
import { DEFAULT_CONFIG } from "../../../utils/config";

interface SettingsPanelProps {
  onConfigSaved: (config: ApiConfig) => void;
}

export default function SettingsPanel({ onConfigSaved }: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ApiConfig | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getApiConfig().then(setConfig);
  }, []);

  const handleSave = async () => {
    if (!config) return;
    await setApiConfig(config);
    onConfigSaved(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!config) return null;

  const hasRequiredKeys = config.llmApiKey && config.embeddingApiKey;

  return (
    <div className="border-t border-border pt-3 mt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <span className={`transition-transform ${isOpen ? "rotate-90" : ""}`}>
          ▶
        </span>
        <span>⚙️ API 设置</span>
        {!hasRequiredKeys && (
          <span className="ml-auto text-xs text-red-500">需要配置 API Key</span>
        )}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">
          {/* GitHub Token */}
          <FieldGroup label="GitHub Token（推荐）">
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

          {/* LLM API */}
          <FieldGroup label="LLM API Key *">
            <input
              type="password"
              value={config.llmApiKey}
              onChange={(e) =>
                setConfig({ ...config, llmApiKey: e.target.value })
              }
              placeholder="sk-xxx..."
              className="setting-input"
            />
          </FieldGroup>

          <FieldGroup label="LLM API Base">
            <input
              type="text"
              value={config.llmApiBase}
              onChange={(e) =>
                setConfig({ ...config, llmApiBase: e.target.value })
              }
              placeholder={DEFAULT_CONFIG.llmApiBase}
              className="setting-input"
            />
          </FieldGroup>

          <FieldGroup label="LLM Model">
            <input
              type="text"
              value={config.llmModel}
              onChange={(e) =>
                setConfig({ ...config, llmModel: e.target.value })
              }
              placeholder={DEFAULT_CONFIG.llmModel}
              className="setting-input"
            />
          </FieldGroup>

          {/* Embedding API */}
          <FieldGroup label="Embedding API Key *">
            <input
              type="password"
              value={config.embeddingApiKey}
              onChange={(e) =>
                setConfig({ ...config, embeddingApiKey: e.target.value })
              }
              placeholder="sk-xxx..."
              className="setting-input"
            />
          </FieldGroup>

          <FieldGroup label="Embedding API Base">
            <input
              type="text"
              value={config.embeddingApiBase}
              onChange={(e) =>
                setConfig({ ...config, embeddingApiBase: e.target.value })
              }
              placeholder={DEFAULT_CONFIG.embeddingApiBase}
              className="setting-input"
            />
          </FieldGroup>

          <FieldGroup label="Embedding Model">
            <input
              type="text"
              value={config.embeddingModel}
              onChange={(e) =>
                setConfig({ ...config, embeddingModel: e.target.value })
              }
              placeholder={DEFAULT_CONFIG.embeddingModel}
              className="setting-input"
            />
          </FieldGroup>

          <button
            onClick={handleSave}
            className="w-full py-2 text-sm font-medium rounded-md
                       bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {saved ? "✓ 已保存" : "保存设置"}
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
      `}</style>
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
