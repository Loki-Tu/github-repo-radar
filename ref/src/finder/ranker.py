"""向量计算与打分过滤逻辑"""

import os
from dataclasses import dataclass

import numpy as np
from litellm import embedding, aembedding

from .fetcher import CandidateRepo, RepoData


@dataclass
class RankedResult:
    """排序后的结果"""
    repo: CandidateRepo
    score: float
    cosine_similarity: float
    topic_overlap: float
    activity_weight: float
    type_penalty: float


def _get_embedding_model() -> str:
    """获取 embedding 模型名称"""
    return os.environ.get("EMBEDDING_MODEL", "text-embedding-ada-002")


def _get_embedding_config() -> dict:
    """获取 embedding 配置，支持独立的 embedding API"""
    model = _get_embedding_model()
    # 优先使用 SILICONFLOW_API_KEY，其次其他 key
    api_key = (
        os.environ.get("SILICONFLOW_API_KEY")
        or os.environ.get("EMBEDDING_API_KEY")
        or os.environ.get("OPENAI_API_KEY")
        or os.environ.get("MIMO_API_KEY")
        or os.environ.get("LLM_API_KEY")
    )
    # 优先使用 EMBEDDING_API_BASE
    api_base = os.environ.get("EMBEDDING_API_BASE", "https://api.siliconflow.cn/v1")

    config = {
        "model": model,
        "api_base": api_base,
        "custom_llm_provider": "openai",
    }
    if api_key:
        config["api_key"] = api_key
    return config


def _build_text_for_embedding(repo: RepoData | CandidateRepo) -> str:
    """构建用于生成 embedding 的文本"""
    parts = []
    if repo.description:
        parts.append(f"Description: {repo.description}")
    if repo.topics:
        parts.append(f"Topics: {', '.join(repo.topics)}")
    if repo.readme:
        # 只取 README 前 3000 字符以避免 token 超限
        parts.append(f"README: {repo.readme[:3000]}")
    return "\n".join(parts)




def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """计算两个向量的余弦相似度"""
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def compute_topic_overlap(topics_a: list[str], topics_b: list[str]) -> float:
    """计算两个项目之间的 Topic 重叠度（交集/较小集合大小）

    使用 overlap coefficient 而非 Jaccard，避免大小差异大的集合被过度惩罚。
    例如 FastAPI(23 topics) vs Flask(3 topics)，Jaccard=0.038 但 overlap=1.0。
    """
    set_a = set(t.lower() for t in topics_a)
    set_b = set(t.lower() for t in topics_b)
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a & set_b)
    min_size = min(len(set_a), len(set_b))
    if min_size == 0:
        return 0.0
    return intersection / min_size


def compute_activity_weight(stars: int, max_stars: int) -> float:
    """基于 Star 数计算活跃度权重 (归一化到 0-1)"""
    if max_stars == 0:
        return 0.0
    # 使用对数缩放，避免超大 star 项目完全主导
    import math
    if stars == 0:
        return 0.0
    return min(math.log1p(stars) / math.log1p(max_stars), 1.0)


