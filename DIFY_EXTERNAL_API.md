# Dify外部知识库API集成

本项目已实现符合Dify外部知识库API规范的接口，可以作为Dify的外部知识库数据源。

## 🚀 快速开始

### 1. 启动应用
```bash
npm run start:dev
```

### 2. 测试API
```bash
./test-dify-api.sh
```

### 3. 在Dify中配置
- API端点: `https://your-domain/dify-pdf/dify/retrieval`
- API Key: 在环境变量中配置

## 📋 主要功能

### 1. 检索接口 (核心功能)
符合Dify外部知识库API规范的检索端点，用于连接团队内独立维护的知识库。

**端点**: `POST /dify/retrieval`

**认证**: Bearer Token (在Authorization头中)

**请求体**:
```json
{
  "knowledge_id": "your-knowledge-id",
  "query": "你的问题",
  "retrieval_setting": {
    "top_k": 5,
    "score_threshold": 0.5
  },
  "metadata_condition": {
    "logical_operator": "and",
    "conditions": [
      {
        "name": ["category"],
        "comparison_operator": "contains",
        "value": "AI"
      }
    ]
  }
}
```

**响应格式**:
```json
{
  "records": [
    {
      "content": "这是外部知识的文档内容。",
      "score": 0.98,
      "title": "文档片段 1",
      "metadata": {
        "document_id": "uuid",
        "segment_index": 1,
        "start_page": 1,
        "end_page": 1,
        "segmentation_type": "fixed_size",
        "word_count": 100,
        "character_count": 500,
        "path": "",
        "created_at": "2025-06-06T15:30:00.000Z"
      }
    }
  ]
}
```

### 2. 其他管理接口

- `GET /dify/knowledge-base/documents` - 获取已同步的文档列表
- `GET /dify/knowledge-base/stats` - 获取知识库统计信息
- `POST /dify/knowledge-base/query` - 内部查询接口
- `POST /dify/knowledge-base/webhook` - Dify回调接口

## ⚙️ 配置说明

### 环境变量
在 `.env.production` 中配置以下变量：

```env
# Dify集成配置
DIFY_API_BASE_URL=https://api.dify.ai
DIFY_API_KEY=your_production_dify_api_key_here
DIFY_KNOWLEDGE_BASE_ID=your_production_knowledge_base_id
```

### Nginx反向代理配置
```nginx
location /dify-pdf/ {
    proxy_pass http://localhost:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_redirect off;
}
```

## 🔧 在Dify中配置外部知识库

### 步骤1: 创建外部知识库
1. 登录Dify控制台
2. 进入知识库管理
3. 选择"外部知识库"
4. 点击"创建"

### 步骤2: 配置API信息
```
API端点: https://your-domain/dify-pdf/dify/retrieval
HTTP方法: POST
认证方式: Bearer Token
API密钥: [从环境变量DIFY_API_KEY获取]
```

### 步骤3: 测试连接
使用Dify提供的测试功能验证连接是否正常。

### 步骤4: 配置检索参数
```json
{
  "top_k": 5,
  "score_threshold": 0.3
}
```

## 🛡️ 安全配置

### API密钥管理
```bash
# 生成安全的API密钥
openssl rand -hex 32

# 在环境变量中设置
export DIFY_API_KEY="your-secure-api-key"
```

### CORS配置
在`.env.production`中配置：
```env
CORS_ORIGIN=https://your-dify-domain.com
```

## 🚨 错误代码说明

| 错误代码 | HTTP状态码 | 说明                        |
| -------- | ---------- | --------------------------- |
| 1001     | 403        | 无效的 Authorization 头格式 |
| 1002     | 403        | 授权失败                    |
| 2001     | 404        | 知识库不存在                |
| 500      | 500        | 内部服务器错误              |

## 🧪 测试

### 使用测试脚本
```bash
# 编辑脚本中的API_KEY
vim test-dify-api.sh

# 运行测试
./test-dify-api.sh
```

### 手动测试检索接口
```bash
curl -X POST "http://localhost:3000/dify/retrieval" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "knowledge_id": "test-kb-001",
    "query": "AI",
    "retrieval_setting": {
      "top_k": 3,
      "score_threshold": 0.3
    }
  }'
```

## 📋 API接口规范遵循

本实现严格遵循Dify官方文档：
https://docs.dify.ai/zh-hans/guides/knowledge-base/api-documentation/external-knowledge-api-documentation

### ✅ 已实现功能
- [x] 支持 `knowledge_id` 参数
- [x] 支持 `query` 查询文本
- [x] 支持 `retrieval_setting` 检索参数
- [x] 支持 `metadata_condition` 元数据过滤
- [x] 支持Bearer Token认证
- [x] 返回 `records` 数组
- [x] 每个记录包含 `content`, `score`, `title`, `metadata`
- [x] 支持自定义元数据字段
- [x] 标准HTTP状态码
- [x] Dify规范的错误格式
- [x] 详细的错误描述

### 🔮 未来扩展
- [ ] 向量相似度搜索
- [ ] 更复杂的元数据过滤
- [ ] 缓存机制
- [ ] 更精确的相关性评分
- [ ] 多语言支持优化

## 🚀 部署注意事项

### 开发环境
1. 确保Node.js版本 >= 16
2. 安装依赖: `npm install`
3. 配置环境变量
4. 启动: `npm run start:dev`

### 生产环境
1. 使用PM2管理进程
2. 配置Nginx反向代理
3. 设置SSL证书
4. 监控日志和性能
5. 定期备份数据库

### 监控检查
```bash
# 检查应用状态
curl http://localhost:3000/dify/knowledge-base/stats

# 检查API响应时间
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/dify/retrieval
```

## 📖 相关文档

- [Dify外部知识库API官方文档](https://docs.dify.ai/zh-hans/guides/knowledge-base/api-documentation/external-knowledge-api-documentation)
- [项目部署指南](PRODUCTION_DEPLOYMENT.md)
- [快速开始指南](QUICK_START.md)

## 🆘 故障排除

### 常见问题

1. **API返回403错误**
   - 检查API密钥是否正确
   - 确认Authorization头格式: `Bearer your-api-key`

2. **检索返回空结果**
   - 检查数据库中是否有文档数据
   - 降低score_threshold值
   - 使用更通用的查询词

3. **连接超时**
   - 检查应用是否正常运行
   - 确认端口3000是否可访问
   - 检查防火墙设置

### 日志查看
```bash
# 查看应用日志
tail -f logs/combined.log

# 查看错误日志
tail -f logs/error.log
```
