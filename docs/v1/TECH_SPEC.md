# 男频网文 AI 作者工具（Web）技术方案 v1.0

## 1. 技术目标
- 支撑 V1 MVP：作品管理、设定库、大纲、章节共写、一致性检查、版本管理、导出。
- 保证可扩展：后续可平滑支持团队协作和更复杂 AI 编排。
- 保证可观测：性能、失败率、成本必须可追踪。

## 2. 总体架构
- 前端：Next.js + TypeScript + Tailwind CSS
- 后端 API：FastAPI（Python）
- 数据库：PostgreSQL + pgvector
- 缓存/队列：Redis + Celery
- 文件存储：S3 兼容对象存储（导出产物）
- 鉴权：JWT + Refresh Token

## 3. 服务模块划分
1. auth-service：注册、登录、token 刷新、鉴权中间件
2. project-service：作品、卷章、版本管理
3. lore-service：设定库 CRUD 和检索
4. ai-orchestrator：Prompt 编排、模型路由、重试与降级
5. consistency-service：规则检查 + LLM 语义检查
6. export-service：TXT/Docx 导出
7. analytics-service：埋点、成本统计、运营指标

## 4. 数据模型（核心表）

### projects
- id, user_id, title, genre, status, target_words, update_frequency, created_at, updated_at

### volumes
- id, project_id, title, order_no, created_at, updated_at

### chapters
- id, project_id, volume_id, title, order_no, status, word_count, current_content, updated_at

### chapter_versions
- id, chapter_id, version_no, content, source(user|ai|system), created_at

### lore_items
- id, project_id, type(character|realm|skill|faction|item|location), name, summary, tags_json, constraints_json, first_appear_chapter_id, updated_at

### outlines
- id, project_id, chapter_id(nullable), outline_json, locked(bool), updated_at

### consistency_issues
- id, project_id, chapter_id, issue_type, severity, detail, suggestion, resolved(bool), created_at

### ai_jobs
- id, project_id, chapter_id, job_type, input_json, output_json, status, token_in, token_out, cost, created_at

## 5. API 设计（V1 最小集）

### 5.1 鉴权
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout

### 5.2 作品
- POST /api/projects
- GET /api/projects
- GET /api/projects/{id}

### 5.3 设定库
- POST /api/projects/{id}/lore-items
- GET /api/projects/{id}/lore-items
- PATCH /api/lore-items/{item_id}

### 5.4 大纲
- POST /api/projects/{id}/outline/generate
- PATCH /api/chapters/{chapter_id}/outline-lock

### 5.5 章节共写
- POST /api/chapters/{chapter_id}/ai-draft
  - body: mode, prompt, target_words, style, pacing
- POST /api/chapters/{chapter_id}/apply-draft

### 5.6 一致性检查
- POST /api/chapters/{chapter_id}/consistency-check
- GET /api/chapters/{chapter_id}/issues
- POST /api/issues/{issue_id}/apply-fix

### 5.7 版本
- POST /api/chapters/{chapter_id}/snapshot
- GET /api/chapters/{chapter_id}/versions
- POST /api/chapters/{chapter_id}/rollback/{version_id}

### 5.8 导出
- POST /api/projects/{id}/export
- GET /api/exports/{export_id}

## 6. AI 编排规范

### 6.1 上下文组装顺序
1. 系统规则（安全、风格、输出格式）
2. 项目级设定摘要
3. 相关设定条目（RAG Top-K）
4. 最近章节摘要（默认 N=5）
5. 当前章节大纲与作者意图
6. 用户当前输入文本

### 6.2 模型路由
- 轻任务（标题、简介、改写）：小模型
- 重任务（2000 字章节生成、冲突诊断）：大模型
- 超时重试：最多 2 次，指数退避 1s / 3s
- 降级策略：大模型失败时降级为提纲输出，不直接返回失败

### 6.3 输出协议（统一 JSON）
```json
{
  "summary": "string",
  "draft": "string",
  "issues": [{"type": "...", "detail": "...", "suggestion": "..."}],
  "meta": {"tokens_in": 0, "tokens_out": 0}
}
```

## 7. 一致性检查实现
- 规则引擎（确定性优先）：
  1. 境界顺序校验
  2. 时间线先后校验
  3. 角色生死状态校验
- LLM 语义检查（补充）：
  1. 人设行为偏移
  2. 术语替换引发语义冲突
- 结果合并：规则结果 + LLM 结果去重后入库

## 8. 前端路由与状态
- /projects：作品列表
- /projects/:id/dashboard：项目概览与任务卡
- /projects/:id/lore：设定库
- /projects/:id/outline：大纲树
- /projects/:id/chapters/:chapterId/editor：编辑器 + AI 侧栏
- /projects/:id/versions：版本对比

状态管理：
- 服务端状态：React Query
- 编辑器本地状态：Zustand

## 9. 安全与合规
1. 所有请求按 user_id 做数据隔离。
2. 生成前后双重内容安全检测。
3. 日志脱敏（不存全文，仅存哈希、长度、抽样片段）。
4. 提供用户数据删除接口（软删 + 延迟硬删）。

## 10. 监控与埋点

### 10.1 技术指标
1. API 成功率
2. P95 延迟
3. AI 任务失败率

### 10.2 业务指标
1. 首章完成率
2. 周活跃写作天数
3. 一致性问题修复率

### 10.3 成本指标
1. 单任务 token 消耗
2. 每千字成本
3. 每用户月成本

## 11. AI Agent 实施顺序（建议）
1. 初始化仓库与脚手架（前后端、数据库、Redis）
2. 鉴权与作品管理 API
3. 设定库 CRUD + 页面
4. 大纲生成链路（异步）
5. 章节共写与草稿应用
6. 版本快照、Diff、回滚
7. 一致性检查（规则引擎 v1 + LLM）
8. 导出服务（TXT/Docx）
9. 埋点、监控、成本统计
10. E2E 测试与灰度发布

## 12. 技术 DoD
1. 核心接口有 OpenAPI 文档和示例。
2. 核心流程有集成测试。
3. 关键链路 E2E 通过。
4. 监控面板可见延迟、错误率、成本。
5. 灰度环境稳定运行 7 天。
