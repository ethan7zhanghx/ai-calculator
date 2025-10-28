/**
 * 技术方案评估器
 * 使用百度千帆ERNIE-4.5进行深度评估，基于Few-Shot Learning
 */

import type { EvaluationRequest } from "./types"
import { formatModelInfo } from "./model-knowledge-base"
import { fetchWithRetry } from "./api-retry"
import { calculateResourceFeasibility } from "./resource-calculator"

export interface TechnicalEvaluationResult {
  score: number; // 0-100, 综合评分
  summary: string; // 核心评估结论

  dimensions: {
    // 1. 技术可行性
    technicalFeasibility: {
      score: number;
      analysis: string;
      // 推荐的技术路线和实施路径
      implementationPath: {
        paradigm: "RAG" | "Fine-tuning" | "Agent" | "General" | "Not Recommended";
        shortTerm?: string[];
        midTerm?: string[];
      };
    };
    // 2. 大模型必要性
    llmNecessity: {
      score: number;
      analysis: string;
      alternatives?: string; // 非LLM替代方案
    };
    // 3. 模型适配度
    modelFit: {
      score: number;
      analysis: string;
    };
    // 4. 数据质量与充足性
    dataAdequacy: {
      score: number;
      analysis: string;
      // 对数据质量和数量的单独评估
      qualityAssessment: string;
      quantityAssessment: string;
    };
    // 5. 硬件与性能匹配度
    hardwarePerformanceFit: {
      score: number;
      analysis: string;
      // 当硬件不足时，提供具体建议
      recommendations?: string[];
    };
    // 6. 实施风险
    implementationRisk: {
      score: number;
      analysis: string;
      riskItems: string[];
    };
  };

  criticalIssues: string[]; // 阻断性问题
  recommendations: string[]; // 总体建议
}

/**
 * 使用ERNIE-4.5评估技术方案
 */
