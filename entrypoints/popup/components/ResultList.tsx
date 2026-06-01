import type { RankedResult } from "../../../utils/core/types";
import ResultItem from "./ResultItem";

interface ResultListProps {
  results: RankedResult[];
  targetName: string;
}

export default function ResultList({ results, targetName }: ResultListProps) {
  if (results.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          🏆 Top {results.length} 相关项目
        </h2>
        <span className="text-xs text-muted-foreground">
          目标: {targetName}
        </span>
      </div>
      <div className="space-y-1.5">
        {results.map((result, i) => (
          <ResultItem key={result.repo.full_name} result={result} rank={i + 1} />
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center pt-1">
        综合得分 = 语义×0.6 + Topic×0.3 + 活跃度×0.1
      </p>
    </div>
  );
}
