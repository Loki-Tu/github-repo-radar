#!/usr/bin/env python3
"""命令行入口文件 - GitHub Repo Radar v2 主流程"""

import argparse
import asyncio
import sys

import numpy as np
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn

from finder.fetcher import GitHubFetcher
from finder.extractor import extract_features_async, ProjectFeatures
from finder.ranker import Ranker, _build_text_for_embedding

console = Console()


def print_features(features: ProjectFeatures) -> None:
    """在控制台打印提取的项目特征"""
    table = Table(title="📊 目标项目特征分析", show_header=True, header_style="bold magenta")
    table.add_column("字段", style="cyan", no_wrap=True)
    table.add_column("内容")

    table.add_row("核心问题", features.core_problem)
    table.add_row("系统类型", features.system_type)
    table.add_row("关键特性", ", ".join(features.key_features))
    table.add_row("提及竞品", ", ".join(features.competitors) if features.competitors else "无")
    table.add_row("搜索关键词", features.search_query)

    console.print()
    console.print(table)


def print_results(results, target_name: str) -> None:
    """在控制台打印 Top N 相关项目列表"""
    console.print()
    table = Table(
        title=f"🏆 Top {len(results)} 相关/替代项目 (目标: {target_name})",
        show_header=True,
        header_style="bold green",
    )
    table.add_column("#", style="bold white", no_wrap=True, width=3)
    table.add_column("项目", style="cyan", no_wrap=True)
    table.add_column("Stars", style="yellow", no_wrap=True, width=8)
    table.add_column("综合得分", style="green", no_wrap=True, width=8)
    table.add_column("语义相似度", style="magenta", no_wrap=True, width=10)
    table.add_column("Topic重叠", style="blue", no_wrap=True, width=10)
    table.add_column("描述", style="white")

    for i, r in enumerate(results, 1):
        desc = r.repo.description or "无描述"
        if len(desc) > 60:
            desc = desc[:57] + "..."
        table.add_row(
            str(i),
            f"[link={r.repo.html_url}]{r.repo.full_name}[/link]",
            str(r.repo.stargazers_count),
            f"{r.score:.4f}",
            f"{r.cosine_similarity:.4f}",
            f"{r.topic_overlap:.4f}",
            desc,
        )

    console.print(table)
    console.print()
    console.print("[dim]💡 综合得分 = 语义×0.6 + Topic×0.3 + 活跃度×0.1[/dim]")


async def _parallel_recall(
    fetcher: GitHubFetcher,
    features: ProjectFeatures,
    repo_full_name: str,
) -> list:
    """并行执行多路召回策略"""
    exclude = [repo_full_name]
    repo_short_name = repo_full_name.split("/")[-1]

    # 构建所有搜索任务
    async def _search(query: str, per_page: int = 30, label: str = "") -> list:
        try:
            return await fetcher.search_repos(
                query=query,
                per_page=per_page,
                exclude_repos=exclude,
            )
        except Exception as e:
            console.print(f"  [dim]{label} 失败: {e}[/dim]")
            return []

    # 策略 A: LLM 生成的搜索 query（最精准）
    tasks = [_search(features.search_query, per_page=30, label="策略A")]

    # 策略 B: "{repo_name} alternative"
    tasks.append(_search(f"{repo_short_name} alternative", per_page=20, label="策略B"))

    # 策略 C: 竞品名搜索
    if features.competitors:
        for comp in features.competitors[:2]:
            tasks.append(_search(comp, per_page=15, label=f"策略C({comp})"))

    # 并行执行所有搜索
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task(f"🔍 并行搜索中 ({len(tasks)} 路)...", total=None)
        results = await asyncio.gather(*tasks, return_exceptions=True)
        progress.update(task, description="✅ 搜索完成")

    # 合并去重
    all_candidates = []
    seen = set()
    for result_list in results:
        if isinstance(result_list, Exception):
            continue
        for c in result_list:
            if c.full_name not in seen and c.full_name != repo_full_name:
                seen.add(c.full_name)
                all_candidates.append(c)

    return all_candidates


def _build_candidate_text(candidate) -> str:
    """为候选项目构建 embedding 文本"""
    parts = []
    if candidate.description:
        parts.append(f"Description: {candidate.description}")
    if candidate.topics:
        parts.append(f"Topics: {', '.join(candidate.topics)}")
    if candidate.readme:
        parts.append(f"README: {candidate.readme[:3000]}")
    return "\n".join(parts) if parts else ""


