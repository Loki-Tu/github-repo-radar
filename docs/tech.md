# GitHub Repo Radar — 技术实现文档

> 本文档以语言无关的方式描述系统架构、数据结构、API 调用、算法逻辑和完整数据流，目标是方便迁移到其他语言/平台（如 WXT 浏览器插件、Go CLI、Rust TUI 等）。

---

## 1. 系统架构总览

```
用户输入 GitHub URL
        │
        ▼
┌─────────────────┐
│  1. 获取目标仓库  │  GitHub REST API: GET /repos/{owner}/{repo}
│     + README     │  GitHub REST API: GET /repos/{owner}/{repo}/readme
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. LLM 特征提取  │  OpenAI-compatible Chat API (单次调用)
│                  │  输入: name + description + topics + readme[:8000]
│                  │  输出: ProjectFeatures JSON
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  3. 并行多路召回 (asyncio.gather)        │
│     ├─ 策略A: search_query 搜索          │  GitHub Search API
│     ├─ 策略B: "{repo_name} alternative"  │  GitHub Search API
│     └─ 策略C: competitors 名搜索         │  GitHub Search API
└────────┬────────────────────────────────┘
         │ 去重合并
         ▼
┌─────────────────────────────────────────┐
│  4. 两阶段排序                           │
│     ├─ Pass 1: rank_fast (纯 CPU)        │  topic + description + stars
│     │   → 选出 top 30                   │
│     ├─ 并发获取 top 30 的 README         │  Semaphore(5) 控制并发
│     └─ Pass 2: rank (embedding)          │  Embedding API × 31 次
│         → 最终 top N                     │
└────────┬────────────────────────────────┘
         │
         ▼
      输出结果
```

---

## 2. 数据结构定义

### 2.1 RepoData / CandidateRepo（目标仓库 / 候选仓库）

两个结构完全相同，用一个接口描述：

```typescript
interface Repo {
  full_name: string;       // "owner/repo"
  description: string;     // 仓库描述，可能为空
  readme: string;          // README 全文，搜索结果中为空字符串
  topics: string[];        // GitHub topics 标签，如 ["python", "web", "api"]
  stargazers_count: number; // star 数
  html_url: string;        // "https://github.com/owner/repo"
}
```

### 2.2 ProjectFeatures（LLM 提取的特征）

```typescript
interface ProjectFeatures {
  core_problem: string;    // 一句话概括核心解决的问题
  system_type: string;     // 系统类型，如 "Web Framework", "Android Library"
  key_features: string[];  // 5-10 个核心技术特性关键词
  competitors: string[];   // README 中明确提到的竞品名，可能为空
  search_query: string;    // LLM 生成的 GitHub 搜索关键词（3-5 个英文词）
}
```

### 2.3 RankedResult（排序结果）

```typescript
interface RankedResult {
  repo: Repo;
  score: number;            // 综合得分 (0-1)
  cosine_similarity: number; // 语义相似度 (0-1)
  topic_overlap: number;    // topic 重叠度 (0-1)
  activity_weight: number;  // 活跃度权重 (0-1)
}
```

---

## 3. 外部 API 调用规范

### 3.1 GitHub REST API

所有请求需要 Header：
```
Accept: application/vnd.github.v3+json
User-Agent: github-repo-radar
Authorization: token {GITHUB_TOKEN}   // 可选，无 token 限流 60次/小时
```

#### 获取仓库信息
```
GET https://api.github.com/repos/{owner}/{repo}
```
返回字段提取：
- `full_name`, `description`, `topics[]`, `stargazers_count`, `html_url`

#### 获取 README
```
GET https://api.github.com/repos/{owner}/{repo}/readme?ref=main
```
返回 `content` 字段是 base64 编码的 README 全文。若 main 分支失败，回退到 `?ref=master`。

#### 搜索仓库
```
GET https://api.github.com/search/repositories?q={query}&sort=stars&order=desc&per_page=30
```
- `q`: 搜索关键词（如 "android image picker library"）
- `sort`: `stars`（按 star 数排序）
- `per_page`: 最大 100
- 分页: `page=1,2,...10`（最多 10 页）
- 返回 `items[]` 中提取: `full_name`, `description`, `topics[]`, `stargazers_count`, `html_url`
- 注意: 搜索 API **不返回 README**，需要后续单独获取

### 3.2 LLM Chat API（OpenAI 兼容格式）

```
POST {api_base}/chat/completions
```

请求体：
```json
{
  "model": "mimo-v2.5-pro",
  "temperature": 0.1,
  "messages": [
    {
      "role": "system",
      "content": "你是一个专业的开源项目分析师，擅长从项目文档中提取结构化信息。只返回 JSON，不要其他内容。"
    },
    {
      "role": "user",
      "content": "<见下方 Prompt 模板>"
    }
  ]
}
```

