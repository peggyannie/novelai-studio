# NovelAI Studio: 男频网文 AI 创作工具

NovelAI Studio 是一款专为男频网文作者设计的 AI 辅助创作工具。它集成了项目管理、世界观设定（Lore Library）以及 AI 智能辅助写作功能，旨在提升网文作者的创作效率并保持内容一致性。

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
- **框架**: Next.js 15 (App Router)
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
└── docker-compose.yml  # 基础设施编排 (PostgreSQL + pgvector, Redis)
```

## 🗓️ 路线图 (Roadmap)

- [x] **Sprint 1**: 基础框架、用户认证、作品基本 CRUD。
- [x] **Sprint 2**: Lore Library 设定库开发、AI 基础模型集成与中文支持。
- [x] **Sprint 3**: 大纲引擎生成与带上下文对话的智能创作（续写/重写）功能。
- [x] **Sprint 4**: 章节一致性冲突检查、历史快照管理与多格式项目数据导出。
