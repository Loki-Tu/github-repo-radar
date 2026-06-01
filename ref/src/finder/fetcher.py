"""GitHub API 请求逻辑 - 负责获取仓库数据和批量召回候选项目"""

import asyncio
import os
from dataclasses import dataclass
from typing import Optional

import httpx


@dataclass
class RepoData:
    """仓库基础数据"""
    full_name: str
    description: str
    readme: str
    topics: list[str]
    stargazers_count: int
    html_url: str


@dataclass
class CandidateRepo:
    """候选项目数据"""
    full_name: str
    description: str
    readme: str
    topics: list[str]
    stargazers_count: int
    html_url: str


class GitHubFetcher:
    """GitHub API 客户端"""

    BASE_URL = "https://api.github.com"
    SEARCH_URL = "https://api.github.com/search/repositories"

    def __init__(self, token: Optional[str] = None):
        self.token = (token or os.environ.get("GITHUB_TOKEN", "")).strip()
        # 忽略占位值，避免发送无效 token 导致 401
        if not self.token or self.token.startswith("your_") or self.token.startswith("xxx"):
            self.token = ""
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "github-repo-radar",
        }
        if self.token:
            self.headers["Authorization"] = f"token {self.token}"

    async def _get(self, url: str, params: Optional[dict] = None) -> dict:
        async with httpx.AsyncClient(headers=self.headers, timeout=30.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            return resp.json()

    @staticmethod
    def parse_url(url: str) -> tuple[str, str]:
        """从 GitHub URL 中提取 owner 和 repo 名"""
        # 支持多种格式: https://github.com/owner/repo, owner/repo, 等等
        url = url.strip().rstrip("/")
        # 去掉协议和前缀
        if url.startswith("https://"):
            url = url.replace("https://github.com/", "")
        elif url.startswith("http://"):
            url = url.replace("http://github.com/", "")
        # 去掉 .git 后缀
        if url.endswith(".git"):
            url = url[:-4]
        parts = url.split("/")
        if len(parts) < 2:
            raise ValueError(f"无法从 URL 解析 owner/repo: {url}")
        return parts[-2], parts[-1]

    async def fetch_repo_data(self, url: str) -> RepoData:
        """获取目标仓库的基础数据"""
        owner, repo = self.parse_url(url)
        repo_url = f"{self.BASE_URL}/repos/{owner}/{repo}"

        # 获取仓库基本信息
        repo_info = await self._get(repo_url)

        # 获取 README
        readme = ""
        try:
            readme_data = await self._get(f"{repo_url}/readme", params={"ref": "main"})
            import base64
            readme = base64.b64decode(readme_data.get("content", "")).decode("utf-8")
        except Exception:
            # 尝试其他分支
            try:
                readme_data = await self._get(f"{repo_url}/readme", params={"ref": "master"})
                import base64
                readme = base64.b64decode(readme_data.get("content", "")).decode("utf-8")
            except Exception:
                readme = repo_info.get("description", "")

        return RepoData(
            full_name=repo_info.get("full_name", f"{owner}/{repo}"),
            description=repo_info.get("description") or "",
            readme=readme,
            topics=repo_info.get("topics", []),
            stargazers_count=repo_info.get("stargazers_count", 0),
            html_url=repo_info.get("html_url", url),
        )

    async def search_repos(
        self,
        query: str,
        per_page: int = 30,
        sort: str = "stars",
        exclude_repos: Optional[list[str]] = None,
    ) -> list[CandidateRepo]:
        """通过 GitHub Search API 搜索仓库"""
        params = {
            "q": query,
            "per_page": min(per_page, 100),
            "sort": sort,
            "order": "desc",
        }

        results: list[CandidateRepo] = []
        seen = set(exclude_repos or [])

        async with httpx.AsyncClient(headers=self.headers, timeout=30.0) as client:
            page = 1
            while page <= 10:  # 最多 10 页
                params["page"] = page
                resp = await client.get(self.SEARCH_URL, params=params)
                resp.raise_for_status()
                data = resp.json()

                items = data.get("items", [])
                if not items:
                    break

                for item in items:
                    name = item.get("full_name", "")
                    if name in seen:
                        continue
                    seen.add(name)
                    results.append(CandidateRepo(
                        full_name=name,
                        description=item.get("description") or "",
                        readme="",  # 搜索 API 不返回 README，后续按需获取
                        topics=item.get("topics", []),
                        stargazers_count=item.get("stargazers_count", 0),
                        html_url=item.get("html_url", ""),
                    ))

                if len(results) >= 100:
                    break

                # 检查是否还有更多结果
                total = data.get("total_count", 0)
                if page * per_page >= total:
                    break
                page += 1

        return results

    async def fetch_candidate_readme(self, candidate: CandidateRepo) -> None:
        """补充获取候选项目的 README"""
        if candidate.readme:
            return
        owner, repo = candidate.full_name.split("/", 1)
        try:
            readme_data = await self._get(
                f"{self.BASE_URL}/repos/{owner}/{repo}/readme",
                params={"ref": "main"},
            )
            import base64
            candidate.readme = base64.b64decode(readme_data.get("content", "")).decode("utf-8")
        except Exception:
            try:
                readme_data = await self._get(
                    f"{self.BASE_URL}/repos/{owner}/{repo}/readme",
                    params={"ref": "master"},
                )
                import base64
                candidate.readme = base64.b64decode(readme_data.get("content", "")).decode("utf-8")
            except Exception:
                candidate.readme = candidate.description

    async def fetch_readmes_concurrent(
        self,
        candidates: list[CandidateRepo],
        max_count: int = 30,
        concurrency: int = 5,
        delay: float = 0.2,
    ) -> None:
        """并发获取候选项目 README，用 Semaphore 控制并发数避免触发限流"""
        sem = asyncio.Semaphore(concurrency)

        async def _fetch_one(candidate: CandidateRepo) -> None:
            async with sem:
                try:
                    await self.fetch_candidate_readme(candidate)
                except Exception:
                    pass
                await asyncio.sleep(delay)

        tasks = [_fetch_one(c) for c in candidates[:max_count]]
        await asyncio.gather(*tasks, return_exceptions=True)