class Ranker:
    """语义排序与过滤"""

    # 与目标 system_type 不匹配的类型列表
    PENALIZED_TYPES = {
        "curated list", "awesome list", "documentation", "tutorial",
        "blog", "wiki", "guide", "resource list", "reading list",
        "cheatsheet", "showcase", "collection",
    }

    def __init__(self):
        self.embedding_config = _get_embedding_config()

    # 中文 system_type → 标准化英文 key
    _CN_TO_EN_TYPE = {
        "web 框架": "web framework",
        "web框架": "web framework",
        "web 服务器": "web server",
        "web服务器": "web server",
        "数据库": "database",
        "消息队列": "message queue",
        "命令行工具": "cli tool",
        "cli 工具": "cli tool",
        "cli工具": "cli tool",
        "监控": "monitoring",
        "容器": "container",
        "测试框架": "testing",
        "搜索引擎": "search engine",
        "api 网关": "api gateway",
        "api网关": "api gateway",
        "微服务框架": "microservice framework",
        "机器学习": "machine learning",
        "深度学习": "deep learning",
        "前端框架": "frontend framework",
        "静态站点生成器": "static site generator",
        "爬虫": "web scraper",
        "游戏引擎": "game engine",
        "编辑器": "editor",
        "图表库": "chart",
        "可视化": "visualization",
        "日志": "logging",
        "缓存": "cache",
    }

    @staticmethod
    def _normalize_type(raw: str) -> str:
        """标准化类型名：中文→英文 key，统一小写去空格"""
        lower = raw.strip().lower()
        return Ranker._CN_TO_EN_TYPE.get(lower, lower)

    def _compute_type_penalty(self, candidate_type: str, target_type: str) -> float:
        """计算系统类型惩罚系数"""
        cand_norm = self._normalize_type(candidate_type)
        target_norm = self._normalize_type(target_type)

        # 分类失败（空字符串）→ 不惩罚
        if not cand_norm:
            return 1.0

        # 完全匹配 → 无惩罚
        if cand_norm == target_norm:
            return 1.0

        # 同义词映射
        type_aliases = {
            "web framework": {"web framework", "web framework/library", "framework", "microservice framework", "http framework", "async framework"},
            "framework": {"framework", "web framework", "microservice framework", "http framework"},
            "database": {"database", "db", "data store", "data storage", "storage engine", "datastore"},
            "monitoring": {"monitoring", "observability", "metrics", "apm", "application performance monitoring"},
            "cli tool": {"cli tool", "command-line tool", "command line tool", "terminal tool"},
            "orm": {"orm", "object-relational mapper", "object relational mapper", "database toolkit"},
            "api gateway": {"api gateway", "gateway", "reverse proxy", "load balancer"},
            "ci/cd tool": {"ci/cd tool", "ci/cd", "cicd", "continuous integration", "continuous delivery", "build tool"},
            "container": {"container", "container runtime", "containerization", "orchestration"},
            "testing": {"testing", "test framework", "testing framework", "test runner"},
            "message queue": {"message queue", "message broker", "event streaming", "streaming platform"},
            "search engine": {"search engine", "search", "full-text search", "full text search"},
            "auth": {"auth", "authentication", "authorization", "identity", "iam"},
        }
        target_aliases = type_aliases.get(target_norm, {target_norm})
        if cand_norm in target_aliases:
            return 1.0

        # awesome list / 文档类 → 轻度惩罚
        if cand_norm in self.PENALIZED_TYPES:
            return 0.3

        # 其他不匹配 → 轻微惩罚
        return 0.7

    def rank_fast(
        self,
        candidates: list[CandidateRepo],
        target_topics: list[str],
        target_description: str,
        top_k: int = 30,
    ) -> list[CandidateRepo]:
        """第一阶段快速过滤：用 topic + description 关键词 + star 数选出 top_k 候选

        不需要 embedding，速度快，用于从大量候选中筛选出最可能相关的子集。
        """
        if not candidates:
            return []

        # 计算目标描述的关键词集合（用于简单文本匹配）
        target_words = set(target_description.lower().split()) if target_description else set()
        # 去掉常见停用词
        stopwords = {"a", "an", "the", "is", "are", "was", "were", "be", "been",
                      "being", "have", "has", "had", "do", "does", "did", "will",
                      "would", "could", "should", "may", "might", "can", "shall",
                      "of", "in", "to", "for", "with", "on", "at", "from", "by",
                      "and", "or", "not", "but", "if", "this", "that", "it", "as",
                      "its", "their", "they", "them", "we", "our", "you", "your",
                      "he", "she", "him", "her", "his", "hers", "my", "me", "i"}
        target_words -= stopwords

        max_stars = max(c.stargazers_count for c in candidates) or 1

        scored: list[tuple[float, CandidateRepo]] = []
        for c in candidates:
            # Topic 重叠分
            topic_score = compute_topic_overlap(target_topics, c.topics)

            # 描述关键词匹配分
            if c.description and target_words:
                cand_words = set(c.description.lower().split()) - stopwords
                desc_score = len(target_words & cand_words) / max(len(target_words), 1)
            else:
                desc_score = 0.0

            # Star 活跃度分（对数归一化）
            import math
            star_score = math.log1p(c.stargazers_count) / math.log1p(max_stars) if c.stargazers_count > 0 else 0.0

            total = topic_score * 0.4 + desc_score * 0.4 + star_score * 0.2
            scored.append((total, c))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [c for _, c in scored[:top_k]]

    def get_embedding_sync(self, text: str) -> np.ndarray:
        """同步获取文本 embedding"""
        response = embedding(**self.embedding_config, input=[text])
        embedding_vec = response.data[0]["embedding"]
        return np.array(embedding_vec, dtype=np.float32)

    async def get_embedding_async(self, text: str) -> np.ndarray:
        """异步获取文本 embedding"""
        response = await aembedding(**self.embedding_config, input=[text])
        embedding_vec = response.data[0]["embedding"]
        return np.array(embedding_vec, dtype=np.float32)

    def rank(
        self,
        target_embedding: np.ndarray,
        candidates: list[CandidateRepo],
        target_topics: list[str],
        candidate_embeddings: list[np.ndarray],
        top_k: int = 10,
    ) -> list[RankedResult]:
        """
        第二阶段精准排序：embedding 相似度 + topic overlap + 活跃度

        Score = Cosine_Similarity × 0.6 + Topic_Overlap × 0.3 + Activity_Weight × 0.1
        """
        if not candidates:
            return []

        max_stars = max(c.stargazers_count for c in candidates) or 1

        results: list[RankedResult] = []
        for i, candidate in enumerate(candidates):
            cos_sim = cosine_similarity(target_embedding, candidate_embeddings[i])
            topic_ov = compute_topic_overlap(target_topics, candidate.topics)
            activity = compute_activity_weight(candidate.stargazers_count, max_stars)

            score = (cos_sim * 0.6) + (topic_ov * 0.3) + (activity * 0.1)

            results.append(RankedResult(
                repo=candidate,
                score=score,
                cosine_similarity=cos_sim,
                topic_overlap=topic_ov,
                activity_weight=activity,
                type_penalty=1.0,
            ))

        results.sort(key=lambda x: x.score, reverse=True)
        return results[:top_k]
