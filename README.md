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

## 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/ethan7zhanghx/ai-calculator.git
cd ai-calculator
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**

创建 `.env.local` 文件（或复制 `.env.local.example`）：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`，填入以下配置：

```env
# 数据库配置
DATABASE_URL="file:./dev.db"

# JWT 密钥（生产环境请使用强密码，至少 32 字符）
JWT_SECRET="your-secret-key-change-this-in-production-min-32-chars"
JWT_EXPIRES_IN="7d"

# 百度千帆 API 密钥
# 获取方式：https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application
# 请填写你的 API Key（Bearer Token 格式）
QIANFAN_API_KEY="your-qianfan-api-key-here"
```

**如何获取百度千帆 API Key：**
1. 访问 [百度智能云千帆控制台](https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application)
2. 创建应用并获取 API Key
3. 格式示例：`bce-v3/ALTAK-xxxxxxx/xxxxxxx`

4. **初始化数据库**
```bash
npx prisma generate
npx prisma migrate dev --name init
```

5. **启动开发服务器**

**方式一：使用启动脚本（推荐）**
```bash
chmod +x start.sh
./start.sh
```

**方式二：手动启动**
```bash
npm run dev
```

6. **访问应用**

打开浏览器访问：http://localhost:3000

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
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 数据库迁移
npx prisma migrate dev

# 查看数据库
npx prisma studio

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

### Q: 评估需要多长时间？
A: 首次评估通常需要 15-30 秒，后续评估会更快（得益于 Prompt Caching）

### Q: 支持哪些模型？
A: 目前知识库包含 GPT-4、GPT-3.5、Claude 3 Opus/Sonnet、Llama 3 70B/8B、Mistral Large/7B。可在 `lib/model-knowledge-base.ts` 中添加更多模型。

### Q: 评估结果准确吗？
A: 评估基于 ERNIE-4.5 和精心设计的 Few-Shot 案例，但建议作为决策参考而非唯一依据。复杂场景建议咨询专业 AI 架构师。

### Q: 可以用自己的 API Key 吗？
A: 是的，在 `.env.local` 中配置 `QIANFAN_API_KEY` 即可。

### Q: 数据会被存储吗？
A: 评估输入和结果会存储在本地数据库中，关联到你的账号。不会上传到第三方服务器（除了调用百度千帆 API 进行评估）。

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
