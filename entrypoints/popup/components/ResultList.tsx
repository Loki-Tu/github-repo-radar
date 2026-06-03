import { useState, useMemo } from "react";
import type { RankedResult } from "../../../utils/core/types";
import { useI18n } from "../../../utils/i18n";
import ResultItem from "./ResultItem";

type SortKey = "score" | "similarity" | "stars" | "topics";

interface ResultListProps {
  results: RankedResult[];
  targetName: string;
  hasEmbedding: boolean;
}

export default function ResultList({ results, targetName, hasEmbedding }: ResultListProps) {
  const t = useI18n();
  const [sortKey, setSortKey] = useState<SortKey>("score");

  const sortedResults = useMemo(() => {
    const sorted = [...results];
    switch (sortKey) {
      case "score":
        sorted.sort((a, b) => b.score - a.score);
        break;
      case "similarity":
        sorted.sort((a, b) => b.cosine_similarity - a.cosine_similarity);
        break;
      case "stars":
        sorted.sort((a, b) => b.repo.stargazers_count - a.repo.stargazers_count);
        break;
      case "topics":
        sorted.sort((a, b) => b.topic_overlap - a.topic_overlap);
        break;
    }
    return sorted;
  }, [results, sortKey]);

  if (results.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {t.topResults.replace("{count}", String(results.length))}
        </h2>
        <span className="text-xs text-muted-foreground">
          {t.target} {targetName}
        </span>
      </div>

      {/* 排序选择器 */}
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">{t.sortBy}:</span>
        <SortButton active={sortKey === "score"} onClick={() => setSortKey("score")}>
          {t.sortScore}
        </SortButton>
        {hasEmbedding && (
          <SortButton active={sortKey === "similarity"} onClick={() => setSortKey("similarity")}>
            {t.sortSimilarity}
          </SortButton>
        )}
        <SortButton active={sortKey === "stars"} onClick={() => setSortKey("stars")}>
          {t.sortStars}
        </SortButton>
        <SortButton active={sortKey === "topics"} onClick={() => setSortKey("topics")}>
          {t.sortTopics}
        </SortButton>
      </div>

      <div className="space-y-1.5">
        {sortedResults.map((result, i) => (
          <ResultItem key={result.repo.full_name} result={result} rank={i + 1} hasEmbedding={hasEmbedding} />
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center pt-1">
        {hasEmbedding ? t.scoreFormula : t.scoreFormulaNoEmbedding}
      </p>
    </div>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {children}
    </button>
  );
}
