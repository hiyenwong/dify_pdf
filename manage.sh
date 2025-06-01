#!/bin/bash

# PDF Dify 生产环境管理脚本
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 显示帮助信息
show_help() {
    echo "PDF Dify 生产环境管理脚本"
    echo "=========================="
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "可用命令:"
    echo "  check      - 检查生产环境配置"
    echo "  deploy     - 部署应用"
    echo "  start      - 启动服务"
    echo "  stop       - 停止服务"
    echo "  restart    - 重启服务"
    echo "  status     - 查看服务状态"
    echo "  logs       - 查看日志"
    echo "  health     - 健康检查"
    echo "  backup     - 备份数据"
    echo "  update     - 更新应用"
    echo "  monitor    - 监控服务"
    echo "  cleanup    - 清理未使用的资源"
    echo "  help       - 显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 check     # 检查配置"
    echo "  $0 deploy    # 部署应用"
    echo "  $0 logs      # 查看日志"
}

# 检查配置
check_config() {
    echo -e "${BLUE}🔍 检查生产环境配置...${NC}"
    if [ -f "check-production.sh" ]; then
        chmod +x check-production.sh
        ./check-production.sh
    else
        echo -e "${RED}❌ 配置检查脚本不存在${NC}"
        exit 1
    fi
}

# 部署应用
deploy_app() {
    echo -e "${BLUE}🚀 部署 PDF Dify 应用...${NC}"
    if [ -f "deploy.sh" ]; then
        chmod +x deploy.sh
        ./deploy.sh
    else
        echo -e "${RED}❌ 部署脚本不存在${NC}"
        exit 1
    fi
}

# 启动服务
start_services() {
    echo -e "${BLUE}▶️  启动服务...${NC}"
    docker-compose up -d
    echo -e "${GREEN}✅ 服务已启动${NC}"
}

# 停止服务
stop_services() {
    echo -e "${BLUE}⏹️  停止服务...${NC}"
    docker-compose down
    echo -e "${GREEN}✅ 服务已停止${NC}"
}

# 重启服务
restart_services() {
    echo -e "${BLUE}🔄 重启服务...${NC}"
    docker-compose restart
    echo -e "${GREEN}✅ 服务已重启${NC}"
}

# 查看状态
show_status() {
    echo -e "${BLUE}📊 服务状态${NC}"
    echo "============"
    docker-compose ps
    echo ""
    echo -e "${BLUE}📈 资源使用情况${NC}"
    echo "=============="
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
}

# 查看日志
show_logs() {
    local service=${1:-pdf-dify-app}
    local lines=${2:-100}

    echo -e "${BLUE}📋 查看 $service 日志 (最近 $lines 行)${NC}"
    echo "================================================"
    docker-compose logs --tail=$lines -f $service
}

# 健康检查
health_check() {
    echo -e "${BLUE}🏥 执行健康检查...${NC}"
    echo "=================="

    # 应用健康检查
    echo -n "应用服务: "
    if curl -sf http://localhost:3000/health >/dev/null; then
        echo -e "${GREEN}✅ 健康${NC}"
    else
        echo -e "${RED}❌ 异常${NC}"
    fi

    # OpenSearch 健康检查
    echo -n "OpenSearch: "
    if curl -sf http://localhost:9200/_cluster/health >/dev/null; then
        echo -e "${GREEN}✅ 健康${NC}"
    else
        echo -e "${RED}❌ 异常${NC}"
    fi

    # 检查容器状态
    echo ""
    echo -e "${BLUE}容器状态:${NC}"
    docker-compose ps | grep -E "(Up|Exited|Restarting)"

    # 检查磁盘空间
    echo ""
    echo -e "${BLUE}磁盘使用:${NC}"
    df -h | grep -E "(Filesystem|/dev/)"
}

# 备份数据
backup_data() {
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"

    echo -e "${BLUE}💾 创建数据备份...${NC}"
    mkdir -p "$backup_dir"

    # 备份数据库
    if [ -f "data/pdf_segments.db" ]; then
        cp data/pdf_segments.db "$backup_dir/"
        echo -e "${GREEN}✅ 数据库备份完成${NC}"
    fi

    # 备份上传文件
    if [ -d "uploads" ]; then
        tar -czf "$backup_dir/uploads.tar.gz" uploads/
        echo -e "${GREEN}✅ 上传文件备份完成${NC}"
    fi

    # 备份配置
    cp .env.production "$backup_dir/" 2>/dev/null || true
    cp docker-compose.yml "$backup_dir/" 2>/dev/null || true

    echo -e "${GREEN}🎉 备份完成: $backup_dir${NC}"
}

# 更新应用
update_app() {
    echo -e "${BLUE}🔄 更新应用...${NC}"

    # 拉取最新代码 (如果是git仓库)
    if [ -d ".git" ]; then
        echo "拉取最新代码..."
        git pull origin main
    fi

    # 重新构建并部署
    echo "重新构建镜像..."
    docker-compose build pdf-dify-app

    echo "重启应用..."
    docker-compose up -d pdf-dify-app

    # 等待服务启动
    sleep 10

    # 健康检查
    echo "检查服务状态..."
    health_check
}

# 监控服务
monitor_services() {
    echo -e "${BLUE}📊 监控服务 (按 Ctrl+C 退出)${NC}"
    echo "=============================="

    while true; do
        clear
        echo "PDF Dify 服务监控 - $(date)"
        echo "=========================="

        # 显示容器状态
        echo -e "${BLUE}容器状态:${NC}"
        docker-compose ps

        echo ""
        echo -e "${BLUE}资源使用:${NC}"
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

        echo ""
        echo -e "${BLUE}最新日志 (最近5行):${NC}"
        docker-compose logs --tail=5 pdf-dify-app | tail -5

        sleep 5
    done
}

# 清理资源
cleanup_resources() {
    echo -e "${BLUE}🧹 清理未使用的 Docker 资源...${NC}"

    echo "清理未使用的容器..."
    docker container prune -f

    echo "清理未使用的镜像..."
    docker image prune -f

    echo "清理未使用的网络..."
    docker network prune -f

    echo "清理未使用的卷..."
    docker volume prune -f

    echo -e "${GREEN}✅ 清理完成${NC}"
}

# 主程序
main() {
    case "${1:-help}" in
    "check")
        check_config
        ;;
    "deploy")
        deploy_app
        ;;
    "start")
        start_services
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        restart_services
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs $2 $3
        ;;
    "health")
        health_check
        ;;
    "backup")
        backup_data
        ;;
    "update")
        update_app
        ;;
    "monitor")
        monitor_services
        ;;
    "cleanup")
        cleanup_resources
        ;;
    "help" | *)
        show_help
        ;;
    esac
}

# 检查是否在正确的目录
if [ ! -f "package.json" ] || [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ 请在 PDF Dify 项目根目录下运行此脚本${NC}"
    exit 1
fi

# 执行主程序
main "$@"
