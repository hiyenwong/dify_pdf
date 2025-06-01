#!/bin/bash

# PDF Dify 生产环境部署脚本
set -e

echo "🚀 开始部署 PDF Dify 应用到生产环境..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查Docker是否安装
if ! command -v docker &>/dev/null; then
    echo -e "${RED}❌ Docker 未安装，请先安装 Docker${NC}"
    exit 1
fi

# 检查Docker Compose是否安装
if ! command -v docker-compose &>/dev/null; then
    echo -e "${RED}❌ Docker Compose 未安装，请先安装 Docker Compose${NC}"
    exit 1
fi

# 创建必要的目录
echo -e "${YELLOW}📁 创建必要的目录...${NC}"
mkdir -p uploads data logs nginx/ssl

# 设置正确的权限
chmod 755 uploads data logs
chmod 644 .env.production

# 检查环境配置文件
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ .env.production 文件不存在，请先配置生产环境变量${NC}"
    exit 1
fi

# 构建应用
echo -e "${YELLOW}🔨 构建应用镜像...${NC}"
docker-compose build

# 停止现有服务 (如果存在)
echo -e "${YELLOW}🛑 停止现有服务...${NC}"
docker-compose down --volumes --remove-orphans

# 启动服务
echo -e "${YELLOW}🚀 启动生产环境服务...${NC}"
docker-compose up -d

# 等待服务启动
echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
sleep 30

# 检查服务状态
echo -e "${YELLOW}🔍 检查服务状态...${NC}"
docker-compose ps

# 健康检查
echo -e "${YELLOW}🏥 执行健康检查...${NC}"
if curl -f http://localhost:3000/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 应用健康检查通过${NC}"
else
    echo -e "${RED}❌ 应用健康检查失败${NC}"
    echo "查看日志："
    docker-compose logs pdf-dify-app
    exit 1
fi

# OpenSearch 健康检查
echo -e "${YELLOW}🔍 检查 OpenSearch 状态...${NC}"
if curl -f http://localhost:9200/_cluster/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ OpenSearch 健康检查通过${NC}"
else
    echo -e "${YELLOW}⚠️  OpenSearch 可能仍在启动中，请稍后检查${NC}"
fi

echo -e "${GREEN}🎉 部署完成！${NC}"
echo ""
echo "服务访问地址："
echo "  📱 应用主页: http://localhost:3000"
echo "  📚 API文档: http://localhost:3000/api"
echo "  🔍 OpenSearch: http://localhost:9200"
echo "  📊 OpenSearch Dashboards: http://localhost:5601"
echo ""
echo "常用命令："
echo "  查看日志: docker-compose logs -f"
echo "  重启服务: docker-compose restart"
echo "  停止服务: docker-compose down"
echo "  查看状态: docker-compose ps"

echo ""
echo -e "${YELLOW}⚠️  重要提醒：${NC}"
echo "1. 请更新 .env.production 中的真实配置"
echo "2. 配置SSL证书到 nginx/ssl/ 目录"
echo "3. 修改 nginx.conf 中的域名配置"
echo "4. 考虑设置防火墙规则"
echo "5. 定期备份数据卷"
