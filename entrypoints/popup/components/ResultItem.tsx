import type { RankedResult } from "../../../utils/core/types";
import { useI18n } from "../../../utils/i18n";
import { trackResultClicked } from "../../../utils/analytics";

interface ResultItemProps {
  result: RankedResult;
  rank: number;
}

export default function ResultItem({ result, rank }: ResultItemProps) {
  const t = useI18n();
  const { repo, score, cosine_similarity, topic_overlap } = result;
  const desc = repo.description || t.noDescription;
  const truncatedDesc = desc.length > 80 ? desc.slice(0, 77) + "..." : desc;

  const formatStars = (n: number): string => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  const handleClick = () => {
    trackResultClicked({ rank, score });
  };

  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="block p-3 rounded-lg border border-border hover:border-ring
                 hover:bg-accent/50 transition-all group"
    >
      <div className="flex items-start gap-2">
        {/* 排名 */}
        <span className="text-xs font-bold text-muted-foreground w-5 text-right shrink-0 pt-0.5">
          {rank}
        </span>

        <div className="flex-1 min-w-0">
          {/* 仓库名 + Stars */}
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold truncate group-hover:text-blue-500 transition-colors">
              {repo.full_name}
            </h3>
            <span className="text-xs text-yellow-600 dark:text-yellow-400 shrink-0">
              ★ {formatStars(repo.stargazers_count)}
            </span>
          </div>

          {/* 描述 */}
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {truncatedDesc}
          </p>

          {/* 分数标签 */}
          <div className="flex gap-2 mt-1.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {t.score} {score.toFixed(2)}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
              {t.semantic} {cosine_similarity.toFixed(2)}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              {t.topic} {topic_overlap.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