async def run(repo_url: str, top_k: int = 10) -> None:
    """执行主流程: 获取数据 -> 提取特征 -> 并行召回 -> 两阶段排序"""
    fetcher = GitHubFetcher()
    ranker = Ranker()

    # Step 1: 获取目标仓库数据
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("📥 正在获取仓库数据...", total=None)
        try:
            repo_data = await fetcher.fetch_repo_data(repo_url)
        except Exception as e:
            console.print(f"\n[red]❌ 获取仓库数据失败: {e}[/red]")
            sys.exit(1)
        progress.update(task, description=f"✅ 已获取 {repo_data.full_name} 的数据")

    console.print()
    console.print(Panel(
        f"[bold cyan]{repo_data.full_name}[/bold cyan]\n"
        f"[dim]{repo_data.html_url}[/dim]\n"
        f"Stars: [yellow]{repo_data.stargazers_count}[/yellow]  "
        f"Topics: [magenta]{', '.join(repo_data.topics) if repo_data.topics else '无'}[/magenta]",
        title="🎯 目标项目",
        border_style="cyan",
    ))

    # Step 2: LLM 特征提取（包含 search_query）
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("🤖 正在通过 LLM 提取项目特征...", total=None)
        try:
            features = await extract_features_async(
                repo_data.full_name,
                repo_data.description,
                repo_data.readme,
                repo_data.topics,
            )
        except Exception as e:
            console.print(f"\n[red]❌ LLM 特征提取失败: {e}[/red]")
            sys.exit(1)
        progress.update(task, description="✅ 特征提取完成")

    print_features(features)

    # Step 3: 并行多路召回
    console.print()
    unique_candidates = await _parallel_recall(fetcher, features, repo_data.full_name)

    console.print(f"[bold]共召回 [green]{len(unique_candidates)}[/green] 个候选项目[/bold]")

    if not unique_candidates:
        console.print("[yellow]⚠️ 未召回任何候选项目，请检查网络或 GitHub Token[/yellow]")
        sys.exit(0)

    # Step 4: 两阶段排序
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        # 4a: 快速过滤 — 选出 top 30
        task = progress.add_task("⚡ 快速过滤候选...", total=None)
        fast_candidates = ranker.rank_fast(
            unique_candidates,
            target_topics=repo_data.topics,
            target_description=repo_data.description or "",
            top_k=30,
        )
        progress.update(task, description=f"✅ 快速过滤完成，保留 {len(fast_candidates)} 个")

        # 4b: 并发获取 top 候选的 README
        task = progress.add_task(
            f"📄 并发获取 README... (0/{len(fast_candidates)})",
            total=len(fast_candidates),
        )
        await fetcher.fetch_readmes_concurrent(fast_candidates, max_count=len(fast_candidates))
        progress.update(task, description=f"✅ README 获取完成 ({len(fast_candidates)} 个)")

        # 4c: 生成目标项目 embedding
        task = progress.add_task("🧮 生成 Embedding...", total=None)
        target_text = _build_text_for_embedding(repo_data)
        try:
            target_embedding = await ranker.get_embedding_async(target_text)
        except Exception as e:
            console.print(f"\n[red]❌ 生成目标 Embedding 失败: {e}[/red]")
            sys.exit(1)

        # 4d: 批量生成候选项目 embedding
        candidate_embeddings = []
        for idx, candidate in enumerate(fast_candidates):
            cand_text = _build_candidate_text(candidate)
            try:
                emb = await ranker.get_embedding_async(cand_text)
                candidate_embeddings.append(emb)
            except Exception:
                candidate_embeddings.append(np.zeros_like(target_embedding))
            # 限流：每 5 个请求后暂停
            if (idx + 1) % 5 == 0:
                await asyncio.sleep(0.3)
        progress.update(task, description="✅ Embedding 生成完成")

    # Step 5: 精准排序
    results = ranker.rank(
        target_embedding=target_embedding,
        candidates=fast_candidates,
        target_topics=repo_data.topics,
        candidate_embeddings=candidate_embeddings,
        top_k=top_k,
    )

    # 输出结果
    print_results(results, repo_data.full_name)


def main():
    parser = argparse.ArgumentParser(
        description="GitHub Repo Radar - 基于 LLM 和向量检索的相关项目挖掘引擎",
    )
    parser.add_argument(
        "repo_url",
        help="GitHub 仓库 URL，例如: https://github.com/fastapi/fastapi 或 fastapi/fastapi",
    )
    parser.add_argument(
        "-k", "--top-k",
        type=int,
        default=10,
        help="输出 Top N 个相关项目 (默认: 10)",
    )

    args = parser.parse_args()
    asyncio.run(run(args.repo_url, args.top_k))


if __name__ == "__main__":
    main()
