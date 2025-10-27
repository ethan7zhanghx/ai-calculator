/**
 * 技术方案评估器
 * 使用百度千帆ERNIE-4.5进行深度评估，基于Few-Shot Learning
 */

import type { EvaluationRequest } from "./types"
import { formatModelInfo } from "./model-knowledge-base"
import { fetchWithRetry } from "./api-retry"
import { calculateResourceFeasibility } from "./resource-calculator"

export interface TechnicalEvaluationResult {
  score: number // 0-100，用于前端评分条展示

  // 核心评估结论
  summary: string

  // 详细的维度分析
  dimensions: {
    // 1. 模型与业务匹配度
    modelTaskAlignment: {
      score: number // 0-100
      scoreRationale: string // 对该评分的简要说明
      status: "matched" | "mismatched" | "partial"
      analysis: string
    }

    // 2. 大模型必要性
    llmNecessity: {
      score: number // 0-100
      scoreRationale: string // 对该评分的简要说明
      status: "necessary" | "unnecessary" | "debatable"
      analysis: string
      alternatives?: string
    }

    // 3. 微调评估
    fineTuning: {
      score: number // 0-100
      scoreRationale: string // 对该评分的简要说明
      necessary: boolean
      dataAdequacy: "sufficient" | "marginal" | "insufficient"
      analysis: string
    }

    // 4. 业务可行性与实施路径
    implementationRoadmap: {
      score: number // 0-100
      scoreRationale: string // 对该评分的简要说明
      feasible: boolean
      analysis: string
      phases: {
        shortTerm?: string[] // 1-2个月可落地
        midTerm?: string[] // 3-6个月可落地
        notRecommended?: string[] // 不建议做
      }
    }

    // 5. 性能需求评估
    performanceRequirements: {
      score: number // 0-100
      scoreRationale: string // 对该评分的简要说明
      reasonable: boolean
      analysis: string
    }

    // 6. 成本效益
    costEfficiency: {
      score: number // 0-100
      scoreRationale: string // 对该评分的简要说明
      level: "reasonable" | "high" | "excessive"
      analysis: string
    }

    // 7. 领域特殊考虑
    domainConsiderations?: {
      score?: number // 0-100, 可选
      scoreRationale?: string // 对该评分的简要说明
      applicable: boolean
      analysis: string
    }
  }

  // 关键问题（阻断性）
  criticalIssues: string[]

  // 警告问题
  warnings: string[]

  // 实施建议
  recommendations: string[]
}

/**
 * 使用ERNIE-4.5评估技术方案
 */
export async function evaluateTechnicalSolution(
  req: EvaluationRequest
): Promise<TechnicalEvaluationResult> {
  const apiKey = process.env.QIANFAN_API_KEY

  if (!apiKey) {
    throw new Error("QIANFAN_API_KEY 环境变量未设置")
  }

  try {
    // 1. 首先计算资源可行性
    const resourceFeasibility = calculateResourceFeasibility(
      req.model,
      req.hardware,
      req.cardCount,
      req.performanceRequirements.tps
    )

    let resourceFeasibilityScore = 0
    if (resourceFeasibility) {
      const { pretraining, fineTuning, inference } = resourceFeasibility
      const maxUtilization = Math.max(
        pretraining.memoryUsagePercent,
        fineTuning.memoryUsagePercent,
        inference.memoryUsagePercent
      )

      if (maxUtilization <= 60) {
        // 0-60% 占用率: 最佳范围，得满分
        resourceFeasibilityScore = 100
      } else if (maxUtilization <= 90) {
        // 61-90% 占用率: 高效范围，分数线性下降
        resourceFeasibilityScore = 100 - (maxUtilization - 60) * 2
      } else if (maxUtilization <= 100) {
        // 91-100% 占用率: 警告范围，分数急剧下降
        resourceFeasibilityScore = 40 - (maxUtilization - 90) * 4
      }
      // > 100% 占用率: 分数保持为0，表示不可行
    }

    // 2. 构建Prompt并调用LLM
    const prompt = buildEvaluationPrompt(req, resourceFeasibilityScore)

    console.log(`技术评估Prompt长度: ${prompt.length} 字符`)

    // 使用带重试的 fetch,增加重试次数和更长超时
    const response = await fetchWithRetry(
      "https://qianfan.baidubce.com/v2/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Appbuilder-Authorization": apiKey, // IAM鉴权必需的header
        },
        body: JSON.stringify({
          model: "ernie-4.5-turbo-128k",
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT, // 评估原则和输出要求（会被API缓存）
            },
            {
              role: "system",
              content: FEW_SHOT_EXAMPLES, // Few-Shot案例（会被API缓存）
            },
            {
              role: "user",
              content: prompt, // 只包含当前用户的具体需求
            },
          ],
          response_format: {
            type: "json_object",
          },
          temperature: 0.3, // 低温度保证一致性
        }),
      },
      {
        maxRetries: 6, // 增加到6次重试
        timeout: 180000, // 增加到180秒(3分钟)超时
        initialDelay: 3000, // 增加初始延迟到3秒
        onRetry: (attempt, error) => {
          console.log(`技术评估API重试 (${attempt}/6):`, error.message)
        },
      }
    )

    const data = await response.json()

    // 检查千帆API的错误响应
    if (data.error_code || data.error_msg) {
      throw new Error(`千帆API错误: ${data.error_msg || data.error_code}`)
    }

    if (!data.choices?.[0]?.message?.content) {
      throw new Error("千帆API返回数据格式异常")
    }

    const content = data.choices[0].message.content

    const result = JSON.parse(content) as TechnicalEvaluationResult
    return result
  } catch (error) {
    console.error("技术评估失败:", error)

    // 如果是JSON解析错误,提供更详细的信息
    if (error instanceof SyntaxError) {
      throw new Error("AI返回的JSON格式无效,请重试")
    }

    // 如果是网络或API错误,保持原错误信息
    if (error instanceof Error) {
      throw error
    }

    throw new Error("技术方案评估服务暂时不可用，请稍后重试")
  }
}

