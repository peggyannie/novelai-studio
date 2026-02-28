# GitHub Actions 自动部署到阿里云

该方案会在 `main` 分支有新提交时，自动 SSH 到 ECS 执行部署命令：

```bash
git pull --ff-only origin main
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

工作流文件：

- `.github/workflows/aliyun-auto-deploy.yml`

## 1. GitHub Secrets 配置

在仓库 `Settings -> Secrets and variables -> Actions` 中新增：

- `ALIYUN_HOST`: ECS 公网 IP 或域名
- `ALIYUN_USER`: SSH 用户（例如 `dev`）
- `ALIYUN_SSH_KEY`: 对应私钥内容（多行完整粘贴）
- `ALIYUN_PORT`（可选）: 默认 `22`
- `DEPLOY_PATH`（可选）: 默认 `/home/dev/novelai-studio`
- `DEPLOY_BRANCH`（可选）: 默认 `main`

## 2. 服务器前置条件

- 目标目录已存在 git 仓库：`$DEPLOY_PATH`
- 服务器能执行 `docker compose` 命令
- `.env.prod` 已配置完成
- `ALIYUN_USER` 有权限执行 docker

## 3. 触发方式

- 自动触发：推送到 `main`
- 手动触发：GitHub Actions 页面点 `Run workflow`

## 4. 常见问题

1. `Permission denied (publickey)`  
   检查 `ALIYUN_SSH_KEY` 是否与服务器公钥匹配。

2. `docker permission denied`  
   把部署用户加入 `docker` 组，并重新登录生效。

3. `git pull --ff-only` 失败  
   说明服务器目录有本地改动，需清理后再部署。
