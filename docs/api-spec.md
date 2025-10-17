# AI需求计算器 API 接口规范

## 1. 用户认证相关接口

### 1.1 用户注册
```
POST /api/auth/register
Content-Type: application/json

Request Body:
{
  "phone": "string",      // 手机号(11位,1开头)
  "password": "string"    // 密码(至少6位)
}

Response:
{
  "success": boolean,
  "message": "string",
  "data": {
    "userId": "string",
    "username": "string",  // 使用手机号作为用户名
    "token": "string"
  }
}
```

### 1.2 用户登录
```
POST /api/auth/login
Content-Type: application/json

Request Body:
{
  "phone": "string",      // 手机号
  "password": "string"    // 密码
}

Response:
{
  "success": boolean,
  "message": "string",
  "data": {
    "userId": "string",
    "username": "string",  // 手机号
    "token": "string"
  }
}
```

### 1.3 用户登出
```
POST /api/auth/logout
Authorization: Bearer {token}

Response:
{
  "success": boolean,
  "message": "string"
}
```

## 2. 需求评估接口

### 2.1 提交评估请求
```
POST /api/evaluate
Content-Type: application/json
Authorization: Bearer {token} (可选)

Request Body:
{
  "model": "string",              // 模型选择
  "hardware": "string",           // 硬件型号
  "cardCount": number,            // 卡数
  "businessData": {
    "volume": number,             // 业务数据量
    "dataTypes": string[],        // 数据类型: ["text", "image", "qa_pair", "video", "audio"]
    "quality": "high" | "medium" | "low"  // 数据质量评价
  },
  "businessScenario": "string",   // 业务场景描述
  "performanceRequirements": {
    "qps": number,                // 期望QPS
    "concurrency": number         // 用户并发数
  }
}

Response:
{
  "success": boolean,
  "message": "string",
  "data": {
    "evaluationId": "string",
    "resourceFeasibility": {
      "pretraining": {
        "feasible": boolean,
        "memoryUsagePercent": number,  // 显存使用百分比 0-100
        "memoryRequired": number,      // 需要的显存(GB)
        "memoryAvailable": number,     // 可用显存(GB)
        "suggestions": string[]
      },
      "fineTuning": {
        "feasible": boolean,
        "memoryUsagePercent": number,
        "memoryRequired": number,
        "memoryAvailable": number,
        "suggestions": string[],       // 如 ["考虑使用LoRA", "考虑使用QLoRA", "建议采购硬件"]
        "loraFeasible": boolean,       // LoRA是否可行
        "qloraFeasible": boolean       // QLoRA是否可行
      },
      "inference": {
        "feasible": boolean,
        "memoryUsagePercent": number,
        "memoryRequired": number,
        "memoryAvailable": number,
        "supportedThroughput": number, // 支持的吞吐量
        "supportedQPS": number,        // 支持的QPS
        "meetsRequirements": boolean,  // 是否满足用户需求
        "suggestions": string[],       // 如 ["考虑INT8量化", "考虑INT4量化"]
        "quantizationOptions": [
          {
            "type": "FP16" | "INT8" | "INT4",
            "memoryUsagePercent": number,
            "supportedQPS": number,
            "meetsRequirements": boolean
          }
        ]
      }
    },
    "technicalFeasibility": {
      "appropriate": boolean,
      "score": number,               // 0-100
      "issues": string[],            // 如 ["使用OCR可能更合适", "选择了文本模型但有视觉需求"]
      "recommendations": string[]
    },
    "businessValue": {
      "score": number,               // 0-100
      "analysis": "string",          // AI生成的业务价值评估
      "risks": string[],
      "opportunities": string[]
    },
    "createdAt": "string"
  }
}
```

## 3. 反馈接口

### 3.1 提交模块反馈(点赞/点踩)
```
POST /api/feedback/module
Content-Type: application/json
Authorization: Bearer {token} (可选)

Request Body:
{
  "evaluationId": "string",
  "moduleType": "resource" | "technical" | "business",
  "feedbackType": "like" | "dislike",
  "comment": "string" (可选)
}

Response:
{
  "success": boolean,
  "message": "string"
}
```

### 3.2 提交浮动反馈
```
POST /api/feedback/general
Content-Type: application/json
Authorization: Bearer {token} (可选)

Request Body:
{
  "type": "bug" | "feature" | "improvement" | "other",
  "title": "string",
  "description": "string",
  "email": "string" (可选)
}

Response:
{
  "success": boolean,
  "message": "string",
  "data": {
    "feedbackId": "string"
  }
}
```

## 4. 历史记录接口

### 4.1 获取评估历史
```
GET /api/evaluations?page=1&limit=10
Authorization: Bearer {token}

Response:
{
  "success": boolean,
  "data": {
    "evaluations": [
      {
        "evaluationId": "string",
        "model": "string",
        "hardware": "string",
        "createdAt": "string",
        "summary": "string"
      }
    ],
    "total": number,
    "page": number,
    "limit": number
  }
}
```

### 4.2 获取单个评估详情
```
GET /api/evaluations/{evaluationId}
Authorization: Bearer {token}

Response:
{
  "success": boolean,
  "data": {
    // 完整的评估结果,同2.1的data字段
  }
}
```

## 错误响应格式

所有接口在出错时返回统一格式:
```
{
  "success": false,
  "error": {
    "code": "string",        // 错误码
    "message": "string",     // 错误信息
    "details": object        // 详细错误信息(可选)
  }
}
```

## HTTP状态码

- 200: 成功
- 400: 请求参数错误
- 401: 未授权
- 403: 禁止访问
- 404: 资源不存在
- 500: 服务器内部错误
