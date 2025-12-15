# Vercel 部署指南

本文档提供 AI企业需求计算器 项目在 Vercel 平台的完整部署流程。

---

## 📋 前置准备

### 1. 注册 Vercel 账号
- 访问 [vercel.com](https://vercel.com)
- 使用 GitHub 账号登录（推荐）

### 2. 准备环境变量
您需要准备以下环境变量的值：
- `QIANFAN_API_KEY`: 百度千帆 API 密钥
- `JWT_SECRET`: JWT 密钥（任意32位以上随机字符串）
- `DATABASE_URL`: PostgreSQL 数据库连接字符串（稍后在 Vercel 中创建）

---

## 🚀 部署步骤

### 步骤 1: 导入 GitHub 仓库到 Vercel

1. 登录 Vercel 控制台
2. 点击 **"Add New Project"**
3. 选择 **"Import Git Repository"**
4. 找到您的仓库 `ethan7zhanghx/ai-calculator`
5. 点击 **"Import"**

### 步骤 2: 配置项目

在导入页面：

1. **Project Name**: 可以保持默认或自定义
2. **Framework Preset**: Vercel 会自动检测为 Next.js
3. **Root Directory**: 保持默认 `./`
4. **Build Command**: 自动设置为 `prisma generate && next build`
5. **Output Directory**: 自动设置为 `.next`

### 步骤 3: 创建 Vercel Postgres 数据库

**重要**: 必须先创建数据库，才能获得 `DATABASE_URL`

1. 在项目配置页面，点击顶部导航 **"Storage"** 标签
2. 点击 **"Create Database"**
3. 选择 **"Postgres"**
4. 选择 **"Hobby"** 免费计划（256 MB 存储）
5. 选择区域（建议选择 **Hong Kong** 以获得更快速度）
6. 点击 **"Create"**
7. 创建成功后，Vercel 会自动添加以下环境变量：
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL` ⭐ **这个就是您需要的 DATABASE_URL**
   - `POSTGRES_URL_NON_POOLING`
   - 其他相关变量

### 步骤 4: 配置环境变量

1. 在项目配置页面，找到 **"Environment Variables"** 部分
2. 添加以下环境变量：

| Key | Value | 说明 |
|-----|-------|------|
| `DATABASE_URL` | `$POSTGRES_PRISMA_URL` | 使用 Vercel 提供的引用 |
| `QIANFAN_API_KEY` | 您的千帆 API Key | 从百度智能云控制台获取 |
| `JWT_SECRET` | 随机生成的32位字符串 | 例如: `your-super-secret-jwt-key-min-32-chars` |

**注意**:
- `DATABASE_URL` 直接填写 `$POSTGRES_PRISMA_URL`，Vercel 会自动引用之前创建的数据库连接
- 确保所有环境变量应用到 **Production**, **Preview**, 和 **Development** 环境

### 步骤 5: 部署项目

1. 检查所有配置无误后，点击 **"Deploy"**
2. Vercel 会自动执行以下流程：
   - 克隆代码
   - 安装依赖 (`npm install`)
   - 生成 Prisma Client (`prisma generate`)
   - 构建 Next.js 应用 (`next build`)
   - 部署到全球 CDN

3. 等待 2-3 分钟，部署完成后会显示：
   - ✅ **Deployment Ready**
   - 🔗 **项目 URL**: `https://your-project.vercel.app`

### 步骤 6: 运行数据库迁移

**重要**: 首次部署后必须运行迁移以创建数据库表

有两种方式：

#### 方式 A: 使用 Vercel CLI（推荐）

1. 安装 Vercel CLI:
```bash
npm i -g vercel
```

2. 登录 Vercel:
```bash
vercel login
```

3. 链接项目:
```bash
cd /Users/zhanghaoxin/Desktop/Baidu/AI企业需求计算器/ai-calculator
vercel link
```

4. 拉取环境变量:
```bash
vercel env pull .env.production
```

5. 运行数据库迁移:
```bash
DATABASE_URL=$(grep DATABASE_URL .env.production | cut -d '=' -f2-) npx prisma migrate deploy
```

#### 方式 B: 使用 Prisma Data Platform

1. 访问 [Prisma Data Platform](https://cloud.prisma.io/)
2. 导入您的 Vercel Postgres 数据库
3. 在 Prisma Studio 中手动运行迁移 SQL

---

## ✅ 验证部署

### 1. 检查网站是否正常访问
访问 Vercel 提供的 URL，应该能看到登录页面。

### 2. 测试登录功能
1. 点击 "注册新账号"
2. 输入手机号和密码
3. 检查是否能成功注册（验证数据库写入）

### 3. 测试评估功能
1. 登录后填写评估表单
2. 提交评估
3. 检查是否能看到完整的评估结果（验证 API 调用）

---

## 🔧 常见问题

### Q1: 部署失败，提示 "Prisma Client" 错误
**解决方案**: 确保 `vercel.json` 中的 `buildCommand` 包含 `prisma generate`:
```json
"buildCommand": "prisma generate && next build"
```

### Q2: 运行时报错 "Can't reach database server"
**解决方案**:
1. 检查 `DATABASE_URL` 环境变量是否正确设置
2. 确保使用的是 `$POSTGRES_PRISMA_URL` 而不是 `$POSTGRES_URL`
3. 验证是否已运行数据库迁移

### Q3: API 调用失败，提示 "QIANFAN_API_KEY not found"
**解决方案**:
1. 在 Vercel 项目设置 → Environment Variables 中检查是否已添加
2. 确保环境变量应用到了 Production 环境
3. 重新部署项目以使环境变量生效

### Q4: 数据库迁移失败
**解决方案**:
1. 确保 DATABASE_URL 指向正确的 Vercel Postgres 数据库
2. 尝试使用 `prisma db push` 而不是 `migrate deploy`:
```bash
DATABASE_URL=$(grep DATABASE_URL .env.production | cut -d '=' -f2-) npx prisma db push
```

### Q5: 免费额度够用吗？
**答案**: 对于中小规模使用完全够用
- Vercel Hobby: 100 GB 流量/月 + 100 小时函数执行时间
- Vercel Postgres: 256 MB 存储 + 60 小时计算时间/月
- 超出后会收到通知，可以选择升级或优化

---

## 📊 监控和维护

### 查看部署日志
1. 进入 Vercel 项目控制台
2. 点击 **"Deployments"**
3. 选择任意部署记录，查看详细日志

### 查看实时日志
1. 点击 **"Logs"** 标签
2. 可以看到实时的函数执行日志
3. 有助于调试 API 错误

### 查看数据库使用情况
1. 点击 **"Storage"** 标签
2. 选择您的 Postgres 数据库
3. 查看存储和计算时间使用情况

### 自动部署
- 每次推送到 GitHub `main` 分支，Vercel 会自动触发部署
- 可以在 Vercel 项目设置中配置部署分支

---

## 🎉 完成！

您的 AI企业需求计算器 现在已经成功部署到 Vercel！

**下一步**:
- 绑定自定义域名（可选）
- 配置分析工具（Vercel Analytics）
- 设置 Cron Jobs（定期任务）
- 启用 Edge Middleware（性能优化）

如有问题，请参考 [Vercel 官方文档](https://vercel.com/docs)。
