# PDF内容分段与Dify集成工具

🚀 **基于TypeScript的智能PDF处理和LLM集成平台**

本工具提供完整的PDF文档处理解决方案，包括智能内容分段、Dify平台集成、以及完善的API接口，旨在为大型语言模型（LLM）提供高质量的文档内容。

## ✨ 核心功能

### 📄 PDF处理能力
- **智能解析**: 支持复杂PDF文档的文本提取和元数据获取
- **多策略分段**: 提供固定大小、段落感知、语义边界三种分段策略
- **质量保证**: 内置分段质量验证和优化机制
- **流式处理**: 支持大文件的流式响应和处理

### 🧩 Dify平台集成
- **无缝集成**: 原生支持Dify知识库API
- **批量同步**: 高效的批量文档同步机制
- **状态管理**: 完整的同步状态跟踪和管理
- **Webhook支持**: 双向数据同步和事件通知

### 📚 RESTful API
- **完整接口**: 涵盖文档上传、处理、查询、同步的全流程API
- **Swagger文档**: 自动生成的在线API文档
- **流式响应**: 优化大数据量的响应性能
- **错误处理**: 统一的错误处理和日志记录

## 🛠 技术栈

- **运行环境**: Node.js 18+ (LTS)
- **框架**: NestJS (企业级TypeScript框架)
- **数据库**: SQLite (轻量级本地存储)
- **PDF处理**: pdf-parse (高效文本提取)
- **API文档**: Swagger/OpenAPI 3.0
- **测试**: Jest + Supertest
- **日志**: Winston

## 📦 快速开始

### 环境要求

- Node.js 18.0+ (推荐使用LTS版本)
- npm 9.0+ 或 yarn 1.22+

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd pdf-dify-integration
   ```

2. **安装依赖**
   ```bash
   npm install
   # 或使用 yarn
   yarn install
   ```

3. **环境配置**
   ```bash
   cp .env.example .env
   ```
   
   编辑 `.env` 文件，配置必要参数：
   ```env
   # 服务器配置
   NODE_ENV=development
   PORT=3000
   
   # PDF处理配置
   PDF_UPLOAD_DIR=./uploads
   DEFAULT_CHUNK_SIZE=1000
   OVERLAP_SIZE=200
   
   # Dify集成配置
   DIFY_API_BASE_URL=https://api.dify.ai
   DIFY_API_KEY=your_dify_api_key_here
   DIFY_KNOWLEDGE_BASE_ID=your_knowledge_base_id
   ```

4. **创建必要目录**
   ```bash
   mkdir -p uploads data logs
   ```

### 启动应用

#### 开发模式
```bash
npm run start:dev
```

#### 生产模式
```bash
npm run build
npm run start:prod
```

### 访问应用

- **应用主页**: http://localhost:3000
- **Swagger API 文档**: http://localhost:3000/api
- **健康检查**: http://localhost:3000/health

## 📖 API使用指南

### 上传并处理PDF

```bash
curl -X POST http://localhost:3000/pdf/upload \\
  -F "file=@example.pdf" \\
  -F "chunkSize=1000" \\
  -F "overlapSize=200" \\
  -F "segmentationStrategy=paragraph"
```

### 获取文档分段

```bash
curl http://localhost:3000/pdf/{documentId}/segments
```

### 同步到Dify知识库

```bash
curl -X POST http://localhost:3000/dify/sync \\
  -H "Content-Type: application/json" \\
  -d '{
    "documentId": "uuid-here",
    "knowledgeBaseId": "optional-kb-id"
  }'
```

### 查询知识库

```bash
curl -X POST http://localhost:3000/dify/knowledge-base/query \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "查询问题",
    "limit": 5
  }'
```

## 🔧 配置说明

### 环境变量详解

| 变量名                   | 描述         | 默认值                | 必需 |
| ------------------------ | ------------ | --------------------- | ---- |
| `NODE_ENV`               | 运行环境     | `development`         | 否   |
| `PORT`                   | 服务端口     | `3000`                | 否   |
| `PDF_UPLOAD_DIR`         | PDF上传目录  | `./uploads`           | 否   |
| `DEFAULT_CHUNK_SIZE`     | 默认分段大小 | `1000`                | 否   |
| `OVERLAP_SIZE`           | 分段重叠大小 | `200`                 | 否   |
| `DIFY_API_BASE_URL`      | Dify API地址 | `https://api.dify.ai` | 是   |
| `DIFY_API_KEY`           | Dify API密钥 | -                     | 是   |
| `DIFY_KNOWLEDGE_BASE_ID` | Dify知识库ID | -                     | 是   |

