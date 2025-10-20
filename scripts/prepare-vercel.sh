#!/bin/bash
# Vercel 部署前准备脚本
# 自动将 SQLite 配置切换为 PostgreSQL

echo "🔧 准备 Vercel 部署环境..."

# 修改 schema.prisma 为 PostgreSQL
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

echo "✅ 已将数据库配置切换为 PostgreSQL"
cat prisma/schema.prisma | grep provider