/**
 * 系统提示词（固定，会被千帆缓存）
 */
const SYSTEM_PROMPT = `你是一位资深AI技术架构师，擅长评估企业AI项目的技术方案合理性。

## 评估维度与权重

你需要从以下7个维度全面评估技术方案，每个维度单独打分(0-100分)：

1. **硬件资源可行性 (15%)** - 硬件配置是否能支持模型运行（这是预计算好的，你只需采纳该分数，不要展开讨论硬件细节）
2. **模型类型与业务匹配度 (25%)** - 模型能力是否匹配业务需求（注意：这是独立维度，即使硬件不足也要客观评估模型选型本身的合理性）
3. **大模型必要性 (15%)** - 是否真的需要大模型，还是小模型/传统方案就能解决
4. **微调必要性和数据充分性 (15%)** - 首先判断该场景是否需要微调。如果不需要微调，即使数据量少也不应扣分；如果需要微调，再评估数据是否充足
5. **业务可行性与实施路径 (15%)** - 业务需求是否在技术边界内，如何分阶段实施
6. **性能需求合理性 (10%)** - TPS和并发数配比是否合理，是否符合业务场景
7. **成本效益 (5%)** - 模型选型和运维成本是否合理

**总分计算**：按上述权重加权平均得出

## 评估原则

1. **客观性**：实事求是，发现问题要明确指出，不回避矛盾
2. **连贯性**：每个维度的analysis字段用2-4句连贯的话进行深入分析（100-200字），而非简单罗列要点
3. **独立性**：各维度相对独立评估。不要因为某一维度（如硬件资源）的问题，就在其他所有维度反复强调同一个问题
4. **分层性**：区分致命问题(criticalIssues)和警告(warnings)，不要混在一起
5. **可操作性**：建议要具体可执行，不要只说"建议优化"这种空话
6. **深度思考**：要解释"为什么"，不仅说"是什么"，提供有价值的洞察
7. **场景适应性**：对于微调评估，必须先判断该场景是否真正需要微调（如RAG方案可能不需要微调）。如果不需要微调，即使用户提供的数据量少，也不应该在这个维度给负面评价

## 评分标准

### 总分范围 (0-100)
- **90-100分**：方案非常优秀，技术选型精准，各方面考虑周全
- **80-89分**：整体合理，有小的改进空间，但不影响实施
- **60-79分**：有明显问题但整体可行，需要优化后才能达到理想效果
- **40-59分**：严重问题，需要重大调整才能继续
- **0-39分**：致命错误，方案根本无法实现（如视觉任务选文本模型）

### 各维度评分标准 (0-100)
- **90-100分**：该维度表现优秀，无明显改进空间
- **70-89分**：该维度合理，有小的优化建议
- **50-69分**：该维度存在明显问题，需要调整
- **30-49分**：该维度有严重问题，需要重大改变
- **0-29分**：该维度完全不合理，致命缺陷

## 输出要求

1. **总分(score)**：按权重加权平均计算的总分(0-100)
2. **summary**：用2-3句话总结核心评估结论和主要问题/亮点（100-150字）
3. **每个维度必须包含**：
   - **score**: 该维度的评分(0-100)
   - **scoreRationale**: 对该评分的简要说明(1-2句话)，解释为什么给出这个分数
   - **status/level**: 状态标识
   - **analysis**: 用段落式叙述进行深入分析（2-4句话，100-200字），解释"为什么"而非仅说"是什么"
4. **各维度评估的独立性要求**：
   - **硬件资源可行性**：直接采纳预计算分数，简要说明即可，不要展开讨论显存占用细节
   - **模型类型与业务匹配度**：专注评估模型类型（文本/多模态/代码等）与业务任务的匹配度，不要因为硬件资源不足就认为模型选型有问题
   - **微调必要性和数据充分性**：必须先判断该场景是否需要微调。RAG、知识问答等场景通常不需要微调，此时即使数据量少也应给高分；只有在确实需要微调的场景下，才评估数据是否充足
   - 其他维度：避免重复提及同一个问题。例如，如果硬件资源不足，只在"硬件资源可行性"维度指出即可，不要在每个维度都反复强调
5. **implementationRoadmap**：
   - 如果场景复杂，必须给出分阶段实施路径（shortTerm、midTerm、notRecommended）
   - shortTerm：1-2个月可落地的功能
   - midTerm：3-6个月可落地的功能
   - notRecommended：高风险不建议做的部分
6. **criticalIssues**：只放阻断性问题，导致方案无法实施的问题
7. **warnings**：需要注意但不阻断的问题
8. **recommendations**：3-5条具体可执行的建议，每条说明"做什么"和"为什么"

## 分析深度要求

- **段落式分析**：不要写短句列表，要写完整段落
- **逻辑推理**：要有逻辑推理过程，不只是描述现象
- **实际价值**：要提供有价值的洞察，而非空洞的套话
- **平衡视角**：既要看到优点，也要指出风险`

