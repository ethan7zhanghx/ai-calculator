# AI 企业需求计算器

一个基于 Next.js 15 和百度千帆 ERNIE-4.5 的 AI 企业需求评估系统，帮助企业评估其 AI 技术方案的合理性和可行性。

## 功能特性

### 核心功能
- **手机号登录/注册** - JWT 身份验证，支持验证码登录
- **智能需求评估** - 基于 ERNIE-4.5-turbo-128k 的深度技术评估
- **多维度分析** - 7 大维度全面评估技术方案合理性
- **可视化结果展示** - 仪表盘、雷达图、进度条等丰富图表
- **实时进度反馈** - 评估过程中显示详细进度和预计时间
- **反馈系统** - 支持模块反馈和通用反馈
- **响应式设计** - 完美适配桌面端和移动端

### 技术方案评估维度

1. **模型与业务匹配度** - 评估所选模型是否适合业务场景（如视觉任务需要多模态模型）
2. **大模型必要性** - 判断是否真正需要大语言模型（如 OCR 场景可能更适合专用模型）
3. **微调必要性与数据充分性** - 评估是否需要微调以及训练数据是否充足
4. **业务可行性与实施路径** - 提供分阶段实施建议（短期/中期/不建议）
5. **性能需求合理性** - 分析 QPS 和并发数要求是否合理
6. **成本效益分析** - 评估模型选型的成本合理性
7. **领域特性考虑** - 针对医疗、金融、法律等特殊领域的额外建议

## 技术栈

### 前端
- **Next.js 15** - React 服务端渲染框架（App Router）
- **TypeScript** - 类型安全
- **Tailwind CSS** - 原子化 CSS 框架
- **shadcn/ui** - 基于 Radix UI 的高质量组件库
- **Recharts** - 数据可视化图表库

### 后端
- **Next.js API Routes** - 服务端 API
- **Prisma ORM** - 类型安全的数据库 ORM
- **SQLite** - 轻量级数据库（开发环境）
- **JWT** - 用户身份验证

### AI 集成
- **百度千帆 API** - ERNIE-4.5-turbo-128k 模型
- **Few-Shot Learning** - 5 个详细示例案例指导评估
- **结构化输出** - JSON Schema 强制输出格式

## 快速开始（5 分钟）

### 前置要求
- Node.js 18+
- npm 或 yarn
- Git

### 安装步骤

#### 1️⃣ 克隆仓库

```bash
git clone https://github.com/ethan7zhanghx/ai-calculator.git
cd ai-calculator
```

#### 2️⃣ 安装依赖

```bash
npm install --legacy-peer-deps
```

> **注意**: 必须使用 `--legacy-peer-deps` 标志，因为项目使用了 React 19。

#### 3️⃣ 配置环境变量 ⚠️ 重要

**第一步：复制环境变量模板文件**

```bash
cp .env.local.example .env.local
```

**第二步：编辑 `.env.local` 文件，填入真实的配置**

使用任意文本编辑器打开 `.env.local` 文件：

```bash
# 方式1：使用 vim
vim .env.local

# 方式2：使用 VS Code
code .env.local

# 方式3：使用系统默认编辑器
open .env.local
```

**必须修改的配置**：

```bash
# 数据库连接（保持默认即可）
DATABASE_URL="file:./dev.db"

# 百度千帆 API 密钥（⚠️ 必须填入真实的 API Key）
QIANFAN_API_KEY="bce-v3/ALTAK-xxxxxxx/xxxxxxx"  # ← 替换成你的真实 API Key

# JWT 密钥（可以保持默认，或自定义 32 位以上随机字符串）
JWT_SECRET="your-local-jwt-secret-key-change-this"
JWT_EXPIRES_IN="7d"
```

**如何获取 QIANFAN_API_KEY**：
1. 访问 [百度智能云千帆控制台](https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application)
2. 创建应用并获取 API Key
3. 将完整的 API Key 填入 `.env.local` 文件
4. 格式示例：`bce-v3/ALTAK-DqUYq5oZjYhHmb1DYJylj/c303c3f9d0dd5adb9753ff2d07afff862d38faa2`

