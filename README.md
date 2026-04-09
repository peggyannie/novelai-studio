# NovelAI Studio: 男频网文 AI 创作工具

NovelAI Studio 是一款专为男频网文作者设计的 AI 辅助创作工具。它集成了项目管理、世界观设定（Lore Library）以及 AI 智能辅助写作功能，旨在提升网文作者的创作效率并保持内容一致性。

## 🌐 在线地址

- 当前因域名备案限制，先使用 IP 访问。
- 生产站点（HTTP）：`http://106.52.49.54`
- Swagger 文档：`http://106.52.49.54/docs`
- OpenAPI JSON：`http://106.52.49.54/api/v1/openapi.json`

## 🚀 核心功能

- **项目管理**: 支持作品、分卷、章节的完整 CRUD 操作。
- **世界观设定库 (Lore Library)**: 管理角色、境界、场景等核心设定，确保 AI 生成内容符合设定。
- **AI 智能辅助**:
    - **大纲引擎**: 自动生成剧情大纲及冲突点。
    - **章节续写**: 根据当前上下文和设定库内容进行智能续写。
- **本地化支持**: 完整支持中文 UI 和中文化操作流程。

## 🛠️ 技术栈

### 后端 (Backend)
- **框架**: FastAPI (Python 3.10+)
- **数据库**: PostgreSQL (带 `pgvector` 扩展，用于向量检索)
- **缓存/队列**: Redis
- **ORM**: SQLAlchemy (异步模式)
- **校验**: Pydantic v2

### 前端 (Frontend)
- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **组件库**: Shadcn UI / Radix UI
- **状态管理/请求**: Axios & React Hooks

---

## ⚡ 快速开始

### 1. 环境准备
确保您的机器上已安装：
- Docker & Docker Compose
- Node.js (推荐 v18+ 或使用 `nvm`/`fnm` 等环境管理工具)
- Python 3.9+ / 3.10+

### 2. 启动基础服务 (Docker)
在项目根目录下运行：
```bash
docker-compose up -d
```
这将启动 PostgreSQL 和 Redis 服务。

### 3. 启动后端
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows 使用 venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
访问 API 文档：`http://localhost:8000/docs` （可通过内置的 Authorize 按钮并使用注册账户登入进行接口调试连接）。

### 4. 启动前端
```bash
cd frontend
npm install
npm run dev
```
访问应用界面：`http://localhost:3000`

---

## 🚀 生产部署（Docker + Nginx）

项目已内置生产部署配置（前后端、数据库、Nginx、HTTPS）：

- `docker-compose.prod.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `deploy/nginx/default.conf`
- `deploy/env.prod.example`
- `docs/ALIYUN_DEPLOY.md`

### 1. 生产环境启动

```bash
cp deploy/env.prod.example .env.prod
# 编辑 .env.prod（至少修改密码、密钥、域名、AI Key）
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

### 2. 关键环境变量

- `POSTGRES_PASSWORD`: 数据库密码（必须修改）
- `SECRET_KEY`: JWT 密钥（必须修改）
- `BACKEND_CORS_ORIGINS`: 必须是 JSON 数组字符串，例如：
  - `["https://your-domain.com"]`
  - `["http://your-server-ip"]`
- `AI_API_KEY`: AI 提供商 API Key（为空则 AI 功能禁用）
- `AI_BASE_URL` / `AI_MODEL_NAME`: AI 网关与模型配置

### 3. 部署后验证

- 前端首页：`http://<域名或IP>/`
- Swagger 文档：`http://<域名或IP>/docs`
- OpenAPI：`http://<域名或IP>/api/v1/openapi.json`

### 4. HTTPS（Let’s Encrypt）

仓库已提供证书签发与续期脚本：

- `deploy/ssl/issue_cert.sh`
- `deploy/ssl/renew_cert.sh`

详细步骤见 [docs/ALIYUN_DEPLOY.md](/Users/xuanling/Developer/Learning/novelai-studio/docs/ALIYUN_DEPLOY.md)。

### 5. 自动部署（GitHub Actions）

已提供自动部署工作流（推送 `main` 自动部署到 ECS）：

- `.github/workflows/aliyun-auto-deploy.yml`
- 说明文档：[docs/ALIYUN_CICD.md](/Users/xuanling/Developer/Learning/novelai-studio/docs/ALIYUN_CICD.md)

---

## 🤖 AI 配置与排查

若 AI 功能不可用，请优先检查：

1. `.env.prod` 中 `AI_API_KEY` 非空。
2. `AI_BASE_URL` 与 `AI_MODEL_NAME` 和你的供应商匹配。
3. 重启后端：
   ```bash
   docker compose --env-file .env.prod -f docker-compose.prod.yml up -d backend
   docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f backend
   ```
4. 日志中不应出现：`AI_API_KEY not set. AI features will be disabled.`

---

## 📂 项目结构

```text
novelai-studio/
├── backend/            # FastAPI 后端项目
│   ├── app/
│   │   ├── api/        # RESTful 接口 (涵盖 Auth, 章节, Lore设库, AI大纲, 一致性检查, 导出等)
│   │   ├── core/       # 全局配置、AI 客户端与中文提示词 (Prompts)
│   │   ├── models/     # SQLAlchemy 数据库表模型
│   │   └── schemas/    # Pydantic 校验模型
│   └── tests/          # 测试用例
├── frontend/           # Next.js 前端项目
│   ├── app/            # 页面路由 (注册/登录、Dashboard、大纲树、世界观库及章节编辑器)
│   ├── components/     # UI 组件 (Shadcn 及通用业务组件)
│   ├── lib/            # 工具类与 Axios 接口定义
│   └── public/         # 静态资源
├── docker-compose.yml       # 本地基础服务编排 (PostgreSQL + Redis + Adminer)
├── docker-compose.prod.yml  # 生产编排 (Frontend + Backend + DB + Redis + Nginx)
└── deploy/                  # Nginx、生产 env 模板、SSL 脚本
```

## 🗓️ 路线图 (Roadmap)

- [x] **Sprint 1**: 基础框架、用户认证、作品基本 CRUD。
- [x] **Sprint 2**: Lore Library 设定库开发、AI 基础模型集成与中文支持。
- [x] **Sprint 3**: 大纲引擎生成与带上下文对话的智能创作（续写/重写）功能。
- [x] **Sprint 4**: 章节一致性冲突检查、历史快照管理与多格式项目数据导出。
