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

### 5️⃣ 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 即可看到应用！

---

## 🗄️ 数据库选项

### 选项 1: SQLite（推荐 - 本地开发）

**优点**：
- ✅ 零配置，开箱即用
- ✅ 数据存储在本地文件 `prisma/dev.db`
- ✅ 适合快速开发和测试

**配置**：
```bash
DATABASE_URL="file:./dev.db"
```

**初始化**：
```bash
npx prisma db push
```

---

### 选项 2: PostgreSQL（可选 - 与生产环境一致）

如果您想使用与生产环境相同的数据库：

**步骤**：

1. **安装 PostgreSQL**（如果还没有）：
   - macOS: `brew install postgresql`
   - Windows: 下载安装包
   - Linux: `apt-get install postgresql`

2. **创建数据库**：
   ```bash
   createdb ai_calculator
   ```

3. **修改 `.env`**：
   ```bash
   DATABASE_URL="postgresql://username:password@localhost:5432/ai_calculator?schema=public"
   ```

4. **修改 `prisma/schema.prisma`**：
   ```prisma
   datasource db {
     provider = "postgresql"  // 从 sqlite 改为 postgresql
     url      = env("DATABASE_URL")
   }
   ```

5. **运行迁移**：
   ```bash
   npx prisma migrate dev
   ```

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

### Q7: ⚠️ 数据库 provider 不匹配（重要）

**错误提示**：`P3019: The datasource provider 'postgresql' does not match 'sqlite'`

**原因**：`prisma/schema.prisma` 中的 `provider` 与 `.env` 中的 `DATABASE_URL` 不匹配

**解决方案**：

**方案 A：使用 SQLite（推荐本地开发）**

1. 修改 `prisma/schema.prisma`：
   ```prisma
   datasource db {
     provider = "sqlite"  // ✅ 改为 sqlite
     url      = env("DATABASE_URL")
   }
   ```

2. 确保 `.env` 中：
   ```bash
   DATABASE_URL="file:./dev.db"
   ```

3. 初始化数据库：
   ```bash
   npx prisma db push
   ```

**方案 B：使用 PostgreSQL（与生产环境一致）**

1. 保持 `prisma/schema.prisma` 中：
   ```prisma
   datasource db {
     provider = "postgresql"  // ✅ 保持 postgresql
     url      = env("DATABASE_URL")
   }
   ```

2. 修改 `.env` 为 PostgreSQL 连接：
   ```bash
   DATABASE_URL="postgresql://username:password@localhost:5432/ai_calculator"
   ```

3. 运行迁移：
   ```bash
   npx prisma migrate dev
   ```

**建议**：本地开发使用 SQLite（方案 A），简单快速无需额外配置！

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
| `npx prisma db push` | 同步数据库（SQLite） |
| `npx prisma migrate dev` | 创建迁移（PostgreSQL） |

---

## 🎯 开发工作流

### 修改数据库模型

1. 编辑 `prisma/schema.prisma`
2. 运行同步命令：
   - SQLite: `npx prisma db push`
   - PostgreSQL: `npx prisma migrate dev --name description`
3. 重新生成 Client: `npx prisma generate`

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
