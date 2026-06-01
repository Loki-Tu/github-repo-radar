"""LLM 特征提取与 Pydantic 校验逻辑"""

import json
import os
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field
from litellm import completion

# 抑制 LiteLLM 的调试噪音
os.environ["LITELLM_LOG"] = "ERROR"


class ProjectFeatures(BaseModel):
    """项目特征结构"""
    core_problem: str = Field(description="核心解决的问题")
    system_type: str = Field(description="系统类型分类")
    key_features: list[str] = Field(description="特性关键词列表")
    competitors: list[str] = Field(description="文档中明确提及的竞品名列表")
    search_query: str = Field(default="", description="用于 GitHub 搜索的英文关键词（3-5 个词），用于找到功能类似的项目")


# 缓存目录
_CACHE_DIR = Path(__file__).resolve().parents[2] / "data"
_CACHE_FILE = _CACHE_DIR / "repo.json"


def _load_cache() -> dict:
    """加载特征缓存"""
    if _CACHE_FILE.exists():
        with open(_CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save_cache(cache: dict) -> None:
    """保存特征缓存"""
    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    with open(_CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


def _get_cached_features(full_name: str) -> Optional[ProjectFeatures]:
    """从缓存获取特征"""
    cache = _load_cache()
    data = cache.get(full_name)
    if data:
        return ProjectFeatures(**data)
    return None


def _cache_features(full_name: str, features: ProjectFeatures) -> None:
    """将特征写入缓存"""
    cache = _load_cache()
    cache[full_name] = features.model_dump()
    _save_cache(cache)


_EXTRACT_PROMPT = """你是一个专业的开源项目分析师。请分析以下 GitHub 仓库信息，提取其核心特征。

仓库名称: {full_name}
仓库描述: {description}
Topics: {topics}
README (前 8000 字符):
{readme}

请严格按照以下 JSON 格式返回分析结果（不要包含其他文字，只返回 JSON）：
{{
    "core_problem": "该项目核心解决什么问题（一句话概括）",
    "system_type": "项目属于什么系统类型（如：CI/CD工具、Web框架、数据库、监控平台等）",
    "key_features": ["特性1", "特性2", "特性3", ...],
    "competitors": ["竞品1", "竞品2", ...],
    "search_query": "用于 GitHub 搜索的英文关键词（3-5 个词），要能搜到功能类似的项目"
}}

要求：
1. core_problem 要精准概括项目解决的核心痛点
2. system_type 使用通用的技术分类术语
3. key_features 列出 5-10 个最核心的技术特性关键词
4. competitors 列出 README 或描述中明确提到的竞品/替代方案（如果没有则返回空数组）
5. search_query 是 3-5 个英文关键词，用于在 GitHub 上搜索到功能类似的项目。例如：图片选择器 → "android image picker library"，Web 框架 → "python web framework async"
"""


def _get_llm_config() -> dict:
    """获取 LLM 配置，支持通过环境变量自定义模型

    小米 MiMo 接入方式（OpenAI 兼容）:
        client = OpenAI(api_key=MIMO_API_KEY, base_url="https://api.xiaomimimo.com/v1")
        client.chat.completions.create(model="mimo-v2.5-pro", ...)

    litellm 对应方式:
        completion(model="mimo-v2.5-pro", api_base="https://api.xiaomimimo.com/v1",
                   custom_llm_provider="openai", api_key=MIMO_API_KEY, ...)
    """
    model = os.environ.get("LLM_MODEL", "mimo-v2.5-pro")
    api_key = os.environ.get("MIMO_API_KEY") or os.environ.get("OPENAI_API_KEY") or os.environ.get("LLM_API_KEY")
    api_base = os.environ.get("LLM_API_BASE", "https://token-plan-cn.xiaomimimo.com/v1")

    config = {
        "model": model,
        "api_base": api_base,
        "api_key": api_key,
        "custom_llm_provider": "openai",
    }
    return config


def extract_features_sync(
    full_name: str,
    description: str,
    readme: str,
    topics: list[str],
    model: Optional[str] = None,
) -> ProjectFeatures:
    """同步方式提取项目特征（内部调用 LLM）"""
    prompt = _EXTRACT_PROMPT.format(
        full_name=full_name,
        description=description,
        readme=readme[:8000],  # 限制长度避免 token 超限
        topics=", ".join(topics) if topics else "无",
    )

    llm_config = _get_llm_config()
    if model:
        llm_config["model"] = model

    response = completion(
        **llm_config,
        messages=[
            {"role": "system", "content": "你是一个专业的开源项目分析师，擅长从项目文档中提取结构化信息。只返回 JSON，不要其他内容。"},
            {"role": "user", "content": prompt},
        ],
        temperature=0.1,
    )

    result_text = response.choices[0].message.content.strip()

    # 尝试从返回中提取 JSON（处理可能包含 markdown 代码块的情况）
    import json
    # 去掉 markdown 代码块标记
    if "```json" in result_text:
        result_text = result_text.split("```json")[-1].split("```")[0].strip()
    elif "```" in result_text:
        result_text = result_text.split("```")[1].split("```")[0].strip()

    data = json.loads(result_text)
    return ProjectFeatures(**data)


async def extract_features_async(
    full_name: str,
    description: str,
    readme: str,
    topics: list[str],
    model: Optional[str] = None,
) -> ProjectFeatures:
    """异步方式提取项目特征（带缓存）"""
    from litellm import acompletion

    # 先尝试从缓存读取
    cached = _get_cached_features(full_name)
    if cached:
        return cached

    prompt = _EXTRACT_PROMPT.format(
        full_name=full_name,
        description=description,
        readme=readme[:8000],
        topics=", ".join(topics) if topics else "无",
    )

    llm_config = _get_llm_config()
    if model:
        llm_config["model"] = model

    response = await acompletion(
        **llm_config,
        messages=[
            {"role": "system", "content": "你是一个专业的开源项目分析师，擅长从项目文档中提取结构化信息。只返回 JSON，不要其他内容。"},
            {"role": "user", "content": prompt},
        ],
        temperature=0.1,
    )

    result_text = response.choices[0].message.content.strip()

    if "```json" in result_text:
        result_text = result_text.split("```json")[-1].split("```")[0].strip()
    elif "```" in result_text:
        result_text = result_text.split("```")[1].split("```")[0].strip()

    data = json.loads(result_text)
    features = ProjectFeatures(**data)

    # 写入缓存
    _cache_features(full_name, features)
    return features
