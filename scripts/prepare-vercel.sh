#!/bin/bash
# Vercel 部署前准备脚本
# 使用生产环境专用的 PostgreSQL schema

set -e  # 遇到错误立即退出

echo "🔧 准备 Vercel 部署环境..."

# 使用生产环境的 schema
echo "📝 使用生产环境 schema (PostgreSQL)"
cp prisma/schema.production.prisma prisma/schema.prisma

echo "✅ 已切换到生产环境数据库配置"
echo "📊 当前 provider: $(grep 'provider =' prisma/schema.prisma | head -1)"
