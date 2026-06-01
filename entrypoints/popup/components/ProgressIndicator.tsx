import type { ProgressInfo } from "../../../utils/core/types";

const STAGE_LABELS: Record<string, string> = {
  fetching: "📥 获取仓库数据",
  extracting: "🤖 LLM 特征提取",
  recalling: "🔍 并行多路召回",
  filtering: "⚡ 快速过滤",
  "fetching-readmes": "📄 获取 README",
  embedding: "🧮 生成 Embedding",
  ranking: "📊 精准排序",
};

const STAGE_ORDER = [
  "fetching",
  "extracting",
  "recalling",
  "filtering",
  "fetching-readmes",
  "embedding",
  "ranking",
];

interface ProgressIndicatorProps {
  progress: ProgressInfo | null;
}

export default function ProgressIndicator({ progress }: ProgressIndicatorProps) {
  if (!progress) return null;

  const currentIndex = STAGE_ORDER.indexOf(progress.stage);

  return (
    <div className="space-y-3 py-3">
      {/* 进度条 */}
      <div className="flex gap-1">
        {STAGE_ORDER.map((stage, i) => (
          <div
            key={stage}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i < currentIndex
                ? "bg-green-500"
                : i === currentIndex
                  ? "bg-blue-500 animate-pulse"
                  : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* 当前阶段文字 */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <span className="text-sm text-muted-foreground">
          {progress.message}
        </span>
      </div>

      {/* 阶段标签列表 */}
      <div className="flex flex-wrap gap-1">
        {STAGE_ORDER.map((stage, i) => (
          <span
            key={stage}
            className={`text-xs px-2 py-0.5 rounded-full ${
              i < currentIndex
                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                : i === currentIndex
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {STAGE_LABELS[stage]}
          </span>
        ))}
      </div>
    </div>
  );
}