/**
 * Few-Shot评估案例（固定，会被千帆缓存）
 */
const FEW_SHOT_EXAMPLES = `# Few-Shot 评估案例

## 案例1：致命错误 - 视觉任务选择文本模型

**输入：**
- 业务场景：电商产品图片自动生成描述，用于商品详情页
- 模型：Llama 3 8B（纯文本，不支持视觉）
- 数据：8000张产品图片 + 人工标注的描述，已治理
- 性能需求：QPS 20，并发：50
- 硬件配置：A100 80GB × 2张

**输出：**
\`\`\`json
{
  "score": 12,
  "summary": "技术方案存在根本性致命错误，完全无法实施。业务核心需求是理解产品图片内容并生成描述文字，这是典型的多模态任务，必须使用具备视觉理解能力的多模态大模型。然而Llama 3 8B是纯文本语言模型，完全不支持图像输入，这使得整个方案从技术基础上就站不住脚。这不是参数调优或Prompt工程能够解决的问题，而是模型类型选择上的根本性错误。虽然数据准备和性能规划都较为合理，但在模型选型这个前提错误的情况下，其他所有合理性都失去了意义。必须立即更换为支持视觉输入的开源多模态模型（如ERNIE-4.5-VL, Qwen-VL等）。",
  "dimensions": {
    "modelTaskAlignment": {
      "score": 0,
      "scoreRationale": "模型类型与任务需求完全不匹配，纯文本模型无法处理图像输入，导致方案从根本上无法实现。",
      "status": "mismatched",
      "analysis": "业务需求的核心是从产品图片中提取视觉信息（颜色、材质、款式、细节等），并将其转化为自然流畅的商品描述文字，这是典型的视觉-语言跨模态理解与生成任务。Llama 3 8B作为纯文本大语言模型，其输入层只能接受文本token，完全不具备图像编码器和视觉理解模块，无法处理任何形式的图片输入。这种不匹配是架构层面的根本性缺陷，不是通过任何Prompt工程技巧能够弥补的。这个错误的严重性相当于企图用只有CPU的服务器来训练深度学习模型，是对AI模型能力边界的基本误判。"
    },
    "llmNecessity": {
      "score": 90,
      "scoreRationale": "业务需求需要复杂的视觉理解和自然语言生成能力，这正是多模态大模型的优势所在，传统方案难以胜任。",
      "status": "necessary",
      "analysis": "从业务需求分析来看，使用大语言模型的方向判断是完全正确的。电商产品图片描述生成需要三个核心能力：准确识别视觉元素、理解语义特征、生成符合电商场景的自然语言描述。传统计算机视觉方案（如目标检测+属性识别）只能输出离散的标签，无法生成流畅连贯的段落式描述。只有多模态大语言模型才能同时具备视觉理解、语义推理和自然语言生成三重能力，实现从图片到描述的端到端转换。因此，使用大模型的技术路线选择是正确的，唯一的问题是选错了具体的模型类型。"
    },
    "fineTuning": {
      "score": 75,
      "scoreRationale": "数据准备和微调思路合理，但因模型选型错误，这些准备工作无法发挥实际作用，因此分数有所保留。",
      "necessary": true,
      "dataAdequacy": "sufficient",
      "analysis": "数据准备和微调规划展现出了合理的技术思路。电商产品描述具有明显的行业特征和风格要求，必须通过微调来让模型深度适配业务场景。8000张产品图片配对人工标注的高质量描述，数据规模对于多模态模型的微调来说是充足的。如果按照正确的技术路线（选择多模态模型），这套数据完全可以支撑LoRA或全量微调，学习品牌特定的描述风格和术语习惯。但在当前错误选择Llama 3 8B的前提下，这些数据准备工作都无法发挥作用。"
    },
    "implementationRoadmap": {
      "score": 0,
      "scoreRationale": "由于模型无法处理输入数据，当前方案完全不具备可行性，任何实施计划都没有意义。",
      "feasible": false,
      "analysis": "当前技术方案在最基础的模型能力层面就存在不可逾越的障碍，完全不具备实施的可行性。任何实施路径的讨论都必须建立在模型能够处理输入数据的前提之上，而Llama 3 8B无法接收图片输入这一事实，使得所有后续的开发、测试、部署计划都成为空中楼阁。这不是'需要优化'或'存在风险'的问题，而是'根本无法运行'的致命缺陷。项目必须立即停止当前路线，回到技术选型阶段重新开始。",
      "phases": {
        "notRecommended": [
          "禁止继续使用Llama 3 8B推进项目，该模型从技术原理上就无法完成图片理解任务",
          "不要尝试通过'OCR提取文字+LLM描述'的变通方案，这会丢失核心的视觉信息（颜色、材质、款式等）",
          "不要投入任何开发资源在当前技术架构上，所有工作都将因模型能力缺失而白费"
        ]
      }
    },
    "performanceRequirements": {
      "score": 80,
      "scoreRationale": "性能指标规划合理，符合业务场景需求，但这些指标是基于错误的技术前提，因此分数有所保留。",
      "reasonable": true,
      "analysis": "性能需求的规划展现出了对业务场景的合理理解。QPS 20、并发50适合中型电商平台的商品上新和描述更新需求。并发数是QPS的2.5倍，这个比例符合多模态模型推理的典型特征（单次推理耗时通常在2-4秒）。2张A100 80GB配置也能够支撑这个性能要求（考虑batch推理和模型量化优化）。然而需要指出的是，虽然性能规划合理，但Llama 3 8B本身无法处理图像输入，因此这些性能指标都是基于错误的技术前提，实际部署时需要根据最终选定的多模态模型重新评估和调整。"
    },
    "costEfficiency": {
      "score": 40,
      "scoreRationale": "选择了无法完成任务的模型，导致所有硬件和人力成本投入都将被浪费。",
      "level": "high",
      "analysis": "成本评估方面存在严重的规划失误。虽然选择Llama 3 8B可能是出于降低硬件门槛的考虑，但由于它完全无法处理图像任务，这个'低成本方案'实际上不会产生任何有效产出，相当于投入的每一分钱都被浪费。正确的成本规划应该在'能够完成任务的开源模型'中进行比较。对于本地部署，2张A100 80GB的硬件成本是固定的，选择一个能完成任务的开源多模态模型（如ERNIE-4.5-VL-28B, Qwen-VL）并不会增加硬件成本，但能产生实际价值。关键是要基于'技术可行'的前提进行成本优化，而不是盲目追求小模型。"
    }
  },
  "criticalIssues": [
    "模型类型根本性错误：Llama 3 8B是纯文本模型，完全不支持图像输入，无法处理产品图片",
    "技术方案从基础架构层面就无法实施，不是优化或调整的问题，而是必须推翻重来"
  ],
  "warnings": [],
  "recommendations": [
    "立即停止当前技术路线，重新进行模型选型。必须选择支持视觉输入的开源多模态大模型，如ERNIE-4.5-VL系列、Qwen-VL系列、Yi-VL等",
    "硬件资源评估：2张A100 80GB的配置足以运行中等规模的开源多模态模型（如30B级别），资源是足够的，关键是选对模型",
    "充分利用已准备的8000张图文对数据进行模型微调，学习电商产品描述的专业术语、品牌话术和目标用户的阅读偏好",
    "建立人工审核和质量监控机制：AI生成的描述在上线前应进行抽样人工审核，检查准确性、品牌调性、营销效果",
    "分阶段实施策略：短期（1-2月）先从标准品类切入，建立基线效果；中期（3-6月）扩展到更多品类，优化长尾场景"
  ]
}
\`\`\`

---

## 案例2：技术选型过度 - 简单任务误用超大模型

**输入：**
- 业务场景：对电商网站的用户评论进行情感分析（正面/负面/中性）
- 模型：DeepSeek-V3.2-Exp（685B参数，MoE架构）
- 数据：10万条用户评论，已标注
- QPS需求：100，并发：200
- 硬件配置：H800 80GB × 8张

**输出：**
\`\`\`json
{
  "score": 48,
  "summary": "技术方案存在严重的成本效益问题和过度设计。情感分析是简单的文本分类任务，使用685B参数的超大模型是典型的高射炮打蚊子，造成巨大的资源浪费和不必要的成本。部署和维护如此庞大的模型来处理简单任务，其总体拥有成本(TCO)极高。正确的做法是使用一个经过微调的小型模型（如Mistral 7B）或传统的机器学习方法，成本可降低95%以上，且性能和效果完全能满足需求。",
  "dimensions": {
    "modelTaskAlignment": {
      "score": 55,
      "scoreRationale": "模型能力远超任务所需，用685B模型做情感分析是极大的资源浪费。",
      "status": "partial",
      "analysis": "情感分析本质上是一个简单的文本分类任务，其核心是判断文本的情感倾向。DeepSeek-V3.2-Exp作为拥有685B参数的旗舰级MoE模型，其设计初衷是处理需要深度推理、复杂指令遵循和海量知识的通用任务。用它来做情感分析，就像用一台超级计算机来做加法运算，虽然能完成任务，但其99%的能力都被闲置和浪费了。这种选型不仅没有带来任何额外的业务价值，反而会因为模型过于庞大而导致推理延迟增加、部署复杂度提高等一系列问题。"
    },
    "llmNecessity": {
      "score": 40,
      "scoreRationale": "情感分析任务完全不需要大语言模型，传统机器学习或小型模型是更优解。",
      "status": "unnecessary",
      "analysis": "对于情感分析这类成熟的NLP任务，完全没有必要使用大语言模型，更不用说旗舰级的超大模型。传统的机器学习方法，如基于TF-IDF的逻辑回归或SVM，或者基于BERT、RoBERTa等小型预训练模型的分类器，已经能够在该任务上达到非常高的准确率（通常在95%以上）。这些方案的优势在于模型体积小、推理速度快（毫秒级）、部署成本极低，并且可解释性更强。选择大模型不仅没有带来效果上的显著提升，反而引入了高昂的成本和技术复杂性。",
      "alternatives": "首选方案是使用传统的机器学习模型（如XGBoost + TF-IDF特征）。如果需要更高的准确率，可以使用一个经过微调的小型语言模型，如Mistral 7B或Llama 3 8B，其效果足以满足业务需求，而成本仅为DeepSeek大模型的1%。"
    },
    "fineTuning": {
      "score": 85,
      "scoreRationale": "微调思路和数据准备合理，10万条数据足以训练一个优秀的情感分类器。",
      "necessary": true,
      "dataAdequacy": "sufficient",
      "analysis": "情感分析任务虽然简单，但微调是必要的，因为不同业务场景下的用户表达习惯和评价重点不同。通过微调，模型可以更好地学习特定领域的语言风格和情感表达方式。10万条已标注的用户评论数据量非常充足，足以训练一个高性能的情感分类模型，无论是传统机器学习模型还是小型语言模型。数据准备工作是本方案中为数不多的亮点。"
    },
    "implementationRoadmap": {
      "score": 60,
      "scoreRationale": "方案可行但路径需要优化，改为使用小型模型会更高效、更经济。",
      "feasible": true,
      "analysis": "技术方案整体可行，但实施路径应大幅调整。正确的做法是放弃使用DeepSeek大模型，转向小型模型或传统机器学习。这不仅能大幅降低成本，还能加快开发和部署周期。例如，使用Mistral 7B进行微调和部署，可能只需要1-2张消费级显卡（如RTX 4090），而不需要8张H800这样的顶级计算资源。",
      "phases": {
        "shortTerm": [
          "第一阶段(1-2周)：使用传统机器学习方法（如XGBoost）或微调一个小型模型（如Mistral 7B），快速建立情感分析基线系统。",
          "第二阶段(2-4周)：对模型进行量化和优化，以满足QPS 100的性能需求，并部署上线。"
        ],
        "notRecommended": [
          "绝对不要使用DeepSeek-V3.2-Exp这样的大模型来做情感分析，这是巨大的资源浪费。",
          "不要在没有尝试小模型和传统方法之前，直接选择最强大的模型。"
        ]
      }
    },
    "performanceRequirements": {
      "score": 70,
      "scoreRationale": "性能指标合理，但当前方案（DeepSeek大模型）难以经济地满足，而推荐的小型模型方案则可以轻松实现。",
      "reasonable": true,
      "analysis": "QPS 100、并发200对于一个面向用户的电商功能来说是合理的性能要求。但要让一个685B的MoE模型达到这个性能，需要极其昂贵的硬件集群（远超8张H800）和复杂的分布式推理框架（如vLLM、TGI），运维成本和技术挑战巨大。相比之下，一个经过优化的Mistral 7B模型在单张A100上就能轻松达到数百QPS，成本效益完全不在一个数量级。"
    },
    "costEfficiency": {
      "score": 5,
      "scoreRationale": "成本效益极差，使用超大模型处理简单任务，导致总体拥有成本(TCO)高出合理方案数十倍甚至上百倍。",
      "level": "excessive",
      "analysis": "这是本方案最严重的问题：成本效益极差。为了部署和运行DeepSeek 685B模型并满足QPS 100的需求，初期硬件投入（至少需要一个完整的H800服务器节点，价值数百万）和后期的电力、运维成本都将是天文数字。而一个基于Mistral 7B的方案，可能只需要几万元的硬件投入和极低的运维成本。两者在效果上几乎没有差异，但TCO相差百倍。这种决策反映了对模型能力和成本之间关系的严重误判。"
    }
  },
  "criticalIssues": [
    "成本效益严重不合理：使用685B的超大模型处理简单的文本分类任务，总体拥有成本(TCO)是合理方案的数十倍以上。"
  ],
  "warnings": [
    "技术选型过度（Over-engineering），导致不必要的复杂性和资源浪费。"
  ],
  "recommendations": [
    "立即放弃使用DeepSeek-V3.2-Exp模型的方案。",
    "重新选型：优先考虑传统的机器学习方法（如XGBoost）或微调一个小型语言模型（如Mistral 7B, Llama 3 8B）。",
    "成本估算：基于新方案重新进行成本和ROI分析，重点关注硬件、电力和运维的总体拥有成本(TCO)。",
    "性能测试：在选定的小型模型上进行压力测试，确保其能满足QPS 100的性能要求。",
    "关注效率：在AI项目初期，应始终追求用最简单、最经济有效的方法解决问题，避免盲目追求"最强"模型。"
  ]
}
\`\`\`

---

## 案例3：合理方案 - RAG客服场景

**输入：**
- 业务场景：智能客服机器人，基于内部知识库（产品手册、FAQ文档）处理售后咨询
- 模型：Llama 3 70B（70B参数，纯文本，8K上下文）
- 数据：6000条QA对话记录，已治理
- QPS需求：50，并发：100
- 硬件配置：A100 80GB × 2张

**输出：**
\`\`\`json
{
  "score": 85,
  "summary": "技术方案整体合理：模型选择、硬件配置和性能需求匹配度高。Llama 3 70B的强大能力结合RAG能很好地完成任务。建议优先使用RAG方案，根据效果决定是否需要微调，以控制成本和维护复杂度。",
  "dimensions": {
    "modelTaskAlignment": {
      "score": 95,
      "status": "matched",
      "analysis": "客服场景需要强大的语义理解、多轮对话管理和知识问答能力。Llama 3 70B作为一款顶级的开源语言模型，其文本理解和生成能力与这些需求完美匹配。它能够理解用户的隐含意图、处理复杂的多轮对话，并生成自然流畅的回复。结合RAG技术，可以有效利用外部知识库，保证回答的准确性和时效性，是当前开源模型在客服场景下的最佳实践之一。"
    },
    "llmNecessity": {
      "score": 90,
      "status": "necessary",
      "analysis": "客服场景的复杂性和开放性决定了必须使用大语言模型。用户咨询千变万化，传统NLU方案只能处理固定模式的问答，无法应对灵活性和多样性。大模型的In-Context Learning能力让它能够理解各种表达方式，生成个性化的回复，这是客服体验的关键。传统客服机器人往往被用户吐槽"答非所问"，正是因为缺乏这种理解和生成能力。"
    },
    "fineTuning": {
      "score": 75,
      "necessary": false,
      "dataAdequacy": "sufficient",
      "analysis": "6000条QA对话记录数据量充足，理论上可以支持模型微调。但客服场景更推荐先使用RAG（检索增强生成）方案而非直接微调。RAG的优势在于：(1)无需训练，部署更快 (2)可以动态更新知识库，新增FAQ无需重新训练 (3)可以追溯答案来源，提高可信度。将知识库文档向量化后存入向量数据库，配合Llama 3 70B的生成能力，效果往往已经能满足80-90%的需求。只有在RAG召回率或答案质量不理想时，再考虑用6000条数据进行LoRA微调。"
    },
    "implementationRoadmap": {
      "score": 90,
      "feasible": true,
      "analysis": "技术方案非常可行，且实施路径清晰合理。客服机器人是LLM应用中技术成熟度最高的场景之一。分阶段实施策略很明智：先用RAG快速上线，再根据真实数据评估是否需要微调优化。这种渐进式策略既能快速见效（2-3周上线），又能控制风险和成本。",
      "phases": {
        "shortTerm": [
          "第一阶段(2-3周)：实现基于RAG的FAQ问答系统，将内部知识库向量化，配合Llama 3 70B生成答案。",
          "配置相似度阈值，低置信度问题自动转人工客服，保证服务质量。",
          "建立基础监控：响应时间、召回率、用户满意度评分。"
        ],
        "midTerm": [
          "第二阶段(1-2个月)：收集真实对话数据，分析RAG方案的不足。",
          "如果召回率<80%或答案质量不理想，考虑用积累的数据进行LoRA微调。",
          "优化多轮对话能力，增加上下文管理和意图识别模块。"
        ]
      }
    },
    "performanceRequirements": {
      "score": 90,
      "reasonable": true,
      "analysis": "QPS 50、并发100对于中型客服场景来说是非常合理的负载需求。2张A100 80GB的配置，通过使用vLLM或TGI等优化的推理框架，并开启FP8/INT8量化，完全可以支撑Llama 3 70B模型达到这个性能指标。并发数是QPS的2倍，也符合大模型推理时间的特点。"
    },
    "costEfficiency": {
      "score": 80,
      "level": "reasonable",
      "analysis": "在开源模型中，Llama 3 70B在性能和效果之间取得了很好的平衡。虽然部署和运维70B模型需要较高的硬件成本（2张A100）和电力成本，但相比于其能够替代的人工客服成本，ROI是可观的。一个AI客服可以7x24小时工作，处理量是人工的数十倍。如果预算进一步受限，可以考虑Llama 3 8B或Mistral 7B等更小的模型，但可能会在复杂问题处理上有所牺牲。"
    }
  },
  "criticalIssues": [],
  "warnings": [],
  "recommendations": [
    "优先实现RAG方案：将内部知识库向量化，使用语义检索+Llama 3 70B生成答案。",
    "使用高效推理框架：采用vLLM或TGI等框架来部署模型，以达到所需的性能。",
    "设置置信度阈值，不确定的问题转人工处理，保证服务质量。",
    "收集上线后的真实对话数据，持续扩充知识库和评估微调的必要性。"
  ]
}
\`\`\`

---

## 案例4：复杂场景分阶段实施 - 医疗领域

**输入：**
- 业务场景：医疗问诊助手，包括症状理解、疾病知识问答、用药建议、检查项目推荐
- 模型：ERNIE-4.5-VL-424B-A47B-PT（424B参数，多模态，128K上下文）
- 数据：3000条医患对话记录，已标注
- QPS需求：30，并发：60
- 硬件配置：H800 80GB x 8张

**输出：**
\`\`\`json
{
  "score": 55,
  "summary": "医疗场景具有极高的风险和专业性，当前方案存在数据量严重不足和部分功能（如AI直接诊断）不建议实施的问题。建议严格限定AI的应用范围，从低风险的知识问答和信息整理入手，并大幅扩充高质量、经过专业审核的训练数据。",
  "dimensions": {
    "modelTaskAlignment": {
      "score": 80,
      "status": "matched",
      "analysis": "医疗问诊助手需要理解复杂的医学术语、患者症状描述，并进行医学知识推理。ERNIE-4.5-VL作为顶级的多模态模型，其强大的语言理解和推理能力与这些需求高度匹配。特别是在理解患者的口语化症状描述、关联多个症状进行初步分析、解释医学概念等方面表现优秀。但需要明确的是，AI不能替代医生进行诊断，只能作为辅助工具，这个定位必须清晰。"
    },
    "llmNecessity": {
      "score": 85,
      "status": "necessary",
      "analysis": "医疗场景的复杂性和专业性决定了必须使用大语言模型。患者的症状描述千差万别，需要强大的语言理解能力。医学知识推理需要在海量医学知识中进行检索和推理，小模型难以胜任。此外，医学解释需要将专业术语转化为患者能理解的语言，这也是大模型的强项。传统规则引擎缺乏灵活性和解释能力，无法应对医疗场景的多样性。"
    },
    "fineTuning": {
      "score": 45,
      "necessary": true,
      "dataAdequacy": "insufficient",
      "analysis": "医疗领域的专业性和复杂性决定了必须进行微调。然而，3000条医患对话记录对于医疗领域来说严重不足。医学涵盖数千种疾病、数万种症状组合，3000条数据无法覆盖常见疾病的变化。建议至少扩充到10000条以上，且必须由专业医生审核标注质量，确保诊断建议的准确性。数据不足导致的误诊风险在医疗场景中是不可接受的。"
    },
    "implementationRoadmap": {
      "score": 70,
      "feasible": true,
      "analysis": "医疗场景的特殊性要求必须严格区分不同功能的风险等级，分阶段实施是正确的策略。低风险功能（知识问答、症状收集）可以先上线。中风险功能（检查推荐）需要更多数据和医生审核。高风险功能（诊断、用药剂量）则不应由AI直接给出。这种分层策略既能控制风险，又能逐步推进。",
      "phases": {
        "shortTerm": [
          "低风险功能(1-2个月)：基于权威医学知识库（如丁香医生、默沙东诊疗手册）的RAG实现疾病知识问答。",
          "症状信息收集和结构化：帮助患者整理症状描述，生成结构化病历，但不给出诊断结论。",
          "配置明显的免责声明：'本系统仅供参考，不能替代医生诊断，请及时就医'。"
        ],
        "midTerm": [
          "中风险功能(3-6个月)：检查项目推荐（基于症状和疾病知识库），但必须经医生审核后给出。",
          "数据扩充：收集真实使用数据，扩充训练集到10000条以上。"
        ],
        "notRecommended": [
          "不建议AI直接给患者：疾病诊断结论、具体用药建议（药物名称和剂量）- 医疗责任和伦理风险极高。",
          "这些功能只能作为医生的辅助工具，显示在医生端界面，不能直接呈现给患者。"
        ]
      }
    },
    "performanceRequirements": {
      "score": 85,
      "reasonable": true,
      "analysis": "QPS 30、并发60对于医疗咨询场景是非常合理的中等负载需求。医疗对话往往比普通客服更长、更复杂，因此并发数是QPS的2倍是合理的。这个负载可以支持每天约260万次对话，对于单个医疗机构或在线问诊平台来说是足够的。8张H800的配置足以支撑ERNIE 4.5这种巨型模型的推理需求。"
    },
    "costEfficiency": {
      "score": 75,
      "level": "reasonable",
      "analysis": "医疗场景选用ERNIE-4.5-VL这种顶级模型是合理的，因为准确性要求极高，任何错误都可能导致严重后果。虽然部署和运维成本极高（需要一个完整的H800服务器节点，价值数百万），但相比医疗事故的潜在损失和资深医生的培养成本，这个投入是值得的。AI可以7×24小时提供初步筛查和知识问答，节省医生大量时间用于处理复杂病例，ROI是可观的。"
    },
    "domainConsiderations": {
      "score": 60,
      "applicable": true,
      "analysis": "医疗是高度敏感和强监管的领域，AI应用必须特别谨慎。法律风险：AI给出的错误建议可能导致误诊、延误治疗，造成医疗事故。伦理问题：患者生命健康高于一切。因此必须配置多重保障措施：(1)强制的人工审核机制 (2)明显的免责声明 (3)完整记录所有交互用于追溯 (4)建立AI伦理委员会。这些措施会增加实施成本，但在医疗场景中是必不可少的。"
    }
  },
  "criticalIssues": [
    "数据量严重不足：3000条医患对话无法覆盖医疗领域复杂性，存在误诊风险。"
  ],
  "warnings": [
    "医疗场景法律风险高，AI诊断和用药建议不能直接给患者，必须有医生审核。",
    "需要明确的用户告知和免责声明。"
  ],
  "recommendations": [
    "数据扩充：将医患对话数据扩充到10000条以上，并请医生审核标注质量。",
    "短期先实现低风险功能：基于权威医学知识库RAG的知识问答、症状信息收集。",
    "配置强制的人工审核机制：所有涉及诊断、用药的建议必须医生审核后才能给出。",
    "明确产品定位：AI是辅助医生，而非替代医生。",
    "用户界面需明确告知：本系统仅供参考，不能替代医生诊断。"
  ]
}
\`\`\`

---

## 案例5：数据量不足 - 金融风控

**输入：**
- 业务场景：信用卡欺诈检测，分析交易描述和用户行为判断异常
- 模型：Llama 3 8B（8B参数，纯文本，8K上下文，开源）
- 数据：800条标注的欺诈案例，已治理
- QPS需求：200，并发：400

**输出：**
\`\`\`json
{
  "score": 40,
  "summary": "方案存在严重问题：数据量严重不足，模型选择不当，性能需求与模型能力不匹配。金融风控场景风险高，需重新规划。",
  "dimensions": {
    "modelTaskAlignment": {
      "status": "partial",
      "analysis": "欺诈检测需要理解交易描述和行为模式，Llama 3 8B有一定文本理解能力，但金融场景需要更强的推理能力。"
    },
    "llmNecessity": {
      "status": "debatable",
      "analysis": "欺诈检测是分类任务，传统机器学习（XGBoost、随机森林）配合特征工程效果可能更好，且推理速度快、成本低。如果交易描述文本信息很重要，可以用BERT等小模型提取文本特征后结合传统模型。",
      "alternatives": "建议使用传统机器学习模型（XGBoost/LightGBM）+ BERT文本特征的组合方案，性能更高、可解释性更强。"
    },
    "fineTuning": {
      "necessary": true,
      "dataAdequacy": "insufficient",
      "analysis": "金融欺诈检测必须针对具体业务微调或训练。800条样本严重不足，欺诈模式多样，至少需要5000-10000条样本才能训练出可靠模型。且需要正负样本均衡。"
    },
    "implementationRoadmap": {
      "feasible": false,
      "analysis": "当前数据量和技术方案都不足以支撑金融风控场景的可靠性要求。",
      "phases": {
        "notRecommended": [
          "800条数据训练的模型不能直接用于生产环境，误判率会很高"
        ]
      }
    },
    "performanceRequirements": {
      "reasonable": false,
      "analysis": "QPS 200对于Llama 3 8B的推理速度是巨大挑战，需要大量GPU资源。而且并发400相对QPS 200过高（应该在400-600之间更合理）。金融场景需要毫秒级响应，大模型推理延迟可能不满足要求。"
    },
    "costEfficiency": {
      "level": "high",
      "analysis": "部署Llama 3 8B支持QPS 200需要大量GPU，成本很高。传统机器学习方案CPU即可，成本低90%以上。"
    },
    "domainConsiderations": {
      "applicable": true,
      "analysis": "金融风控是强监管领域，模型需要可解释性。大模型的黑盒特性可能不符合监管要求。传统机器学习模型可以提供特征重要性、决策路径，更适合金融场景。"
    }
  },
  "criticalIssues": [
    "数据量严重不足：800条样本无法训练可靠的欺诈检测模型",
    "性能需求不匹配：QPS 200对大模型推理是巨大挑战，延迟可能不满足要求",
    "技术选型不当：欺诈检测不一定需要大模型，传统ML可能更合适"
  ],
  "warnings": [
    "金融风控需要模型可解释性，大模型的黑盒特性可能不符合监管要求",
    "并发数相对QPS过高，可能配置有误"
  ],
  "recommendations": [
    "重新评估技术方案：考虑使用传统机器学习（XGBoost/LightGBM）+ 特征工程",
    "如果需要利用交易描述文本，使用BERT提取文本特征后输入传统模型",
    "数据积累：扩充欺诈样本到至少5000-10000条，保证正负样本均衡",
    "传统ML方案优势：推理速度快（毫秒级）、成本低、可解释性强、符合监管要求",
    "短期可先用规则引擎 + 少量ML模型建立基线系统，边运行边积累数据",
    "重新评估性能需求：确认QPS和并发数的真实需求"
  ]
}
\`\`\`

请严格参考以上案例的风格和深度进行评估。`