export async function evaluateTechnicalSolution(
  req: EvaluationRequest,
  modelName: string
): Promise<TechnicalEvaluationResult> {
  const apiKey = process.env.QIANFAN_API_KEY

  if (!apiKey) {
    throw new Error("QIANFAN_API_KEY 环境变量未设置")
  }

  try {
    // 计算总卡数
    const totalCards = req.machineCount * req.cardsPerMachine

    // 1. 首先计算资源可行性
    const resourceFeasibility = calculateResourceFeasibility(
      req.model,
      req.hardware,
      totalCards,
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
    const prompt = buildEvaluationPrompt(req, totalCards, resourceFeasibilityScore)

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
          model: modelName,
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

    // 添加调试日志，记录AI返回的原始内容
    console.log("技术评估AI返回原始内容:", content)
    console.log("内容长度:", content?.length || 0)
    console.log("内容类型:", typeof content)

    // 检查内容是否为空或无效
    if (!content || content.trim() === '') {
      throw new Error("AI返回了空内容，可能是API问题或prompt过长")
    }

    // 直接解析JSON，和商业评估模块保持一致
    const result = JSON.parse(content) as TechnicalEvaluationResult
    return result
  } catch (error) {
    console.error("技术评估失败:", error)

    // 如果是JSON解析错误,提供更详细的信息
    if (error instanceof SyntaxError) {
      console.error("JSON解析错误详情:")
      console.error("- 错误消息:", error.message)
      console.error("- 原始内容:", error.message.includes("AI返回了空内容") ? "空内容" : "解析失败的内容")
      throw new Error(`AI返回的JSON格式无效: ${error.message}`)
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
const SYSTEM_PROMPT = `你是一位顶级的AI技术架构师，你的任务是评估用户提交的AI项目技术方案。

## 核心评估原则

1.  **提供可行的解决方案**：当发现问题时，不能只说“不行”，必须提供具体、可操作的解决方案。例如，硬件不足时，应明确建议“增加XX型号硬件到XX数量”或“采用XX量化技术降低显存”等。
2.  **聚焦核心三要素**：评估应始终围绕以下三个核心：
    *   **模型选型合理性**：选择的模型是否适合业务场景？
    *   **数据质量与策略**：数据是否满足项目需求？数据处理策略是否正确？
    *   **技术路线合理性**：选择的技术范式（RAG, Fine-tuning, Agent等）是否是当前场景的最优解？
3.  **推荐最佳实践**：基于对业务场景的理解，主动推荐当前场景下最合理的技术方案（如RAG、微调、Agent等），并给出清晰的实施路径（分阶段、可落地）。
4.  **风险导向**：敏锐地识别并指出技术方案中潜在的实施风险，并提供规避建议。

## 评估维度、权重与评分标准

你需要从以下6个维度进行评估，并严格按照评分标准为每个维度打分（0-100分）：

1.  **技术可行性 (25%)**: 综合评估整个方案能否技术上实现。
    *   **90-100分**: 方案清晰，技术成熟，短期（1-2个月）内可高质量落地。
    *   **70-89分**: 方案可行，但存在一定挑战（如需技术攻关），中期（3-6个月）可落地。
    *   **50-69分**: 方案存在较大不确定性，需要大量技术预研，落地周期和效果无法保证。
    *   **< 50分**: 方案在技术上不可行或存在根本性缺陷。

2.  **LLM必要性 (15%)**: 判断该业务场景是否真的需要大模型。
    *   **90-100分**: 核心问题必须由LLM解决，无传统方法或简单模型可以替代。
    *   **70-89分**: LLM是当前场景的最佳方案，但存在复杂的传统方法可以部分实现。
    *   **50-69分**: LLM能带来一定效果提升，但简单的规则或传统机器学习方法也能基本解决。
    *   **< 50分**: 完全没必要使用LLM，是典型的“高射炮打蚊子”，过度设计。

3.  **模型适配度 (20%)**: 评估用户选择的具体模型是否是该场景下的最佳选择。
    *   **90-100分**: 模型完美适配场景，在能力、成本、模态（文本/视觉）和上下文长度上都是最佳选择。
    *   **70-89分**: 模型基本适配，但存在更优或更经济的选择（如用专业模型替代通用模型）。
    *   **50-69分**: 模型与场景有明显不匹配（如能力冗余、上下文窗口不足、成本过高）。
    *   **< 50分**: 模型与场景根本不匹配（如用纯文本模型处理视觉任务）。

4.  **数据质量与充足性 (15%)**: 评估数据是否满足项目需求。
    *   **90-100分**: 数据质量高、数量充足，完全满足方案需求（无论是训练还是RAG）。
    *   **70-89分**: 数据基本可用，但质量或数量存在一些瑕疵，需要进一步清洗或扩充。
    *   **50-69分**: 数据存在明显缺陷（如量少、质差、标注错误），对模型效果有较大负面影响。
    *   **< 50分**: 数据完全不可用或严重不足，无法支撑方案实施。

5.  **硬件与性能匹配度 (15%)**: 评估硬件配置能否满足性能要求。
    *   **90-100分**: 硬件资源充裕，可轻松满足甚至远超性能目标。
    *   **70-89分**: 硬件资源紧张，但通过量化等软件优化手段可以满足性能目标。
    *   **50-69分**: 硬件资源不足，即使优化也难以满足性能目标，需要增加硬件。
    *   **< 50分**: 硬件资源严重不足，完全无法满足性能目标，方案不可行。

6.  **实施风险 (10%)**: 识别纯粹的**技术实现风险**，如模型幻觉、数据偏见、技术栈复杂度、依赖库稳定性等。（注意：合规、法律等非技术风险不在此评估范畴）。
    *   **90-100分**: 技术风险极低，关键组件有成熟的备用方案。
    *   **70-89分**: 存在已知的技术风险（如模型幻觉、数据漂移），但有明确的监控和缓解措施。
    *   **50-69分**: 存在较大的技术债或不确定性（如依赖不稳定的开源库、缺乏关键技术专家）。
    *   **< 50分**: 存在阻断性的技术缺陷（如核心算法不可靠、有严重的数据安全隐患）。

**总分计算**：按上述权重加权平均得出。

## 输出要求

1.  **总分(score)**: 按权重加权平均计算的总分(0-100)。
2.  **总结(summary)**: 用2-3句话总结核心评估结论、主要亮点和关键风险。
3.  **维度分析(dimensions)**:
    *   **technicalFeasibility**: 在\`analysis\`中深入分析技术路线的合理性。在\`implementationPath\`中明确推荐一种技术范式(\`paradigm\`)，并给出\`shortTerm\`（1-2个月）和\`midTerm\`（3-6个月）的可行步骤。
    *   **llmNecessity**: 在\`analysis\`中分析必要性。如果非必要，在\`alternatives\`中提供具体的替代方案（如“XGBoost模型”、“BERT分类器”、“PaddleOCR”）。
    *   **modelFit**: 在\`analysis\`中分析模型选型是否合理，包括模型尺寸是否合适、模型模态是否合适。
    *   **dataAdequacy**: 在\`analysis\`中分析数据策略。对应业务场景是否有必要微调，如果需要微调，在\`qualityAssessment\`和\`quantityAssessment\`中分别对数据质量和数量给出简短评价。
    *   **hardwarePerformanceFit**: 在\`analysis\`中分析硬件与性能的匹配度。如果存在不匹配，必须在\`recommendations\`数组中提供具体、可操作的建议。
    *   **implementationRisk**: 在\`analysis\`中总结**纯技术风险**，并在\`riskItems\`中列出具体风险点。
4.  **关键问题(criticalIssues)**: 只列出导致方案无法实施或需要推倒重来的阻断性问题。
5.  **总体建议(recommendations)**: 提供3-5条全局性的、可操作的最终建议。

请严格按照以上要求，必须以JSON格式输出评估结果。
`

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
  "score": 15,
  "summary": "技术方案存在根本性致命错误，完全无法实施。核心需求是理解图片内容，但所选的Llama 3 8B是纯文本模型，无法处理图像输入。必须更换为支持视觉的多模态模型。",
  "dimensions": {
    "technicalFeasibility": {
      "score": 0,
      "analysis": "当前方案完全不可行。核心任务是'看图说话'，但选择的Llama 3 8B模型是'盲人'，无法接收图像作为输入。因此，整个技术路线从根基上就是错误的，无法构建出任何有效的产品。",
      "implementationPath": {
        "paradigm": "Not Recommended",
        "shortTerm": [],
        "midTerm": []
      }
    },
    "llmNecessity": {
      "score": 90,
      "analysis": "使用大模型的技术方向是正确的。图片描述生成需要复杂的视觉理解和流畅的自然语言组织能力，这正是多模态大模型的优势所在，传统CV+NLG方案难以企及。",
      "alternatives": "传统计算机视觉（如目标检测+模板填充）方案效果差，无法生成自然描述。"
    },
    "modelFit": {
      "score": 0,
      "analysis": "模型适配度为零。Llama 3 8B是纯文本模型，而业务场景是典型的多模态任务。模型的能力与任务需求存在根本性的、不可调和的矛盾。"
    },
    "dataAdequacy": {
      "score": 80,
      "analysis": "数据准备是合理的。8000张图文对数据对于微调一个多模态模型来说是充足的，可以有效学习特定商品的描述风格。但由于模型选型错误，这些高质量数据目前无法被利用。",
      "qualityAssessment": "数据已治理，质量高。",
      "quantityAssessment": "8000条样本对于微调任务充足。"
    },
    "hardwarePerformanceFit": {
      "score": 70,
      "analysis": "硬件配置本身是强大的，足以支撑一个中等规模的多模态模型。但由于当前模型选型错误，讨论硬件与性能的匹配度意义不大。更换为合适的多模态模型后，此硬件配置大概率能满足性能需求。",
      "recommendations": []
    },
    "implementationRisk": {
      "score": 10,
      "analysis": "实施风险极高，因为当前方案100%会失败。主要风险是团队对模型能力边界缺乏基本认知，可能导致项目资源完全浪费。",
      "riskItems": [
        "模型选型存在根本性错误，导致项目无法启动。",
        "团队可能缺乏对不同类型AI模型能力边界的基本了解。"
      ]
    }
  },
  "criticalIssues": [
    "模型类型根本性错误：Llama 3 8B是纯文本模型，完全不支持图像输入，无法完成任务。"
  ],
  "recommendations": [
    "立即停止当前方案，更换为支持视觉输入的多模态大模型，如ERNIE-4.5-VL系列或Qwen-VL系列。",
    "重新评估技术路线，确保团队对模型的基本能力（如模态）有正确认知。",
    "保留现有高质量数据，用于在新选定的多模态模型上进行微调。"
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
  "summary": "技术方案存在严重的过度设计和成本效益问题。情感分析是简单的文本分类任务，使用685B参数的超大模型是典型的高射炮打蚊子，导致TCO（总体拥有成本）极高。建议立即更换为小型模型或传统机器学习方法。",
  "dimensions": {
    "technicalFeasibility": {
      "score": 70,
      "analysis": "方案在技术上是可行的，但极其不经济。正确的实施路径是放弃大模型，转向轻量级方案，这样能以低得多的成本和复杂度达成同样的目标。",
      "implementationPath": {
        "paradigm": "General",
        "shortTerm": [
          "使用传统机器学习方法（如NBSVM）或微调一个小型模型（如Mistral 7B），快速建立基线系统。",
          "在单张消费级或企业级GPU上部署，满足性能需求。"
        ]
      }
    },
    "llmNecessity": {
      "score": 30,
      "analysis": "情感分析任务完全不需要大语言模型。这是一个已经非常成熟的NLP任务，使用传统机器学习或小型预训练模型是业界标准，效果好、成本低、速度快。",
      "alternatives": "优先推荐：基于NBSVM的传统机器学习模型。次选方案：微调一个小型模型，如Mistral 7B或ERNIE-4.5-0.3B-PT。"
    },
    "modelFit": {
      "score": 20,
      "analysis": "模型与任务严重不匹配。DeepSeek-V3.2-Exp为处理复杂推理而生，用它做简单分类，99%的能力都被浪费。这不仅无法带来效果提升，反而会因模型过大导致推理延迟增加。"
    },
    "dataAdequacy": {
      "score": 90,
      "analysis": "数据准备非常充分。10万条已标注数据足以训练一个高性能的情感分类器，无论是传统模型还是小型语言模型。这是本方案为数不多的亮点。",
      "qualityAssessment": "数据已标注，质量高。",
      "quantityAssessment": "10万条样本对于分类任务非常充足。"
    },
    "hardwarePerformanceFit": {
      "score": 40,
      "analysis": "为了用超大模型满足QPS 100的需求，8张H800的配置可能依然紧张，且运维成本极高。而如果采用推荐的小型模型方案，单张A100甚至RTX 4090即可轻松满足，成本效益天差地别。",
      "recommendations": [
        "放弃使用H800集群的方案，改用单张主流GPU（如A100）部署小型模型。"
      ]
    },
    "implementationRisk": {
      "score": 50,
      "analysis": "主要风险在于成本失控和技术栈过于复杂。维护一个超大模型的推理集群需要顶尖的MLOps团队，对于一个简单任务来说，这种投入完全没有必要。",
      "riskItems": [
        "总体拥有成本（TCO）过高，ROI为负。",
        "维护超大模型推理服务的技术复杂度与任务价值不匹配。"
      ]
    }
  },
  "criticalIssues": [
    "成本效益严重不合理：使用685B模型处理简单分类任务，TCO是合理方案的数十倍以上。"
  ],
  "recommendations": [
    "立即放弃使用DeepSeek-V3.2-Exp模型的方案。",
    "技术选型变更为：微调一个小型模型（如Mistral 7B）或使用传统机器学习方法（如NBSVM）。",
    "基于新方案重新进行成本和ROI分析，关注TCO。",
    "在选定的小型模型上进行性能测试，确保满足QPS 100的需求。"
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
  "score": 92,
  "summary": "这是一个非常合理且成熟的技术方案。模型选择、硬件配置和技术路线（RAG）三者匹配度高。Llama 3 70B的强大能力结合RAG是当前客服场景的最佳实践之一。建议优先上线RAG，并根据线上效果决定是否需要微调。",
  "dimensions": {
    "technicalFeasibility": {
      "score": 95,
      "analysis": "方案技术上完全可行，且实施路径清晰。RAG是解决基于知识库问答最成熟的技术范式，可以快速上线并保证答案的准确性和可追溯性。建议分阶段实施，先上线核心问答，再逐步优化。",
      "implementationPath": {
        "paradigm": "RAG",
        "shortTerm": [
          "将内部知识库文档进行切块和向量化，存入向量数据库。",
          "构建检索模块，根据用户问题检索最相关的知识片段。",
          "将问题和检索到的知识片段组合成Prompt，调用Llama 3 70B生成最终答案。"
        ],
        "midTerm": [
          "收集线上真实问答数据，分析RAG的失败案例（如检索不准、答案不佳）。",
          "如果答案生成风格不佳，可使用积累的对话数据对Llama 3 70B进行LoRA微调。",
          "优化检索算法，例如引入重排（rerank）模型提升检索精度。"
        ]
      }
    },
    "llmNecessity": {
      "score": 90,
      "analysis": "客服场景的开放性和复杂性决定了必须使用大语言模型。传统基于意图识别的Chatbot无法处理多样化的用户提问，而大模型能理解各种口语化表达，并生成个性化、流畅的回复。",
      "alternatives": "传统NLU+规则引擎方案灵活性差，用户体验不佳。"
    },
    "modelFit": {
      "score": 95,
      "analysis": "Llama 3 70B是当前开源模型中的佼佼者，其强大的语言理解、推理和生成能力非常适合客服场景。它能准确理解用户意图，并生成符合逻辑、语气自然的回复。"
    },
    "dataAdequacy": {
      "score": 85,
      "analysis": "对于首选的RAG方案，外部知识库的质量是关键，而6000条QA对话数据则为后续优化（微调）提供了宝贵的资源。即使不微调，这些数据也可用于构建评估集，衡量RAG系统的效果。",
      "qualityAssessment": "QA对话记录已治理，质量高，可用于评估或微调。",
      "quantityAssessment": "6000条数据对于微调任务是充足的。"
    },
    "hardwarePerformanceFit": {
      "score": 90,
      "analysis": "QPS 50、并发100的需求对于70B模型有一定挑战，但2张A100 80GB的配置，配合vLLM等高效推理框架，是完全可以满足的。该硬件配置为后续可能的模型升级或增加其他AI任务预留了空间。",
      "recommendations": [
        "必须使用vLLM或TensorRT-LLM等高效推理框架来部署模型。",
        "可以考虑开启FP8/INT8量化，在几乎不损失效果的情况下提升吞吐量。"
      ]
    },
    "implementationRisk": {
      "score": 90,
      "analysis": "整体实施风险较低。RAG是成熟的技术，社区工具链丰富。主要风险在于知识库的维护和更新，需要建立一套流程确保知识的时效性。",
      "riskItems": [
        "知识库更新不及时，可能导致AI回答过时信息。",
        "语义检索在某些模糊问题下可能召回不相关的知识片段。"
      ]
    }
  },
  "criticalIssues": [],
  "recommendations": [
    "优先实现RAG方案，这是最快见效、最灵活的路径。",
    "采用vLLM或TensorRT-LLM等高效推理框架进行部署，以确保性能达标。",
    "建立知识库的持续更新和维护流程。",
    "设置置信度阈值，对于AI不确定的问题，应提供转人工客服的通道。"
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
  "summary": "方案在技术选型上合理，但对医疗场景的风险和复杂性认识不足。数据量严重不足，且部分设想功能（如AI直接给用药建议）风险极高，不应实施。建议严格限定AI的应用范围，从低风险的知识问答入手，并大幅扩充高质量数据。",
  "dimensions": {
    "technicalFeasibility": {
      "score": 65,
      "analysis": "技术路线需要严格分层。低风险的知识问答可通过RAG实现，但高风险的诊断、用药建议功能，AI不应直接参与决策。必须将AI定位为医生'辅助'工具，而非'替代'。",
      "implementationPath": {
        "paradigm": "RAG",
        "shortTerm": [
          "基于权威医学知识库（如默沙东诊疗手册）构建RAG系统，提供疾病、药品知识问答。",
          "开发症状结构化提取功能，帮助患者整理病情描述，但不做任何判断。"
        ],
        "midTerm": [
          "在医生端界面，提供基于RAG的辅助诊断信息，供医生参考。",
          "与医院合作，在合规前提下，安全地扩充高质量、经审核的训练数据至10万条以上。"
        ]
      }
    },
    "llmNecessity": {
      "score": 85,
      "analysis": "医疗场景的复杂性决定了必须使用大模型。它能理解患者口语化的、模糊的症状描述，并能在海量医学知识中进行推理，这是传统方法无法做到的。",
      "alternatives": "传统专家系统或规则引擎无法处理医疗对话的复杂性和多样性。"
    },
    "modelFit": {
      "score": 80,
      "analysis": "选用ERNIE-4.5这种顶级的多模态模型是合理的，因为医疗场景对准确性要求极高。其多模态能力未来可用于解读化验单、影像图片等，有很大潜力。但当前阶段，其能力远未被充分利用。"
    },
    "dataAdequacy": {
      "score": 30,
      "analysis": "数据是本方案最大的短板。医疗领域极其复杂，3000条对话记录无法覆盖常见疾病的冰山一角，用这样的数据训练模型存在巨大的误诊风险，是不可接受的。",
      "qualityAssessment": "数据虽经标注，但质量定义不清晰。",
      "quantityAssessment": "3000条样本对于微调任务严重不足，至少需要5-10万条经过严格审核的数据。"
    },
    "hardwarePerformanceFit": {
      "score": 90,
      "analysis": "硬件配置非常强大，足以支撑ERNIE 4.5这种巨型模型的训练和推理需求，资源是充足的。",
      "recommendations": []
    },
    "implementationRisk": {
      "score": 40,
      "analysis": "技术实施风险极高。主要风险来自模型在严肃医疗场景下的不可靠性（幻觉），以及处理敏感数据时潜在的安全隐患。数据严重不足是导致模型不可靠的根源。",
      "riskItems": [
        "模型幻觉风险：在医疗场景，错误的生成内容可能导致严重后果。",
        "数据偏见风险：训练数据若不均衡，可能导致模型对特定人群产生误判。",
        "数据安全风险：处理高度敏感的医疗数据时，存在数据泄露的技术风险。"
      ]
    }
  },
  "criticalIssues": [
    "数据量严重不足：3000条对话记录无法支撑一个可靠的医疗AI应用，存在巨大误诊风险。",
    "部分功能设想（如AI直接提供用药建议）风险过高，不符合医疗伦理和法规。"
  ],
  "recommendations": [
    "立即调整产品定位：将AI从'决策者'改为'医生助手'，所有建议仅在医生端显示。",
    "严格划分功能边界：短期内只做基于权威知识库的RAG问答，禁止任何诊断、治疗建议。",
    "数据合规与扩充：与医疗机构合作，在合规前提下，将高质量训练数据扩充到10万条以上。",
    "建立AI伦理委员会和风险监控流程。"
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
  "summary": "方案存在多个严重问题：数据量严重不足，无法训练可靠模型；技术选型不当，金融风控更适合传统机器学习；性能需求与模型能力不匹配。不建议按此方案推进。",
  "dimensions": {
    "technicalFeasibility": {
      "score": 40,
      "analysis": "当前方案技术上不可行。800条数据无法训练出能用于生产环境的风控模型。更合理的技术路线是使用经过验证的传统机器学习方法，并建立持续的数据采集和模型迭代机制。",
      "implementationPath": {
        "paradigm": "Not Recommended",
        "shortTerm": [
          "应立即停止基于LLM的方案，转向传统机器学习。",
          "使用现有800条数据和大量正常交易数据，训练一个XGBoost或LightGBM基线模型。"
        ]
      }
    },
    "llmNecessity": {
      "score": 45,
      "analysis": "欺诈检测是典型的结构化数据分类任务，传统机器学习模型（如XGBoost）在该领域是经过长期验证的SOTA方案，其性能、可解释性和成本都优于大模型。",
      "alternatives": "强烈建议使用XGBoost/LightGBM等梯度提升树模型，配合精细的特征工程。"
    },
    "modelFit": {
      "score": 50,
      "analysis": "Llama 3 8B虽然有一定文本理解能力，但对于需要高精度和强可解释性的金融风控场景并非最佳选择。其黑盒特性不符合金融监管要求。"
    },
    "dataAdequacy": {
      "score": 20,
      "analysis": "数据是本方案最致命的短板。对于欺诈检测，不仅需要欺诈样本，还需要海量的正常样本进行对比学习。800条欺诈案例是远远不够的，至少需要数万条。",
      "qualityAssessment": "数据虽已治理，但样本类型单一。",
      "quantityAssessment": "800条欺诈样本严重不足，且缺乏足量的正常样本。"
    },
    "hardwarePerformanceFit": {
      "score": 30,
      "analysis": "QPS 200对于Llama 3 8B是巨大的性能挑战，需要庞大的GPU集群才能满足，成本极高。而金融风控要求毫秒级响应，LLM的延迟可能无法达标。相比之下，传统ML模型在CPU上即可实现更高性能。",
      "recommendations": [
        "放弃使用LLM，改用CPU部署的传统机器学习模型，可大幅降低硬件成本并满足性能要求。"
      ]
    },
    "implementationRisk": {
      "score": 35,
      "analysis": "技术实施风险极高。主要风险来自模型效果不可靠、可解释性差，以及推理延迟可能不满足业务要求，这些都可能导致直接的经济损失。",
      "riskItems": [
        "模型效果风险：在低数据量下训练的模型，其漏报、误报率会很高。",
        "技术可解释性风险：大模型的黑盒特性使其决策过程难以解释，这是一个技术挑战。",
        "性能延迟风险：LLM的推理延迟可能不满足金融风控场景毫秒级的响应要求。"
      ]
    }
  },
  "criticalIssues": [
    "数据量严重不足，无法训练出可靠的风控模型。",
    "技术选型不当，传统机器学习方案在该场景下更优。",
    "性能与成本严重不匹配，LLM方案无法经济地满足金融风控的低延迟、高吞吐要求。"
  ],
  "recommendations": [
    "立即更换技术路线，采用以XGBoost/LightGBM为代表的传统机器学习方案。",
    "建立持续的数据采集策略，将欺诈样本扩充到1万条以上，并保证足量的正常样本。",
    "与业务和法务团队合作，确保模型的可解释性符合金融监管要求。"
  ]
}
\`\`\`

请严格参考以上案例的风格和深度进行评估。
`

/**
 * 构建用户评估Prompt（只包含当前用户的具体需求）
 */
function buildEvaluationPrompt(
  req: EvaluationRequest,
  totalCards: number,
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

**硬件配置：** ${req.hardware}，${req.machineCount}机 × ${req.cardsPerMachine}卡 = ${totalCards}张

---

## 硬件资源可行性评估（预计算结果）
- **硬件资源可行性得分**：${Math.round(resourceFeasibilityScore)} / 100
- **说明**：这个分数已经通过精确计算得出（基于显存占用率、模型大小等），请直接采纳该分数作为"硬件资源可行性"维度的评分。你只需简要说明硬件是否充足即可，无需展开讨论显存细节。重点是，硬件资源不足不应影响其他维度（如模型选型匹配度）的独立评估。

---

请严格参考以上案例的评估深度和风格，对当前项目进行全面评估。`
}
