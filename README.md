# PDF-Dify: 智能PDF处理与知识库集成平台

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green.svg" alt="Node.js">
  <img src="https://img.shields.io/badge/TypeScript-5.0+-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/NestJS-10+-red.svg" alt="NestJS">
  <img src="https://img.shields.io/badge/OpenSearch-2.0+-orange.svg" alt="OpenSearch">
  <img src="https://img.shields.io/badge/Docker-Ready-blue.svg" alt="Docker">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License">
</div>

## ⭐ 项目亮点

PDF-Dify 是一个基于 NestJS 构建的智能PDF处理平台，支持：

- 🔍 **智能PDF解析** - 多种分段策略，精准提取文档内容
- 🔄 **双存储架构** - SQLite + OpenSearch，结构化存储 + 全文检索
- 🚀 **Dify集成** - 无缝对接Dify平台，快速构建AI应用
- 📊 **RESTful API** - 完整的API接口，支持各种集成场景
- 🐳 **容器化部署** - Docker支持，一键部署到生产环境

## 🎯 核心功能

### PDF处理引擎
- 支持多种PDF格式解析
- 智能文本分段（固定大小、段落感知、语义边界）
- 元数据提取和管理
- 流式处理，支持大文件

### 知识库管理
- OpenSearch全文搜索
- 语义检索和高亮显示
- 文档版本控制
- 批量数据同步

### Dify平台集成
- 自动同步到Dify知识库
- 状态监控和错误处理
- Webhook支持
- 批量操作接口

## 🚀 快速开始

### 环境要求
- Node.js 18+
- Docker & Docker Compose
- OpenSearch 2.0+

### 一键部署
```bash
# 克隆项目
git clone https://github.com/yourusername/pdf-dify.git
cd pdf-dify

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置必要的配置

# 检查生产环境配置
./check-production.sh

# 一键部署
./deploy.sh
```

### 本地开发
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run start:dev

# 访问API文档
open http://localhost:3000/api
```

## 📊 API示例

### 上传PDF文档
```bash
curl -X POST http://localhost:3000/pdf/upload \
  -F "file=@example.pdf" \
  -F "segmentationStrategy=paragraph"
```

### 同步到OpenSearch
```bash
curl -X POST http://localhost:3000/dify/opensearch/sync \
  -H "Content-Type: application/json" \
  -d '{"pdfDocumentId": "doc-123", "force": true}'
```

### 知识库查询
```bash
curl -X POST http://localhost:3000/dify/knowledge-base/query \
  -H "Content-Type: application/json" \
  -d '{"query": "机器学习", "size": 10}'
```

## 🏗️ 技术架构

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   NestJS API    │    │     SQLite       │    │   OpenSearch    │
│                 │───▶│  (结构化存储)    │    │   (全文检索)    │
│  - PDF解析      │    │  - 文档元数据    │◀──▶│  - 文档索引     │
│  - 文本分段     │    │  - 分段信息      │    │  - 搜索查询     │
│  - API接口      │    │  - 同步状态      │    │  - 高亮显示     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │
        ▼
┌─────────────────┐
│   Dify平台      │
│  - 知识库管理   │
│  - AI应用构建   │
│  - 对话接口     │
└─────────────────┘
```

## 📈 性能特性

- ⚡ **高性能**: 支持并发PDF处理，OpenSearch毫秒级查询
- 🔄 **高可靠**: 完整的错误处理和重试机制
- 📊 **可监控**: 详细的日志记录和健康检查
- 🔧 **易扩展**: 模块化设计，支持自定义处理策略

## 🛠️ 开发指南

### 项目结构
```
src/
├── pdf/                 # PDF处理模块
├── dify/               # Dify集成模块  
├── opensearch/         # OpenSearch服务
├── database/           # 数据库实体
└── main.ts            # 应用入口
```

### 添加新的分段策略
```typescript
// 实现 TextSegmentationStrategy 接口
export class CustomSegmentationStrategy implements TextSegmentationStrategy {
  segment(text: string, options: SegmentationOptions): TextSegment[] {
    // 自定义分段逻辑
  }
}
```

## 🤝 贡献指南

我们欢迎所有形式的贡献！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情


## 📞 联系我们

- 项目主页: https://github.com/yourusername/pdf-dify
- 问题反馈: https://github.com/yourusername/pdf-dify/issues
- 讨论交流: https://github.com/yourusername/pdf-dify/discussions

---

⭐ 如果这个项目对您有帮助，请给我们一个星标！
