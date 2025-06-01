# PDF-Dify 生产环境部署指南

## 📋 部署前准备

### 1. 系统要求
- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / macOS 10.15+
- **内存**: 最少 4GB RAM (推荐 8GB+)
- **存储**: 最少 20GB 可用空间
- **网络**: 稳定的互联网连接

### 2. 必要软件
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (如果使用 PM2 部署)
- PM2 (可选，用于进程管理)

## 🔧 环境配置

### 1. 更新生产环境变量

编辑 `.env.production` 文件，配置以下关键参数：

```bash
# 必须配置的生产环境变量
DIFY_API_KEY=your_actual_dify_api_key
DIFY_KNOWLEDGE_BASE_ID=your_actual_knowledge_base_id
OPENSEARCH_NODE=https://your-opensearch-cluster:9200
OPENSEARCH_USERNAME=your_opensearch_username
OPENSEARCH_PASSWORD=your_opensearch_password
CORS_ORIGIN=https://your-frontend-domain.com
```

### 2. SSL 证书配置 (可选)

如果使用 Nginx 进行 SSL 终止：

```bash
# 创建 SSL 证书目录
mkdir -p nginx/ssl

# 复制你的 SSL 证书文件
cp your-cert.crt nginx/ssl/
cp your-private.key nginx/ssl/
```

## 🚀 部署方式

### 方式一：Docker Compose 部署 (推荐)

这是最简单的部署方式，包含了应用、OpenSearch 和 Nginx。

#### 1. 快速部署

```bash
# 赋予部署脚本执行权限
chmod +x deploy.sh

# 执行部署
./deploy.sh
```

#### 2. 手动部署步骤

```bash
# 1. 构建镜像
docker-compose build

# 2. 启动所有服务
docker-compose up -d

# 3. 查看服务状态
docker-compose ps

# 4. 查看日志
docker-compose logs -f pdf-dify-app
```

#### 3. 服务访问

- **应用 API**: http://localhost:3000
- **Swagger 文档**: http://localhost:3000/api
- **OpenSearch**: http://localhost:9200
- **OpenSearch Dashboards**: http://localhost:5601

### 方式二：PM2 部署

适用于已有服务器环境，不使用 Docker 的场景。

#### 1. 安装依赖

```bash
# 安装 Node.js 依赖
npm ci --production

# 构建应用
npm run build

# 全局安装 PM2
npm install -g pm2
```

#### 2. 启动 OpenSearch (外部服务)

确保你有可用的 OpenSearch 集群，并更新 `.env.production` 中的连接信息。

#### 3. 启动应用

```bash
# 使用 PM2 启动
npm run start:pm2

# 查看应用状态
pm2 status

# 查看日志
pm2 logs pdf-dify-app

# 设置开机自启
pm2 startup
pm2 save
```

## 🔍 健康检查与监控

### 1. 应用健康检查

```bash
# 检查应用状态
curl http://localhost:3000/health

# 检查 OpenSearch 连接
curl http://localhost:3000/dify/opensearch/health
```

### 2. Docker 健康检查

```bash
# 查看容器健康状态
docker-compose ps
docker inspect pdf-dify-app | grep -A 10 "Health"
```

### 3. 日志监控

```bash
# Docker 日志
docker-compose logs -f --tail=100 pdf-dify-app

# PM2 日志
pm2 logs pdf-dify-app --lines 100

# 应用日志文件
tail -f logs/combined.log
tail -f logs/error.log
```

## 🛠️ 运维操作

### 1. 应用更新

#### Docker 方式
```bash
# 拉取最新代码
git pull origin main

# 重新构建并部署
docker-compose build pdf-dify-app
docker-compose up -d pdf-dify-app
```

#### PM2 方式
```bash
# 拉取最新代码
git pull origin main

# 重新构建
npm run build

# 重启应用
pm2 restart pdf-dify-app
```

### 2. 数据备份

```bash
# 备份 SQLite 数据库
cp data/pdf_segments.db backups/pdf_segments_$(date +%Y%m%d_%H%M%S).db

# 备份上传的文件
tar -czf backups/uploads_$(date +%Y%m%d_%H%M%S).tar.gz uploads/

# 备份 OpenSearch 数据 (如果使用 Docker)
docker exec opensearch-node curl -X POST "localhost:9200/_snapshot/backup_repo/snapshot_$(date +%Y%m%d_%H%M%S)?wait_for_completion=true"
```

### 3. 性能调优

#### 应用层面
```bash
# 调整 PM2 实例数量
pm2 scale pdf-dify-app 4

# 调整内存限制
# 编辑 ecosystem.config.json 中的 max_memory_restart
```

#### Docker 层面
```bash
# 调整容器资源限制
# 在 docker-compose.yml 中添加:
deploy:
  resources:
    limits:
      memory: 2G
      cpus: '1.0'
```

## 🔐 安全配置

### 1. 环境变量安全

```bash
# 设置正确的文件权限
chmod 600 .env.production
chown root:root .env.production
```

### 2. 网络安全

- 使用防火墙限制端口访问
- 配置 HTTPS (SSL/TLS)
- 使用反向代理 (Nginx)
- 设置适当的 CORS 策略

### 3. OpenSearch 安全

- 启用身份验证
- 配置 SSL/TLS
- 设置索引权限

## 🚨 故障排除

### 1. 常见问题

#### 应用无法启动
```bash
# 检查环境变量
cat .env.production

# 检查端口占用
lsof -i :3000

# 检查 Docker 容器状态
docker-compose ps
docker-compose logs pdf-dify-app
```

#### OpenSearch 连接失败
```bash
# 测试 OpenSearch 连接
curl -u username:password https://your-opensearch-node:9200/_cluster/health

# 检查网络连通性
ping your-opensearch-node
telnet your-opensearch-node 9200
```

#### 内存不足
```bash
# 检查系统内存
free -h

# 检查 Docker 内存使用
docker stats

# 调整应用内存限制
# 编辑 ecosystem.config.json 或 docker-compose.yml
```

### 2. 性能问题

```bash
# 检查 CPU 使用率
top
htop

# 检查 I/O 性能
iotop

# 检查应用性能指标
pm2 monit  # PM2 方式
docker stats  # Docker 方式
```

## 📊 监控与告警

### 1. 推荐监控工具

- **应用监控**: PM2 Monitor, New Relic, DataDog
- **基础设施监控**: Prometheus + Grafana
- **日志聚合**: ELK Stack, Fluentd
- **错误追踪**: Sentry

### 2. 关键指标

- 响应时间
- 吞吐量 (QPS)
- 错误率
- 内存使用率
- CPU 使用率
- 磁盘使用率

## 🔄 自动化部署

### 1. CI/CD 集成

创建 `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to server
        run: |
          # 你的部署脚本
          ./deploy.sh
```

### 2. 蓝绿部署

```bash
# 使用不同的容器名称实现蓝绿部署
docker-compose -f docker-compose.blue.yml up -d
# 测试新版本
# 切换流量
docker-compose -f docker-compose.green.yml down
```

## 📞 支持与维护

- 定期更新依赖包
- 监控安全漏洞
- 执行性能测试
- 制定灾难恢复计划

---

## 快速命令参考

```bash
# 部署
./deploy.sh

# 查看状态
docker-compose ps
pm2 status

# 查看日志
docker-compose logs -f pdf-dify-app
pm2 logs pdf-dify-app

# 重启服务
docker-compose restart pdf-dify-app
pm2 restart pdf-dify-app

# 健康检查
curl http://localhost:3000/health
curl http://localhost:3000/dify/opensearch/health

# 备份
cp data/pdf_segments.db backups/
```