> ⚠️ **重要**：`QIANFAN_API_KEY` 必须填入真实的值，否则评估功能无法使用！

#### 4️⃣ 初始化数据库

**⚠️ 重要：在运行此步骤前，请确认已完成步骤 3（创建并配置 `.env.local` 文件）！**

**第一步：验证环境变量文件是否存在**

```bash
# 检查 .env.local 文件是否存在
ls -la .env.local

# 如果提示 "No such file or directory"，说明文件不存在
# 请返回步骤 3，执行：cp .env.local.example .env.local
```

**第二步：验证环境变量内容**

```bash
# 查看 .env.local 文件内容
cat .env.local

# 确认输出中包含：
# DATABASE_URL="file:./dev.db"
# QIANFAN_API_KEY=bce-v3/ALTAK-xxxxx（你的真实 API Key）
```

**第三步：初始化数据库**

```bash
npx prisma generate
npx prisma db push
```

这会：
- 生成 Prisma Client
- 创建本地 SQLite 数据库（`prisma/dev.db`）
- 创建所有数据表

**无需安装 PostgreSQL！本地开发使用 SQLite，零配置！**

**如果仍然报错 "Environment variable not found: DATABASE_URL"**：
1. 确认 `.env.local` 文件在项目根目录（与 `package.json` 同级）
2. 确认文件内容格式正确（每个注释单独一行）
3. 尝试重启终端后重新运行命令

#### 5️⃣ 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 即可看到应用！

---

## 数据库说明

**本地开发**：使用 **SQLite**（零配置，开箱即用）
- ✅ 无需安装数据库软件
- ✅ 数据存储在本地文件 `prisma/dev.db`
- ✅ 适合快速开发和测试

**生产环境（Vercel）**：使用 **PostgreSQL**
- 🚀 Vercel 部署时自动切换
- 🔒 使用 Prisma Accelerate 云数据库
- 📊 支持多用户并发访问

**您不需要关心生产环境的数据库配置**，clone 代码后直接运行即可！

## 项目结构

```
ai-calculator/
├── app/                      # Next.js 15 App Router
│   ├── api/                  # API 路由
│   │   ├── auth/            # 身份验证 API
│   │   ├── evaluate/        # 评估 API
│   │   └── feedback/        # 反馈 API
│   ├── page.tsx             # 主页面
│   └── layout.tsx           # 根布局
├── components/              # React 组件
│   ├── ui/                  # shadcn/ui 基础组件
│   ├── evaluation-progress.tsx        # 评估进度组件
│   ├── technical-evaluation-detailed.tsx  # 技术评估详情
│   ├── input-summary.tsx    # 输入配置摘要
│   └── ...
├── lib/                     # 工具库
│   ├── technical-evaluator.ts  # 核心评估逻辑（LLM）
│   ├── model-knowledge-base.ts # 模型参数知识库
│   ├── types.ts            # TypeScript 类型定义
│   ├── prisma.ts           # Prisma 客户端
│   ├── jwt.ts              # JWT 工具
│   └── password.ts         # 密码加密
├── prisma/                  # Prisma 配置
│   ├── schema.prisma       # 数据库模型
│   └── dev.db              # SQLite 数据库（开发）
├── start.sh                # 一键启动脚本
├── .env.local.example      # 环境变量示例
└── README.md               # 项目文档

```

## 核心实现原理

### AI 评估流程

1. **模型知识注入** (`lib/model-knowledge-base.ts`)
   - 存储 8 个主流模型的客观参数（参数量、架构、模态、上下文窗口、视觉能力）
   - 评估时将相关模型信息注入到 LLM 上下文中

