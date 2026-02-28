# 阿里云服务器部署指南（Docker 生产版）

本文档基于当前仓库新增的生产配置：

- `docker-compose.prod.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `deploy/nginx/default.conf`
- `deploy/env.prod.example`

## 1. 服务器准备

推荐配置：

- Ubuntu 22.04 LTS
- 2C4G 或以上
- 磁盘 40G+

阿里云安全组开放端口：

- `22`（SSH）
- `80`（HTTP）
- `443`（HTTPS，可选）

## 2. 安装 Docker 与 Compose 插件

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

执行完后重新登录一次 SSH，使 `docker` 组生效。

## 3. 拉取代码并配置生产环境变量

```bash
git clone <你的仓库地址> novelai-studio
cd novelai-studio
cp deploy/env.prod.example .env.prod
```

编辑 `.env.prod` 至少修改这些字段：

- `POSTGRES_PASSWORD`
- `SECRET_KEY`
- `AI_API_KEY`
- `BACKEND_CORS_ORIGINS`

说明：

- `BACKEND_CORS_ORIGINS` 必须是 JSON 数组字符串格式。
- 如果你用域名，例如：`BACKEND_CORS_ORIGINS=["https://novel.your.com"]`
- 如果你暂时只用 IP，例如：`BACKEND_CORS_ORIGINS=["http://47.x.x.x"]`

## 4. 启动服务

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

检查状态：

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f backend
```

成功后访问：

- 前端：`http://你的IP或域名`
- 后端文档：`http://你的IP或域名/docs`

## 5. 升级发布

```bash
git pull
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

## 6. HTTPS（推荐）

当前仓库已内置 Nginx `443` 配置和 certbot 目录映射，推荐直接使用 Let’s Encrypt：

```bash
cd ~/novelai-studio
mkdir -p deploy/certbot/conf/live/novelai-studio.duckdns.org
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout deploy/certbot/conf/live/novelai-studio.duckdns.org/privkey.pem \
  -out deploy/certbot/conf/live/novelai-studio.duckdns.org/fullchain.pem \
  -subj "/CN=novelai-studio.duckdns.org"
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d nginx
sh deploy/ssl/issue_cert.sh novelai-studio.duckdns.org
docker compose --env-file .env.prod -f docker-compose.prod.yml restart nginx
```

验证：

```bash
curl -I https://novelai-studio.duckdns.org
```

续期（建议加到 crontab，每月执行）：

```bash
cd ~/novelai-studio
sh deploy/ssl/renew_cert.sh
```

## 7. 常见问题

1. 页面能开但接口 401 / CORS 错误  
   检查 `.env.prod` 的 `BACKEND_CORS_ORIGINS` 是否与浏览器访问地址完全一致（协议、域名、端口都要匹配）。

2. AI 功能返回失败  
   检查 `AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL_NAME` 是否正确。

3. 后端启动失败  
   查看日志：
   ```bash
   docker compose --env-file .env.prod -f docker-compose.prod.yml logs backend
   ```
