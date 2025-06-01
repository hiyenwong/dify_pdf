# 🚀 PDF-Dify 生产环境快速部署指南

## 🎯 一键部署步骤

### 1. 环境检查
```bash
# 检查生产环境配置
./check-production.sh
```

### 2. 配置环境变量
编辑 `.env.production` 文件，更新以下关键配置：
```bash
# 必须更新的配置
DIFY_API_KEY=your_actual_dify_api_key
DIFY_KNOWLEDGE_BASE_ID=your_actual_knowledge_base_id
OPENSEARCH_NODE=https://your-opensearch-cluster:9200
OPENSEARCH_USERNAME=your_opensearch_username
OPENSEARCH_PASSWORD=your_opensearch_password
CORS_ORIGIN=https://your-frontend-domain.com
```

### 3. 一键部署
```bash
# 完整部署
./deploy.sh
```

## 🛠️ 管理命令

使用 `manage.sh` 脚本进行日常管理：

```bash
# 基础操作
./manage.sh check      # 检查配置
./manage.sh deploy     # 部署应用
./manage.sh start      # 启动服务
./manage.sh stop       # 停止服务
./manage.sh restart    # 重启服务

# 监控和调试
./manage.sh status     # 查看状态
./manage.sh logs       # 查看日志
./manage.sh health     # 健康检查
./manage.sh monitor    # 实时监控

# 维护操作
./manage.sh backup     # 备份数据
./manage.sh update     # 更新应用
./manage.sh cleanup    # 清理资源
```

## 📊 服务访问地址

部署成功后，可以通过以下地址访问服务：

- **应用 API**: http://localhost:3000
- **Swagger 文档**: http://localhost:3000/api
- **OpenSearch**: http://localhost:9200
- **OpenSearch Dashboards**: http://localhost:5601

## 🔧 常用命令

### Docker 操作
```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f pdf-dify-app

# 进入容器
docker-compose exec pdf-dify-app sh

# 重启特定服务
docker-compose restart pdf-dify-app
```

### 应用测试
```bash
# 健康检查
curl http://localhost:3000/health

# OpenSearch 健康检查
curl http://localhost:9200/_cluster/health

# 测试 API
curl -X GET http://localhost:3000/api
```

## 🚨 故障排除

### 常见问题及解决方案

1. **容器无法启动**
   ```bash
   # 查看详细日志
   docker-compose logs pdf-dify-app
   
   # 检查端口占用
   lsof -i :3000
   ```

2. **OpenSearch 连接失败**
   ```bash
   # 检查 OpenSearch 状态
   docker-compose logs opensearch
   
   # 测试连接
   curl http://localhost:9200/_cluster/health
   ```

3. **内存不足**
   ```bash
   # 检查系统资源
   docker stats
   free -h
   
   # 调整容器资源限制
   # 编辑 docker-compose.yml
   ```

## 📚 详细文档

更多详细信息请参考：
- [完整部署指南](PRODUCTION_DEPLOYMENT.md)
- [OpenSearch 集成指南](docs/opensearch-guide.md)

## 🔄 更新流程

```bash
# 拉取最新代码 (如果使用 Git)
git pull origin main

# 使用管理脚本更新
./manage.sh update

# 或手动更新
docker-compose build pdf-dify-app
docker-compose up -d pdf-dify-app
```

## 💾 备份策略

```bash
# 创建备份
./manage.sh backup

# 手动备份数据库
cp data/pdf_segments.db backups/

# 备份上传文件
tar -czf backups/uploads_$(date +%Y%m%d).tar.gz uploads/
```

## 🔐 安全建议

1. **环境变量安全**
   ```bash
   chmod 600 .env.production
   ```

2. **网络安全**
   - 配置防火墙
   - 使用 HTTPS
   - 设置强密码

3. **定期更新**
   - 更新依赖包
   - 更新 Docker 镜像
   - 应用安全补丁

## 📞 支持

如果遇到问题：
1. 查看 [故障排除指南](PRODUCTION_DEPLOYMENT.md#故障排除)
2. 检查日志文件
3. 使用健康检查命令

---

🎉 **恭喜！你的 PDF-Dify 应用已成功部署到生产环境！**