#### Prompt 模板

```
你是一个专业的开源项目分析师。请分析以下 GitHub 仓库信息，提取其核心特征。

仓库名称: {full_name}
仓库描述: {description}
Topics: {topics}
README (前 8000 字符):
{readme}

请严格按照以下 JSON 格式返回分析结果（不要包含其他文字，只返回 JSON）：
{
    "core_problem": "该项目核心解决什么问题（一句话概括）",
    "system_type": "项目属于什么系统类型（如：CI/CD工具、Web框架、数据库、监控平台等）",
    "key_features": ["特性1", "特性2", "特性3", ...],
    "competitors": ["竞品1", "竞品2", ...],
    "search_query": "用于 GitHub 搜索的英文关键词（3-5 个词），要能搜到功能类似的项目"
}

要求：
1. core_problem 要精准概括项目解决的核心痛点
2. system_type 使用通用的技术分类术语
3. key_features 列出 5-10 个最核心的技术特性关键词
4. competitors 列出 README 或描述中明确提到的竞品/替代方案（如果没有则返回空数组）
5. search_query 是 3-5 个英文关键词，用于在 GitHub 上搜索到功能类似的项目。
   例如：图片选择器 → "android image picker library"，Web 框架 → "python web framework async"
```

#### JSON 解析容错

LLM 返回可能包含 markdown 代码块包裹，需要处理：
1. 如果包含 ` ```json ... ``` `，提取中间部分
2. 如果包含 ` ``` ... ``` `，提取中间部分
3. 否则直接 `JSON.parse()`

### 3.3 Embedding API（OpenAI 兼容格式）

```
POST {api_base}/embeddings
```

请求体：
```json
{
  "model": "Qwen/Qwen3-Embedding-0.6B",
  "input": ["要嵌入的文本"]
}
```

返回 `data[0].embedding` 是浮点数数组（向量）。

---

## 4. 核心算法

### 4.1 并行多路召回

```
输入: features (ProjectFeatures), repo_full_name
输出: CandidateRepo[] (去重合并)

async function parallelRecall(features, repoFullName):
    exclude = [repoFullName]
    shortName = repoFullName.split("/").pop()

    tasks = [
        searchRepos(features.search_query, per_page=30),           // 策略A
        searchRepos(shortName + " alternative", per_page=20),      // 策略B
    ]

    // 策略C: 如果有竞品，搜索竞品名
    for comp in features.competitors.slice(0, 2):
        tasks.push(searchRepos(comp, per_page=15))

    results = await Promise.all(tasks)  // 并行执行

    // 合并去重
    seen = new Set()
    candidates = []
    for each resultList in results:
        for each repo in resultList:
            if repo.full_name not in seen AND repo.full_name != repoFullName:
                seen.add(repo.full_name)
                candidates.push(repo)

    return candidates
```

### 4.2 快速过滤（Pass 1 — 纯 CPU，无需 API 调用）

```
输入: candidates[], targetTopics[], targetDescription, topK=30
输出: top K 个最相关的 CandidateRepo

function rankFast(candidates, targetTopics, targetDescription, topK):
    targetWords = tokenize(targetDescription) - stopwords
    maxStars = max(c.stargazers_count for c in candidates)

    scored = []
    for c in candidates:
        // 1. Topic 重叠分 — Overlap Coefficient
        topicScore = topicOverlap(targetTopics, c.topics)

        // 2. 描述关键词匹配分
        candWords = tokenize(c.description) - stopwords
        descScore = |targetWords ∩ candWords| / |targetWords|

        // 3. Star 活跃度分
        starScore = log(1 + c.stargazers_count) / log(1 + maxStars)

        total = topicScore * 0.4 + descScore * 0.4 + starScore * 0.2
        scored.push((total, c))

    scored.sort(descending by total)
    return scored.slice(0, topK)
```

### 4.3 Topic 重叠度 — Overlap Coefficient

```
function topicOverlap(topicsA: string[], topicsB: string[]): float:
    setA = new Set(topicsA.map(lowercase))
    setB = new Set(topicsB.map(lowercase))
    if setA.isEmpty OR setB.isEmpty: return 0.0

    intersection = |setA ∩ setB|
    minSize = min(|setA|, |setB|)
    return intersection / minSize
```

选择 Overlap Coefficient 而非 Jaccard 的原因：当两个集合大小差异大时（如 FastAPI 有 23 个 topics，Flask 只有 3 个），Jaccard 会严重惩罚（0.038），而 Overlap Coefficient 能正确识别子集关系（1.0）。

### 4.4 Embedding 文本构建

目标项目和候选项目使用**完全相同**的文本模板：

```
function buildEmbeddingText(repo: Repo): string
    parts = []
    if repo.description:  parts.push("Description: " + repo.description)
    if repo.topics:       parts.push("Topics: " + repo.topics.join(", "))
    if repo.readme:       parts.push("README: " + repo.readme.slice(0, 3000))
    return parts.join("\n")
```

