# NovelAI Studio — 后端服务

NovelAI Studio 后端基于 **FastAPI** 构建，提供 RESTful API 支持作品管理、世界观设定、AI 辅助写作等核心功能。

## 🛠️ 技术栈

| 类别       | 技术                              |
| ---------- | --------------------------------- |
| Web 框架   | FastAPI 0.109                     |
| 运行时     | Python 3.10+ / Uvicorn           |
| 数据库     | PostgreSQL (异步驱动 asyncpg)     |
| ORM        | SQLAlchemy 2.0 (异步模式)         |
| 数据库迁移 | Alembic                           |
| 数据校验   | Pydantic v2 / pydantic-settings   |
| 认证       | JWT (python-jose + passlib/bcrypt) |
| AI 集成    | OpenAI SDK (兼容 DeepSeek 等)     |
| 测试       | pytest + httpx + pytest-asyncio   |

---

## 📂 项目结构

```text
backend/
├── app/
│   ├── main.py              # FastAPI 应用入口，CORS 配置
│   ├── api/
│   │   ├── api.py           # 路由注册中心
│   │   ├── deps.py          # 依赖注入（数据库会话、当前用户等）
│   │   └── v1/              # v1 版本 API 路由
│   │       ├── auth.py      # 用户注册 / 登录 / Token 刷新
│   │       ├── projects.py  # 作品 CRUD
│   │       ├── volumes.py   # 分卷 CRUD
│   │       ├── chapters.py  # 章节 CRUD
│   │       ├── lore.py      # 世界观设定 (Lore) CRUD
│   │       ├── outline.py   # AI 大纲生成
│   │       ├── writing.py   # AI 章节续写
│   │       ├── consistency.py # 一致性检查
│   │       ├── snapshots.py # 内容快照 / 版本管理
│   │       ├── export.py    # 多格式导出
│   │       ├── stats.py     # 写作统计
│   │       └── reorder.py   # 章节 / 分卷排序
│   ├── core/
│   │   ├── config.py        # 全局设置 (Pydantic Settings)
│   │   ├── security.py      # JWT 签发 / 密码哈希
│   │   ├── ai_client.py     # AI/LLM 客户端封装
│   │   └── prompts.py       # AI 提示词模板
│   ├── db/
│   │   ├── base.py          # SQLAlchemy 声明基类
│   │   └── session.py       # 异步数据库会话工厂
│   ├── models/              # SQLAlchemy ORM 模型
│   │   ├── user.py          # 用户模型
│   │   ├── project.py       # 作品 / 分卷 / 章节模型
│   │   ├── lore.py          # 世界观设定模型
│   │   ├── outline.py       # 大纲模型
│   │   └── snapshot.py      # 快照模型
│   └── schemas/             # Pydantic 请求 / 响应 Schema
│       ├── user.py
│       ├── project.py
│       ├── lore.py
│       ├── outline.py
│       ├── snapshot.py
│       ├── consistency.py
│       └── writing.py
├── alembic/                 # 数据库迁移脚本
├── alembic.ini              # Alembic 配置
├── requirements.txt         # Python 依赖
├── .env                     # 环境变量（不应提交到版本控制）
└── test_ai.py               # AI 功能测试脚本
```

---

## ⚙️ 环境变量

在 `backend/.env` 中配置（也可通过系统环境变量覆盖）：

| 变量名                    | 说明                  | 默认值                         |
| ------------------------- | --------------------- | ------------------------------ |
| `POSTGRES_SERVER`         | PostgreSQL 主机       | `localhost`                    |
| `POSTGRES_PORT`           | PostgreSQL 端口       | `5432`                         |
| `POSTGRES_USER`           | 数据库用户名          | `postgres`                     |
| `POSTGRES_PASSWORD`       | 数据库密码            | `changethis`                   |
| `POSTGRES_DB`             | 数据库名称            | `codex_db`                     |
| `DATABASE_URI`            | 完整数据库连接串 (可选) | 自动拼接                       |
| `SECRET_KEY`              | JWT 签名密钥          | `changethis_secret_key`        |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access Token 过期时间 (分钟) | `30`            |
| `REFRESH_TOKEN_EXPIRE_DAYS`   | Refresh Token 过期时间 (天)  | `7`             |
| `AI_BASE_URL`             | AI API 地址           | `https://api.deepseek.com/v1`  |
| `AI_API_KEY`              | AI API 密钥           | —                              |
| `AI_MODEL_NAME`           | 模型名称              | `deepseek-chat`                |
| `AI_TIMEOUT`              | AI 请求超时 (秒)      | `60`                           |

---

## 🚀 快速启动

### 1. 安装依赖

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
cp .env.example .env   # 或手动创建 .env 文件
# 编辑 .env，填入数据库连接信息和 AI API Key
```

### 3. 初始化数据库

确保 PostgreSQL 已运行，然后执行迁移：

```bash
alembic upgrade head
```

### 4. 启动开发服务器

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

启动后访问：
- **API 文档 (Swagger)**: http://localhost:8000/docs
  *(可使用新增的 OAuth2 表单验证接口通过 "Authorize" 按钮使用邮箱密码获取身份认证)*
- **ReDoc 文档**: http://localhost:8000/redoc

---

## 📡 API 路由概览

所有 API 路由均以 `/api/v1` 为前缀。

| 模块          | 前缀                    | 说明                   |
| ------------- | ----------------------- | ---------------------- |
| Auth          | `/api/v1/auth`          | 用户注册、登录 (JSON & OAuth2 Form)、Token 刷新 |
| Projects      | `/api/v1/projects`      | 作品 CRUD              |
| Volumes       | `/api/v1/projects/...`  | 分卷 CRUD              |
| Chapters      | `/api/v1/projects/...`  | 章节 CRUD              |
| Lore          | `/api/v1/projects/...`  | 世界观设定 CRUD        |
| Outline       | `/api/v1/outline`       | AI 大纲生成            |
| Writing       | `/api/v1/writing`       | AI 章节续写            |
| Consistency   | `/api/v1/consistency`   | 内容一致性检查         |
| Snapshots     | `/api/v1/projects/...`  | 内容快照管理           |
| Export        | `/api/v1/projects/...`  | 多格式导出             |
| Stats         | `/api/v1/stats`         | 写作统计数据           |
| Reorder       | `/api/v1/reorder`       | 章节 / 分卷排序        |

---

## 🧪 测试

```bash
# 运行全部测试
pytest

# 运行 AI 功能测试
python test_ai.py
```

---

## 📝 数据库迁移

```bash
# 创建新的迁移脚本
alembic revision --autogenerate -m "描述变更内容"

# 执行迁移
alembic upgrade head

# 回滚上一次迁移
alembic downgrade -1
```