/**
 * 构建用户评估Prompt（只包含当前用户的具体需求）
 */
function buildEvaluationPrompt(
  req: EvaluationRequest,
  resourceFeasibilityScore: number
): string {
  const qualityStr = req.businessData.quality === "high" ? "已治理" : "未治理"
  const dataDescription = req.businessData.description || "未提供数据描述"

  // 获取模型信息
  const modelInfo = formatModelInfo(req.model)

  return `# 现在请评估以下项目

## 模型信息
${modelInfo}

## 用户需求
**业务场景：** ${req.businessScenario}

**训练数据：** ${dataDescription}，数据质量：${qualityStr}

**性能需求：** TPS ${req.performanceRequirements.tps}，并发 ${req.performanceRequirements.concurrency}

**硬件配置：** ${req.hardware} × ${req.cardCount}张

---

## 硬件资源可行性评估（预计算结果）
- **硬件资源可行性得分**：${Math.round(resourceFeasibilityScore)} / 100
- **说明**：这个分数已经通过精确计算得出（基于显存占用率、模型大小等），请直接采纳该分数作为"硬件资源可行性"维度的评分。你只需简要说明硬件是否充足即可，无需展开讨论显存细节。重点是，硬件资源不足不应影响其他维度（如模型选型匹配度）的独立评估。

---

请严格参考以上案例的评估深度和风格，对当前项目进行全面评估。

## 关键要求

1. **评分准确性**：评分要准确反映方案质量
   - 0-30分：致命错误（如类型根本不匹配）
   - 40-59分：严重问题需要重大调整
   - 60-79分：有明显问题但可优化
   - 80-89分：整体合理有小改进空间
   - 90-100分：方案优秀

2. **分析连贯性**：每个维度的analysis字段用2-4句连贯的话深入分析（100-200字）
   - 不要写短句列表，要写完整段落
   - 要解释"为什么"，不仅说"是什么"
   - 要有逻辑推理过程

3. **实施路径**：如果业务场景复杂，必须在implementationRoadmap中给出清晰的分阶段路径
   - shortTerm: 低风险、快速见效的部分（1-2个月）
   - midTerm: 需要更多积累的部分（3-6个月）
   - notRecommended: 高风险不建议做的部分

4. **问题分层**：
   - criticalIssues: 只放阻断性、无法继续的问题
   - warnings: 需要注意但不阻断的问题

5. **建议可操作**：recommendations要具体可执行（3-5条）
   - 说明"做什么"+ "为什么这样做"
   - 不要泛泛而谈如"建议优化"

请直接输出JSON格式的评估结果，不要有任何其他文字。`
}