关键：README 截断到 3000 字符以避免 embedding 模型 token 超限。

### 4.5 精准排序（Pass 2 — 需要 Embedding API）

```
输入: targetEmbedding, candidates[], candidateEmbeddings[], targetTopics[], topK=10
输出: RankedResult[]

function rank(targetEmbedding, candidates, candidateEmbeddings, targetTopics, topK):
    maxStars = max(c.stargazers_count for c in candidates)

    results = []
    for i, candidate in candidates:
        cosSim = cosineSimilarity(targetEmbedding, candidateEmbeddings[i])
        topicOv = topicOverlap(targetTopics, candidate.topics)
        activity = log(1 + candidate.stargazers_count) / log(1 + maxStars)

        score = cosSim * 0.6 + topicOv * 0.3 + activity * 0.1
        results.push({ repo: candidate, score, cosSim, topicOv, activity })

    results.sort(descending by score)
    return results.slice(0, topK)
```

### 4.6 余弦相似度

```
function cosineSimilarity(a: float[], b: float[]): float:
    normA = sqrt(sum(x² for x in a))
    normB = sqrt(sum(x² for x in b))
    if normA == 0 OR normB == 0: return 0.0
    return dot(a, b) / (normA * normB)
```

---

## 5. 并发控制策略

### 5.1 搜索并行

所有搜索策略通过 `Promise.all()` 并行执行，不互相依赖。

### 5.2 README 并发获取

```
async function fetchReadmesConcurrent(candidates, maxCount=30, concurrency=5, delay=200ms):
    semaphore = new Semaphore(concurrency)

    async function fetchOne(candidate):
        await semaphore.acquire()
        try:
            await fetchCandidateReadme(candidate)
        finally:
            semaphore.release()
        await sleep(delay)

    await Promise.all(candidates.slice(0, maxCount).map(fetchOne))
```

### 5.3 Embedding 限流

每生成 5 个 embedding 后暂停 300ms，避免触发 API 限流。

---

## 6. 环境变量

| 变量名 | 用途 | 必需 |
|--------|------|------|
| `GITHUB_TOKEN` | GitHub API 认证，提升限流到 5000次/小时 | 推荐 |
| `MIMO_API_KEY` 或 `LLM_API_KEY` | LLM API Key | 是 |
| `LLM_MODEL` | LLM 模型名，默认 `mimo-v2.5-pro` | 否 |
| `LLM_API_BASE` | LLM API 地址 | 否 |
| `SILICONFLOW_API_KEY` 或 `EMBEDDING_API_KEY` | Embedding API Key | 是 |
| `EMBEDDING_MODEL` | Embedding 模型名 | 否 |
| `EMBEDDING_API_BASE` | Embedding API 地址 | 否 |

---

## 7. 缓存策略

LLM 提取的 `ProjectFeatures` 按 `full_name` 缓存到本地 JSON 文件（`data/repo.json`）。结构：

```json
{
  "fastapi/fastapi": {
    "core_problem": "...",
    "system_type": "Web Framework",
    "key_features": ["..."],
    "competitors": [],
    "search_query": "python async api framework"
  }
}
```

下次查询同一仓库时直接读缓存，跳过 LLM 调用。

---

## 8. 迁移到 WXT 浏览器插件的注意事项

### 8.1 可以复用的部分
- **LLM Prompt 模板** — 直接复用
- **打分算法**（topic overlap、cosine similarity、activity weight）— 逻辑不变
- **两阶段排序流程** — 逻辑不变
- **数据结构定义** — 直接翻译为 TypeScript interface

### 8.2 需要适配的部分
- **GitHub API 调用** — 在浏览器插件中需要用 `fetch()` 替代 `httpx`，注意 CORS 限制（可能需要走 background script 代理）
- **LLM/Embedding API 调用** — 同上，用 `fetch()` 替代
- **并发控制** — 用 `Promise.all()` + 简单的 semaphore 实现替代 `asyncio.gather()`
- **缓存** — 用 `chrome.storage.local` 或 `IndexedDB` 替代文件缓存
- **并行搜索** — `Promise.all()` 替代 `asyncio.gather()`
- **README 并发获取** — 用 `Promise.all()` + 手动 semaphore 替代

### 8.3 浏览器插件特有的优化
- 可以利用 GitHub OAuth Token（用户登录后获取），无需手动配置
- 可以在用户浏览 GitHub 仓库页面时自动触发分析（content script 检测 URL 变化）
- 可以缓存分析结果到 `chrome.storage.local`，同一仓库不重复分析
- 注意 GitHub API 的 CORS 限制：从浏览器直接调用 `api.github.com` 需要 token，否则会被 CORS 拦截