2. **Few-Shot Learning** (`lib/technical-evaluator.ts`)
   - 系统提示词定义评估原则和评分标准
   - 5 个详细案例覆盖常见场景：
     - 视觉任务使用纯文本模型（低分案例）
     - OCR 场景过度使用 LLM（低分案例）
     - 客服系统合理方案（高分案例）
     - 医疗领域复杂场景（中等分数 + 分阶段建议）
     - 金融风控数据不足（低分 + 替代方案）

3. **结构化输出**
   - 使用 `response_format: { type: "json_object" }` 确保一致的 JSON 格式
   - 低温度参数（0.3）提高评估稳定性

4. **用户体验优化**
   - 评估期间显示 7 阶段进度（对应 7 个评估维度）
   - 平滑进度条动画（0-95%）
   - 实时计时和剩余时间估算

### 数据库设计

- **User** - 用户信息（手机号、密码哈希）
- **Evaluation** - 评估记录（输入配置、评估结果、时间戳）
- **Feedback** - 用户反馈

## 使用指南

### 1. 登录/注册
- 输入手机号，系统自动判断是登录还是注册
- 开发环境验证码固定为：`123456`

### 2. 填写需求
- **模型选择**：GPT-4、GPT-3.5、Claude 3、Llama 3 等
- **硬件配置**：GPU 型号和卡数
- **业务场景**：详细描述你的 AI 应用场景
- **数据信息**：训练数据量、类型、质量
- **性能要求**：期望 QPS 和并发数

### 3. 提交评估
- 点击"开始评估"按钮
- 等待 15-30 秒（首次评估时间较长）
- 实时查看评估进度

### 4. 查看结果
- **综合评分**：0-100 分，分段显示（红/黄/蓝/绿）
- **7 维度详细分析**：每个维度包含状态标识和详细分析
- **实施路径建议**：短期（1-2 月）、中期（3-6 月）、不建议
- **关键问题和警告**：红色/黄色高亮显示
- **优化建议**：蓝色卡片展示

### 5. 重新评估
- 点击右侧配置卡片底部的"重新编辑配置"按钮
- 修改参数后重新提交

## 开发说明

### 本地开发

```bash
# 安装依赖（必须使用 --legacy-peer-deps）
npm install --legacy-peer-deps

# 启动开发服务器
npm run dev

# 同步数据库结构（本地开发使用）
npx prisma db push

# 查看数据库（可视化工具）
npx prisma studio

# 重新生成 Prisma Client
npx prisma generate

# 类型检查
npx tsc --noEmit

# 构建生产版本
npm run build
```

### 环境变量说明

| 变量名 | 说明 | 必填 | 示例 |
|--------|------|------|------|
| `DATABASE_URL` | 数据库连接字符串 | 是 | `file:./dev.db` |
| `JWT_SECRET` | JWT 签名密钥 | 是 | 至少 32 字符的强密码 |
| `JWT_EXPIRES_IN` | JWT 过期时间 | 否 | `7d`（默认 7 天） |
| `QIANFAN_API_KEY` | 百度千帆 API 密钥 | 是 | `bce-v3/ALTAK-xxx/xxx` |

### 部署注意事项

1. **生产环境 JWT 密钥**：必须使用强随机密钥
2. **数据库迁移**：生产环境建议使用 PostgreSQL 或 MySQL
3. **API Key 安全**：不要将 `.env.local` 提交到代码仓库
4. **CORS 配置**：如果前后端分离部署，需要配置 CORS

## API 文档

### POST `/api/auth/login`
用户登录/注册

**请求体：**
```json
{
  "phone": "13800138000",
  "verificationCode": "123456"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-id",
      "phone": "13800138000"
    }
  }
}
```

### POST `/api/evaluate`
提交评估请求

**请求头：**
```
Authorization: Bearer <token>
```

**请求体：**
```json
{
  "model": "GPT-4",
  "hardware": "NVIDIA A100",
  "cardCount": 4,
  "businessScenario": "智能客服系统...",
  "businessData": {
    "volume": 10000,
    "types": ["text", "qa_pair"],
    "quality": "high"
  },
  "performanceRequirements": {
    "qps": 100,
    "concurrency": 50
  }
}
```

