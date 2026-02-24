# 男频网文 AI 作者工具（Web）技术方案 v2.0

## 1. 架构概览与核心重构范围
沿用 V1.0 的技术底座（FastAPI + Next.js + Postgres + Redis），并在应用层与业务流逻辑上进行扩展。

### 1.1 前移的圣经生成 (Bible/Lore Wizard)
- **新增接口与流程**: 
  - `POST /api/projects/{id}/generate-bible`: 接收核心配置 JSON（如 `{"protagonist": "...", "cheat": "...", "power_system": "..."}`）。利用大模型异步批量生成角色、功法、境界，落盘至 `lore_items` 表。
  - **Schema 支持**: 确保 `lore_items` 表的 `tags_json` 能够规范储存系统打上的属性标签（例如 `[{"AI_Generated": true}, {"Category": "Protagonist"}]`），便于后续精准召回组合 Prompt。
  - **前端向导式链路 (Wizard UI)**: 在前端创建项目后，拦截用户直接进入主界面的动作，通过分步表单向导（Wizard）强制或强推荐收集“主角、金手指、力量体系”这三大核心要素，收集完毕后触发底层生成，确保作品基调不被跳过。
  - **状态反馈增强 (进度闭环)**: 必须补充 `GET /api/projects/{id}/generate-bible/status` 用于前端轮询百分比，或更为优雅地采用 Server-Sent Events (SSE) `/api/projects/{id}/generate-bible/stream` 将设定生成的明细流式传输响应回前端，避免长时等候导致的用户安全感流失（死等）。

### 1.2 大纲引擎改进
- **约束生成与防截断**: 在 `app/core/prompts.py` 中的 `OUTLINE_GENERATION_PROMPT` 中，切忌要求大模型一口气吐出过多章节导致 Token 溢出与无限幻觉。应改为**滑动窗口分卷推演架构 (Sliding Window)**，单次仅推演 10-15 章（约一卷范围），并将上一卷的缩略大纲传入上下文继续推演。
- **锁机制与防竞态**: 
  - 修改 `Outline` 模型，增加对单章被锁定的局部标识（可存在在 outline_json 的特定节点属性 `locked: true` 中）。
  - 新增 `PATCH /api/projects/{id}/outline/lock` 修改锁定状态。
  - **并发防脏写**: 所有的 `PATCH` 大纲更新操作必须强绑带一个代表当前快照版本的校验位（如 `version` 或 `updated_at`），触发乐观锁校验。版本冲突时应抛出 HTTP 409 错误，拒绝全量覆盖，强制前台拉取远端解决冲突。
- **第一卷丢失 Bug 修复**:
  - `backend/app/api/v1/outline.py` 170行上下遍历存储前，强化对 `vol_data.get("title")` 和层级的解析检查机制，避免将默认占位符覆去实际第一卷卷名。

### 1.3 章节共写扩容
- `writing_schemas.py` 中 `WritingRewriteRequest` 扩容 `instruction` 字段，允许前端透传用户在悬浮气泡中输入的“自定义修改指令 (Custom Instructions)”。
- 新增 `WritingContinueRequest` 参数 `pacing` (节奏: slow/medium/fast)、`mode` (expand/compress/continue)、`feel` (爽感等级: low/medium/high)，在 `CONTINUE_WRITING_PROMPT` 中根据入参动态拼接系统级约束约束句。

### 1.4 快照与版本 Diff
- **智能与手动快照混合策略**:
  - **保留手动快照**：前端编辑器页面保留单独的“创建快照”按钮，允许用户在进行关键重写前主动归档（标记为 `manual` 并在清理时免予删除）。
  - **后端静默自动快照**：自动快照对前端透明。后端 `PUT /api/chapters/{id}` 接口在保存章节时，内部静默判断是否生成快照。仅在满足预设条件时（例如：距离上一次快照超过 15 分钟，或正文字数一次性增减超过 200 字），才在数据库中创建 `auto` 类型的历史快照。
  - **定期清理机制**：后端对单章节的 `auto` 类型的历史快照设置保留上限（如最近 20 或 30 份），防止数据库因频繁自动保存导致容量无限膨胀。
- **Diff 方案**: 前端侧集成类似 `diff-match-patch` 或简单的基于 `diff` 的 React 插件，用于在“历史记录”侧边栏或单独窗口可视化高亮文本变更。

