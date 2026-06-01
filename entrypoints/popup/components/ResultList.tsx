import type { RankedResult } from "../../../utils/core/types";
import { useI18n } from "../../../utils/i18n";
import ResultItem from "./ResultItem";

interface ResultListProps {
  results: RankedResult[];
  targetName: string;
}

export default function ResultList({ results, targetName }: ResultListProps) {
  const t = useI18n();
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
      <div className="space-y-1.5">
        {results.map((result, i) => (
          <ResultItem key={result.repo.full_name} result={result} rank={i + 1} />
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center pt-1">
        {t.scoreFormula}
      </p>
    </div>
  );
}
