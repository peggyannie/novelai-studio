# NovelAI Studio — 前端应用
 
这是 NovelAI Studio 的展示层客户端侧部分，负责网文工作台操作、仪表盘展示与 AI 互动功能，采用最新的 **Next.js App Router** 范式实现。

## 🛠 技术栈

- 核心框架：**Next.js 15.x** (React 19, Turbopack)
- 语言基础：**TypeScript**
- 样式系统：**Tailwind CSS**，支持原生深色模式
- UI 组件：**Shadcn UI** & **Radix UI** 无头组件 (可通过 `components.json` 查看引入的组件列表)
- 数据交互：**Axios** 封装请求客户端，原生 Hooks 状态管理

## 📂 核心目录架构

当前前端工程采用 Next.js `app` 树路由架构：

```text
frontend/
├── app/
│   ├── globals.css         # Tailwind 全局入口样式
│   ├── layout.tsx          # 根布局与元数据 / Theme 提供者
│   ├── page.tsx            # 欢迎 / 登录门户 / 根页面
│   ├── login/              # 登录页面
│   ├── register/           # 注册页面
│   ├── dashboard/          # 工作台概览面板
│   └── project/
│       └── [id]/           # 单个作品项目空间
│           ├── page.tsx          # 概览 / 大纲详情
│           ├── lore/page.tsx     # 世界观构建 (Lore Library)
│           └── chapter/[cid]/... # 章节内容编辑器与 AI 续写侧边栏
├── components/          
│   ├── ui/                 # 所有的 shadcn 基础可复用原子件
│   ├── user-nav.tsx        # 个人信息与登出挂件
│   └── project-card.tsx    # 控制台卡片挂件
└── lib/                 
    # 工具函数及基础配置
```

## 🚀 启动指引

### 安装依赖

建议在此目录执行：

```bash
npm install
```
*(如果需要确保所有依赖层级精准，可补充查阅并安装 `shadcn-ui` 组件前置依赖)*

### 环境编排 (如果是单开前端)

如果您单独运行前端，请确保您的后端进程已经在 `http://localhost:8000` 按正确配制监听（详见后端说明）。对于前端而言，通常不带后端也能访问到不调数据的展示页，但涉及 Auth 的操作会失败。

```bash
npm run dev
```

该模式默认开启 Next.js 极速构建机制 (Turbopack)，你可以通过访问浏览器本地地址进行热重载预览：

[http://localhost:3000](http://localhost:3000)

### 静态构建部署

```bash
npm run build
```
将会把内容推入 `.next` 缓存以完成所有 RSC 服务器动作与客户端打包验证。

## 🎨 样式扩展风格与设计理念

我们使用 `components.json` 管理外部引入的模板样式。如果要继续加入其它的设计原子件，推荐复用：
```bash
npx shadcn@latest add <component-name>
```