### 1.5 导出服务扩展
- **依赖库引入**: `pip install python-docx`
- **新增接口**: `GET /api/projects/{project_id}/export/docx`
  - **性能重构逻辑**: 坚决弃用 `for` 循环逐级查询的传统 ORM 用法。必须使用 SQLAlchemy 的 `joinedload` 或 `selectinload` 并发 eager load 预加载查询出 Volumes 及其全量 Chapters，彻底阻断数据库 N+1 查询瓶颈。
  - 针对极大体量的项目数据生成文档，考虑改调用 `docx.Document()` 生成流并使用 `StreamingResponse` 返回，减缓宿主服务器瞬时内存飙升压力并避免前端 Gateway Timeout。

### 1.6 交互细节与 AI 修复
- **Web 端选区高亮保持**: 
  - 在唤出悬浮重写弹窗前，利用 `window.getSelection().getRangeAt(0)` 保存用户选区。如果使用 Tiptap 等富文本框架，则应在其 `editor.state.selection` 存入 React State，并在弹窗操作结束前应用保留选中格式样式。
- **一致性检查的全中文保障**: 
  - 在 `CONSISTENCY_CHECK_PROMPT` 尾部加上强约束指令 `"""注意：必须以完整的简体中文输出最终 JSON。例如 "issue_type": "时间线逻辑矛盾", 不允许出现英文属性值！"""` 

### 1.7 V1 核心流程沉浸式整合
- **章节任务卡 (Chapter Task Card)**：
  - 前端编辑器页面增加固定的右上侧边栏或可拖拽面板悬浮窗，专用于展示从 `API: GET /api/projects/{id}/outline` 中取出的目前章节的大纲节点（包含本章目标、冲突、钩子等摘要信息）。
  - 这些信息在每次通过编辑器发起 AI 重/扩写时，不但需要显示给作者看，更必须由前端作为 `task_context` 字段，显式注入至后端 `POST /api/writing/*` 的 Request Body 中参与组装 Prompt。
- **沉浸式一致性巡检 (Implicit Consistency Check)**：
  - 抛弃原本独立的专门执行“检查大检查”的操作流。
  - 在保存或内容变动防抖一定时间（如 300 秒无输入且有重大文本翻新）时，前端静默触发异步调用 `POST /api/chapters/{chapter_id}/consistency-check`，后端仅反馈最新的 Check Issues 列表（存储在表 `consistency_issues`）。
  - 前端收到后，将对应的 `issues` 中提及的内容片段在 Tiptap 编辑器里划出波浪线进行标注卡片渲染。

---

## 2. API 规范变更表 (概览)

| 接口路线 | 方法 | 功能描述 | 核心改动 |
| -------- | --- | -------- | -------- |
| `/api/projects/{id}/generate-bible` | POST | 圣经一键生成 | **(New)** 接收基础设定并发存入 Lore库 |
| `/api/projects/{id}/generate-bible/status` | GET/SSE | 生成进度反馈 | **(New)** 补充长时任务的状态进度闭环轮询或流式送达 |
| `/api/projects/{id}/export/docx` | GET | Docx 完整导出 | **(New)** 提供二进制文件流下载，基于 Eager Load 查询优化 |
| `/api/projects/{id}/outline/lock` | PATCH | 大纲局部或全局锁定 | **(New)** 根据节点ID锁定树，需前后台协带并发校验锁防脏写 |
| `/api/chapters/{id}` | PUT | 保存与自动快照钩子 | **(Hook)** 热字数及跨度判定条件归档，避免快照泛滥 |
| `/api/writing/rewrite` | POST | 自定义指令重写 | 前端传入自定义 `instruction` |
| `/api/writing/continue` | POST | 更多写作模式 | 增加 `mode` 和 `pacing` 字段 |

## 3. 部署与发版 (实施顺序建议)
1. **DB/Model 更新**：(无需大的 Alembic Migration，需加 Outline Json 位检锁、快照类型字段等兼容)
2. **后端逻辑补丁**：(第一卷标题丢失修复、快照判定拦截、Docx Eager Load 规避查询风暴、大模型分卷化推演防止 Token 打满、自动检测巡检机制集成)
3. **前端交互重构**：(编辑器侧边栏增加 Task Card 悬浮模块、保存巡检波浪线、选区保持锁定、增加 Bible Wizard 进度感知与对接并发冲突状态图)
4. **集成全新功能**：(Docx 导出流管道、长文本大模型任务流转)
