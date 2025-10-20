#!/bin/bash

# AI企业需求计算器 - 启动脚本

echo "================================================"
echo "   AI企业需求计算器 - 开发服务器启动"
echo "================================================"
echo ""

# 进入项目目录
cd "$(dirname "$0")"

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "📦 检测到未安装依赖，正在安装..."
    npm install
    echo ""
fi

# 检查环境变量文件
if [ ! -f ".env.local" ]; then
    echo "❌ 错误: .env.local 文件不存在！"
    echo "   请先配置 .env.local 文件"
    exit 1
fi

# 检查数据库文件
if [ ! -f "prisma/dev.db" ]; then
    echo "🗄️  初始化数据库..."
    npx prisma generate
    npx prisma migrate dev --name init
    echo ""
fi

echo "🚀 启动开发服务器..."
echo "   - 前端地址: http://localhost:3000"
echo "   - API地址:  http://localhost:3000/api"
echo ""
echo "💡 提示: 按 Ctrl+C 停止服务器"
echo ""
echo "================================================"
echo ""

# 启动开发服务器
npm run dev
