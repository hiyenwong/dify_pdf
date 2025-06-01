#!/bin/bash

# 生产环境配置检查脚本
set -e

echo "🔍 PDF Dify 生产环境配置检查"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

check_required() {
    local name=$1
    local command=$2
    echo -n "检查 $name... "
    if command -v $command &>/dev/null; then
        echo -e "${GREEN}✅ 已安装${NC}"
        $command --version | head -1
    else
        echo -e "${RED}❌ 未安装${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    echo ""
}

check_file() {
    local file=$1
    local description=$2
    echo -n "检查 $description... "
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ 存在${NC}"
    else
        echo -e "${RED}❌ 不存在${NC}"
        ERRORS=$((ERRORS + 1))
    fi
}

check_env_var() {
    local file=$1
    local var=$2
    local description=$3
    echo -n "检查 $description... "
    if grep -q "^$var=" "$file" 2>/dev/null; then
        local value=$(grep "^$var=" "$file" | cut -d'=' -f2)
        if [[ "$value" == *"your_"* ]] || [[ "$value" == *"localhost"* ]] || [[ "$value" == "" ]]; then
            echo -e "${YELLOW}⚠️  需要配置${NC} ($value)"
            WARNINGS=$((WARNINGS + 1))
        else
            echo -e "${GREEN}✅ 已配置${NC}"
        fi
    else
        echo -e "${RED}❌ 未设置${NC}"
        ERRORS=$((ERRORS + 1))
    fi
}

check_directory() {
    local dir=$1
    local description=$2
    echo -n "检查 $description... "
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✅ 存在${NC}"
    else
        echo -e "${YELLOW}⚠️  不存在，将自动创建${NC}"
        mkdir -p "$dir"
        WARNINGS=$((WARNINGS + 1))
    fi
}

echo -e "${BLUE}1. 检查必要软件${NC}"
echo "---------------"
check_required "Docker" "docker"
check_required "Docker Compose" "docker-compose"
check_required "Node.js" "node"
check_required "npm" "npm"

echo -e "${BLUE}2. 检查配置文件${NC}"
echo "---------------"
check_file ".env.production" "生产环境配置文件"
check_file "docker-compose.yml" "Docker Compose 配置"
check_file "Dockerfile" "Docker 构建文件"
check_file "package.json" "Node.js 配置文件"

echo -e "${BLUE}3. 检查目录结构${NC}"
echo "---------------"
check_directory "uploads" "上传目录"
check_directory "data" "数据目录"
check_directory "logs" "日志目录"
check_directory "nginx/ssl" "SSL 证书目录"

if [ -f ".env.production" ]; then
    echo -e "${BLUE}4. 检查环境变量配置${NC}"
    echo "--------------------"
    check_env_var ".env.production" "DIFY_API_KEY" "Dify API密钥"
    check_env_var ".env.production" "DIFY_KNOWLEDGE_BASE_ID" "Dify知识库ID"
    check_env_var ".env.production" "OPENSEARCH_NODE" "OpenSearch节点地址"
    check_env_var ".env.production" "OPENSEARCH_USERNAME" "OpenSearch用户名"
    check_env_var ".env.production" "OPENSEARCH_PASSWORD" "OpenSearch密码"
    check_env_var ".env.production" "CORS_ORIGIN" "CORS域名配置"
fi

echo -e "${BLUE}5. 检查网络连接${NC}"
echo "---------------"
echo -n "检查互联网连接... "
if ping -c 1 google.com &>/dev/null; then
    echo -e "${GREEN}✅ 正常${NC}"
else
    echo -e "${YELLOW}⚠️  可能有问题${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo -n "检查 Docker 服务... "
if docker info &>/dev/null; then
    echo -e "${GREEN}✅ 运行中${NC}"
else
    echo -e "${RED}❌ 未运行${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "================================"
echo -e "${BLUE}检查结果汇总${NC}"
echo "================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 所有检查都通过！可以开始部署。${NC}"
    echo ""
    echo "推荐的部署命令："
    echo -e "${GREEN}./deploy.sh${NC}"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  有 $WARNINGS 个警告，建议修复后再部署。${NC}"
    echo ""
    echo "如果确认配置无误，可以继续部署："
    echo -e "${YELLOW}./deploy.sh${NC}"
else
    echo -e "${RED}❌ 发现 $ERRORS 个错误和 $WARNINGS 个警告，请先修复再部署。${NC}"
    echo ""
    echo "修复建议："
    if [ $ERRORS -gt 0 ]; then
        echo "1. 安装缺失的软件包"
        echo "2. 创建缺失的配置文件"
        echo "3. 检查文件权限"
    fi
    if [ $WARNINGS -gt 0 ]; then
        echo "4. 更新生产环境变量配置"
        echo "5. 配置SSL证书（如需要）"
    fi
fi

echo ""
echo "更多帮助信息请查看: PRODUCTION_DEPLOYMENT.md"
