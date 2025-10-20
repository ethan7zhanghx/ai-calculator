# 本地开发环境配置指南

本文档帮助团队成员快速搭建本地开发环境。

---

## 📋 前置要求

- **Node.js** 18.x 或更高版本
- **npm** 或 **yarn**
- **Git**

---

## 🚀 快速开始（5 分钟）

### 1️⃣ 克隆仓库

```bash
git clone https://github.com/ethan7zhanghx/ai-calculator.git
cd ai-calculator
```

### 2️⃣ 安装依赖

```bash
npm install --legacy-peer-deps
```

> **注意**: 必须使用 `--legacy-peer-deps` 标志，因为项目使用了 React 19。

### 3️⃣ 配置环境变量

复制环境变量模板文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入真实的配置：

```bash
# 数据库连接（本地开发使用 SQLite 即可）
DATABASE_URL="file:./dev.db"

# 百度千帆 API 密钥（必填）
QIANFAN_API_KEY="your_actual_api_key_here"

# JWT 密钥（必填，任意 32 位以上随机字符串）
JWT_SECRET="your-local-jwt-secret-key-change-this"
JWT_EXPIRES_IN="7d"
```

**获取 QIANFAN_API_KEY**：
1. 访问 [百度智能云控制台](https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application)
2. 创建应用并获取 API Key 和 Secret Key
3. 将 API Key 填入 `.env` 文件

### 4️⃣ 初始化数据库

```bash
npx prisma generate
npx prisma db push
```

这会：
- 生成 Prisma Client
- 创建本地 SQLite 数据库（`prisma/dev.db`）
- 创建所有数据表

**无需安装 PostgreSQL！本地开发使用 SQLite，零配置！**

### 5️⃣ 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 即可看到应用！

---

## 🗄️ 数据库说明

**本地开发**：使用 **SQLite**（零配置，开箱即用）
- ✅ 无需安装数据库软件
- ✅ 数据存储在本地文件 `prisma/dev.db`
- ✅ 适合快速开发和测试

**生产环境（Vercel）**：使用 **PostgreSQL**
- 🚀 Vercel 部署时自动切换
- 🔒 使用 Prisma Accelerate 云数据库
- 📊 支持多用户并发访问

**您不需要关心生产环境的数据库配置**，clone 代码后直接运行即可！

---

## 🔍 常见问题

### Q1: `npm install` 失败，提示依赖冲突

**解决方案**：必须使用 `--legacy-peer-deps` 标志
```bash
npm install --legacy-peer-deps
```

### Q2: 提示 "Environment variable not found: DATABASE_URL"

**解决方案**：确保已创建 `.env` 文件
```bash
cp .env.example .env
# 然后编辑 .env 文件填入配置
```

### Q3: 提示 "Prisma Client could not be generated"

**解决方案**：运行生成命令
```bash
npx prisma generate
```

### Q4: 数据库表不存在

**解决方案**：
- 使用 SQLite: `npx prisma db push`
- 使用 PostgreSQL: `npx prisma migrate dev`

### Q5: API 调用失败，提示 "QIANFAN_API_KEY not found"

**解决方案**：检查 `.env` 文件中是否正确配置了 `QIANFAN_API_KEY`

### Q6: ⚠️ `.env` 文件格式错误（重要）

**错误示例**：
```bash
DATABASE_URL="file:./dev.db"
#JWT Secret （请在生产环境中使用强密码）    # ❌ 错误：注释后面直接跟变量
JWT_SECRET="your-secret-key"
```

**正确格式**：
```bash
# 数据库连接
DATABASE_URL="file:./dev.db"

# JWT 密钥（注释必须单独一行）
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# 百度千帆 API 密钥
QIANFAN_API_KEY="your_api_key_here"
```

**关键点**：
- ✅ 每个注释必须单独一行
- ✅ 变量定义前不能有注释
- ✅ 确保没有多余的空格和特殊字符
- ✅ 建议使用 `cp .env.example .env` 复制模板

### Q7: 数据库文件损坏或需要重置

**解决方案**：删除 SQLite 数据库文件并重新初始化

```bash
# 删除旧的数据库文件
rm prisma/dev.db

# 重新初始化
npx prisma db push
```

**注意**：这会删除所有本地数据！生产环境数据不受影响。

---

## 📂 项目结构

```
ai-calculator/
├── app/                    # Next.js 15 App Router
│   ├── api/               # API 路由
│   │   ├── auth/         # 认证相关 API
│   │   └── evaluate/     # 评估相关 API
│   └── page.tsx          # 主页面
├── components/            # React 组件
├── lib/                   # 工具函数和配置
│   ├── prisma.ts         # Prisma Client
│   ├── jwt.ts            # JWT 工具
│   ├── technical-evaluator.ts  # 技术评估
│   └── business-evaluator.ts   # 商业评估
├── prisma/               # 数据库相关
│   ├── schema.prisma     # 数据模型
│   └── migrations/       # 迁移文件
└── .env                  # 环境变量（需自行创建）
```

---

## 🛠️ 开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（带热重载） |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |
| `npx prisma studio` | 打开数据库可视化工具 |
| `npx prisma generate` | 生成 Prisma Client |
| `npx prisma db push` | 同步数据库结构（本地开发） |
| `npx prisma db seed` | 运行数据库种子数据 |

---

## 🎯 开发工作流

### 修改数据库模型

1. 编辑 `prisma/schema.prisma`
2. 同步数据库结构：
   ```bash
   npx prisma db push
   ```
3. Prisma Client 会自动重新生成

**注意**：本地开发使用 `db push`（快速同步），生产环境自动使用 `migrate`（版本控制）

### 查看数据库数据

```bash
npx prisma studio
```

浏览器会自动打开数据库可视化界面（通常是 http://localhost:5555）。

---

## 📝 代码规范

- **TypeScript** - 项目使用严格的 TypeScript
- **ESLint** - 遵循 Next.js 推荐配置
- **组件** - 优先使用函数组件和 Hooks
- **样式** - 使用 Tailwind CSS + shadcn/ui

---

## 🤝 贡献流程

1. 创建新分支：`git checkout -b feature/your-feature`
2. 开发和测试
3. 提交代码：`git commit -m "描述"`
4. 推送分支：`git push origin feature/your-feature`
5. 创建 Pull Request

---

## 📚 相关资源

- [Next.js 文档](https://nextjs.org/docs)
- [Prisma 文档](https://www.prisma.io/docs)
- [百度千帆文档](https://cloud.baidu.com/doc/WENXINWORKSHOP/index.html)
- [shadcn/ui 组件](https://ui.shadcn.com/)

---

## 🆘 获取帮助

如果遇到问题：

1. 查看本文档的"常见问题"部分
2. 查看项目 Issues
3. 联系项目维护者

祝开发愉快！🎉