**响应：**（包含 7 维度详细评估结果）

### POST `/api/feedback`
提交用户反馈

## 常见问题

### Q1: `npm install` 失败，提示依赖冲突
**解决方案**：必须使用 `--legacy-peer-deps` 标志
```bash
npm install --legacy-peer-deps
```

### Q2: 提示 "Environment variable not found: DATABASE_URL"

**原因**：没有创建 `.env.local` 文件，或文件位置不对

**完整解决步骤**：

```bash
# 1. 确认当前在项目根目录
pwd
# 应该显示类似：/Users/xxx/ai-calculator

# 2. 检查 .env.local 文件是否存在
ls -la .env.local
# 如果显示 "No such file or directory"，说明文件不存在

# 3. 复制模板文件
cp .env.local.example .env.local

# 4. 验证文件已创建
ls -la .env.local
# 应该显示文件信息

# 5. 查看文件内容
cat .env.local
# 确认包含 DATABASE_URL="file:./dev.db"

# 6. 重新运行 Prisma 命令
npx prisma generate
npx prisma db push
```

**特别注意**：
- `.env.local` 文件必须在**项目根目录**（与 `package.json` 同级）
- 文件名是 `.env.local`（注意开头有个点 `.`）
- 不是 `.env` 也不是 `env.local`

### Q3: 提示 "Prisma Client could not be generated"
**解决方案**：运行生成命令
```bash
npx prisma generate
```

### Q4: 数据库表不存在
**解决方案**：运行数据库同步
```bash
npx prisma db push
```

### Q5: API 调用失败，提示 "QIANFAN_API_KEY not found"
**解决方案**：检查 `.env.local` 文件中是否正确配置了 `QIANFAN_API_KEY`

### Q6: ⚠️ `.env` 文件格式错误
**错误示例**：
```bash
DATABASE_URL="file:./dev.db"
#JWT Secret  # ❌ 注释后面直接跟变量
JWT_SECRET="xxx"
```

**正确格式**：
```bash
# 数据库连接
DATABASE_URL="file:./dev.db"

# JWT 密钥（注释必须单独一行）
JWT_SECRET="xxx"
```

**关键点**：
- ✅ 每个注释必须单独一行
- ✅ 变量定义前不能有注释
- ✅ 建议使用 `cp .env.local.example .env.local` 复制模板

### Q7: 数据库文件损坏或需要重置
**解决方案**：删除 SQLite 数据库文件并重新初始化
```bash
rm prisma/dev.db
npx prisma db push
```

### Q8: 评估需要多长时间？
A: 首次评估通常需要 1-3 分钟（包含技术方案和商业价值两大模块的深度分析）

### Q9: 支持哪些模型？
A: 目前知识库包含 GPT-4、GPT-3.5、Claude 3 Opus/Sonnet、Llama 3 70B/8B、Mistral Large/7B。可在 `lib/model-knowledge-base.ts` 中添加更多模型。

### Q10: 评估结果准确吗？
A: 评估基于 ERNIE-4.5 和精心设计的 Few-Shot 案例，但建议作为决策参考而非唯一依据。复杂场景建议咨询专业 AI 架构师。

### Q11: 数据会被存储吗？
A: 评估输入和结果会存储在本地数据库中，关联到你的账号。本地数据和生产环境数据完全隔离，互不影响。

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m 'Add some feature'`
4. 推送到分支：`git push origin feature/your-feature`
5. 提交 Pull Request

## 许可证

MIT License

## 联系方式

- GitHub: [@ethan7zhanghx](https://github.com/ethan7zhanghx)
- 项目地址：https://github.com/ethan7zhanghx/ai-calculator

---

**注意**：本项目仅供学习和参考使用，不提供任何形式的技术支持保证。生产环境使用请自行评估风险。