### 分段策略说明

1. **固定大小分段 (fixed)**
   - 按指定字符数固定分割
   - 适合标准化处理需求
   - 性能最优

2. **段落感知分段 (paragraph)**
   - 按段落边界智能分割
   - 保持内容完整性
   - 推荐用于大多数场景

3. **语义边界分段 (semantic)**
   - 按语义单元分割
   - 最佳的内容连贯性
   - 适合高质量要求场景

## 🔌 Dify集成配置

### 1. 获取Dify API密钥

1. 登录Dify控制台
2. 进入"设置" → "API密钥"
3. 创建新的API密钥
4. 复制密钥到 `.env` 文件

### 2. 创建知识库

1. 在Dify中创建新的知识库
2. 记录知识库ID
3. 配置到 `.env` 文件

### 3. 配置外部数据源

在Dify知识库设置中添加外部数据源：
```
数据源URL: http://your-server:3000/dify/knowledge-base/external-data/{documentId}
认证方式: 无需认证（或根据需要配置）
```

### 4. 设置Webhook（可选）

配置Dify Webhook指向：
```
http://your-server:3000/dify/knowledge-base/webhook
```

## 🧪 测试

### 运行所有测试
```bash
npm test
```

### 运行测试并查看覆盖率
```bash
npm run test:cov
```

### 运行端到端测试
```bash
npm run test:e2e
```

### 运行特定测试
```bash
npm test -- --testNamePattern="TextSegmentationService"
```

## 📁 项目结构

```
pdf-dify-integration/
├── src/
│   ├── main.ts                 # 应用入口
│   ├── app.module.ts           # 根模块
│   ├── common/                 # 通用组件
│   │   ├── filters/           # 异常过滤器
│   │   └── interceptors/      # 拦截器
│   ├── database/              # 数据库配置
│   │   └── entities/          # 数据实体
│   ├── pdf/                   # PDF处理模块
│   │   ├── controllers/       # PDF控制器
│   │   ├── services/          # PDF服务
│   │   └── dto/              # 数据传输对象
│   └── dify/                  # Dify集成模块
│       ├── controllers/       # Dify控制器
│       ├── services/          # Dify服务
│       └── dto/              # 数据传输对象
├── test/                      # 测试文件
├── uploads/                   # 文件上传目录
├── data/                      # 数据库文件
├── logs/                      # 日志文件
└── docs/                      # 文档目录
```

## 🔍 故障排除

### 常见问题

1. **PDF上传失败**
   - 检查文件大小是否超过限制（默认50MB）
   - 确认文件格式为PDF
   - 检查上传目录权限

2. **Dify同步失败**
   - 验证API密钥是否正确
   - 检查知识库ID是否存在
   - 确认网络连接正常

3. **数据库连接问题**
   - 检查数据库文件路径
   - 确认目录写入权限
   - 查看错误日志

### 日志查看

```bash
# 查看应用日志
tail -f logs/combined.log

# 查看错误日志
tail -f logs/error.log
```

## 🚀 部署指南

### Docker部署

1. **构建镜像**
   ```bash
   docker build -t pdf-dify-integration .
   ```

2. **运行容器**
   ```bash
   docker run -d \\
     --name pdf-dify \\
     -p 3000:3000 \\
     -v $(pwd)/uploads:/app/uploads \\
     -v $(pwd)/data:/app/data \\
     -v $(pwd)/logs:/app/logs \\
     --env-file .env \\
     pdf-dify-integration
   ```

### PM2部署

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start dist/main.js --name pdf-dify

# 查看状态
pm2 status

# 查看日志
pm2 logs pdf-dify
```

## 📈 性能优化

### 建议配置

1. **生产环境优化**
   ```env
   NODE_ENV=production
   LOG_LEVEL=warn
   ```

2. **内存优化**
   - 大文件处理时使用流式操作
   - 定期清理临时文件
   - 合理设置分段大小

3. **网络优化**
   - 启用压缩中间件
   - 配置适当的超时时间
   - 使用连接池

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 支持

- **文档**: 查看完整的 [API文档](http://localhost:3000/api)
- **问题报告**: 在 GitHub 上创建 Issue
- **功能请求**: 在 GitHub 上创建 Feature Request

---

**PDF内容分段与Dify集成工具** - 让您的文档内容为AI时代做好准备！
