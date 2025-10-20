/**
 * 技术方案评估器
 * 使用百度千帆ERNIE-4.5进行深度评估，基于Few-Shot Learning
 */

import type { EvaluationRequest } from "./types"
import { formatModelInfo } from "./model-knowledge-base"

export interface TechnicalEvaluationResult {
  score: number // 0-100，用于前端评分条展示

  // 核心评估结论
  summary: string

  // 详细的维度分析
  dimensions: {
    // 1. 模型与业务匹配度
    modelTaskAlignment: {
      status: "matched" | "mismatched" | "partial"
      analysis: string
    }

    // 2. 大模型必要性
    llmNecessity: {
      status: "necessary" | "unnecessary" | "debatable"
      analysis: string
      alternatives?: string
    }

    // 3. 微调评估
    fineTuning: {
      necessary: boolean
      dataAdequacy: "sufficient" | "marginal" | "insufficient"
      analysis: string
    }

    // 4. 业务可行性与实施路径
    implementationRoadmap: {
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
      reasonable: boolean
      analysis: string
    }

    // 6. 成本效益
    costEfficiency: {
      level: "reasonable" | "high" | "excessive"
      analysis: string
    }

    // 7. 领域特殊考虑
    domainConsiderations?: {
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
    const prompt = buildEvaluationPrompt(req)

    const response = await fetch("https://qianfan.baidubce.com/v2/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "ernie-4.5-turbo-128k",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: {
          type: "json_object",
        },
        temperature: 0.3, // 低温度保证一致性
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("千帆API错误:", response.status, errorText)
      throw new Error(`千帆API调用失败: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    const result = JSON.parse(content) as TechnicalEvaluationResult
    return result
  } catch (error) {
    console.error("技术评估失败:", error)
    throw new Error("技术方案评估服务暂时不可用，请稍后重试")
  }
}

/**
 * 系统提示词（固定，会被千帆缓存）
 */
const SYSTEM_PROMPT = `你是一位资深AI技术架构师，擅长评估企业AI项目的技术方案。

你需要从以下7个维度评估技术方案：

1. **模型类型与业务匹配度** - 模型能力是否匹配业务需求（如视觉任务需要多模态模型）
2. **大模型必要性** - 是否真的需要大模型，还是小模型/传统方案就能解决
3. **微调必要性和数据充分性** - 是否需要微调，数据量是否足够
4. **业务可行性与实施路径** - 业务需求是否在技术边界内，如何分阶段实施
5. **性能需求合理性** - QPS和并发数是否匹配，是否符合业务场景
6. **成本效益** - 模型选型的成本是否合理
7. **领域特殊性** - 是否有医疗/金融等特殊领域的考虑

评估原则：
- 实事求是，发现问题要明确指出
- 如果方案有致命错误（如视觉任务选文本模型），评分要低（0-30分）
- 如果方案整体合理但有优化空间，评分中等（60-80分）
- 只有方案非常合理才给高分（85-100分）
- 建议要具体可执行，不要泛泛而谈`

/**
 * 构建评估Prompt（包含Few-Shot案例和当前输入）
 */
function buildEvaluationPrompt(req: EvaluationRequest): string {
  const dataTypesStr = req.businessData.dataTypes
    .map((t) => {
      const map: Record<string, string> = {
        text: "文本",
        image: "图片",
        qa_pair: "QA对话",
        video: "视频",
        audio: "音频",
      }
      return map[t] || t
    })
    .join("、")

  const qualityStr = req.businessData.quality === "high" ? "已治理" : "未治理"

  // 获取模型信息
  const modelInfo = formatModelInfo(req.model)

  return `# Few-Shot 评估案例

## 案例1：致命错误 - 视觉任务选择文本模型

**输入：**
- 业务场景：电商产品图片自动生成描述，用于商品详情页
- 模型：GPT-3.5（纯文本，不支持视觉）
- 数据：8000张产品图片 + 人工标注的描述，已治理
- QPS需求：20，并发：50

**输出：**
\`\`\`json
{
  "score": 15,
  "summary": "技术方案存在致命错误：业务需要图像理解能力，但GPT-3.5是纯文本模型，完全无法处理图片输入。",
  "dimensions": {
    "modelTaskAlignment": {
      "status": "mismatched",
      "analysis": "业务核心需求是理解产品图片并生成描述，这需要视觉理解能力。GPT-3.5是纯文本大语言模型，不具备图像处理能力，无法完成此任务。"
    },
    "llmNecessity": {
      "status": "necessary",
      "analysis": "图片描述生成需要理解视觉内容并生成自然语言，确实需要多模态大模型。"
    },
    "fineTuning": {
      "necessary": true,
      "dataAdequacy": "sufficient",
      "analysis": "电商产品描述有特定的风格和术语，需要微调。8000张图片配标注描述的数据量对于视觉模型微调是充足的。"
    },
    "implementationRoadmap": {
      "feasible": false,
      "analysis": "当前方案完全不可行，必须更换模型后才能继续。",
      "phases": {
        "notRecommended": ["当前方案使用GPT-3.5无法实现任何功能"]
      }
    },
    "performanceRequirements": {
      "reasonable": true,
      "analysis": "QPS 20、并发50对于电商场景是合理的中等负载。"
    },
    "costEfficiency": {
      "level": "reasonable",
      "analysis": "如果使用正确的多模态模型，成本在电商场景ROI可接受范围内。"
    }
  },
  "criticalIssues": [
    "模型类型根本性错误：GPT-3.5无法处理图片输入，无法完成业务需求"
  ],
  "warnings": [],
  "recommendations": [
    "必须更换为多模态模型：GPT-4 Turbo with Vision 或 Claude 3 Sonnet/Opus",
    "使用8000张图片数据进行模型微调，学习产品描述的特定风格",
    "如果预算有限，可考虑开源方案：LLaVA、BLIP-2等视觉语言模型"
  ]
}
\`\`\`

---

## 案例2：技术选型过度 - OCR场景误用大模型

**输入：**
- 业务场景：扫描合同文档进行文字识别和信息提取
- 模型：GPT-4（1.7T参数，多模态，128K上下文）
- 数据：5000份扫描合同，已标注关键信息字段，已治理
- QPS需求：10，并发：20

**输出：**
\`\`\`json
{
  "score": 35,
  "summary": "技术选型不当：OCR文字识别不应使用大语言模型，成本高且效果未必更好。信息提取部分可以考虑使用LLM。",
  "dimensions": {
    "modelTaskAlignment": {
      "status": "partial",
      "analysis": "任务分为两部分：(1)OCR文字识别 (2)信息提取。GPT-4可以做信息提取，但不适合做OCR。"
    },
    "llmNecessity": {
      "status": "unnecessary",
      "analysis": "OCR是成熟的计算机视觉任务，有专门的高效解决方案。只有信息提取部分需要语言理解能力。",
      "alternatives": "OCR部分使用PaddleOCR、Tesseract或云服务OCR API，成本降低95%以上。信息提取部分可以用小模型如GPT-3.5。"
    },
    "fineTuning": {
      "necessary": true,
      "dataAdequacy": "sufficient",
      "analysis": "合同信息提取需要理解特定的法律术语和字段格式，需要微调。5000份标注数据充足。"
    },
    "implementationRoadmap": {
      "feasible": true,
      "analysis": "采用两阶段方案：OCR + 信息提取，技术可行且成本可控。",
      "phases": {
        "shortTerm": [
          "第一阶段(1-2周)：集成OCR方案完成文字识别",
          "第二阶段(2-4周)：使用GPT-3.5 + 微调完成信息提取"
        ],
        "midTerm": [
          "根据提取准确率评估是否需要升级到更大模型"
        ]
      }
    },
    "performanceRequirements": {
      "reasonable": true,
      "analysis": "QPS 10、并发20对于合同处理场景是合理的低负载。"
    },
    "costEfficiency": {
      "level": "excessive",
      "analysis": "直接用GPT-4做OCR成本是专业方案的100倍以上，且准确率未必更高。采用组合方案成本可降低90%。"
    },
    "domainConsiderations": {
      "applicable": true,
      "analysis": "合同处理涉及法律文档，需要高准确率。建议AI提取后人工校验关键字段。"
    }
  },
  "criticalIssues": [
    "技术选型错误：使用GPT-4做OCR文字识别，成本极高且非最优方案"
  ],
  "warnings": [
    "法律文档处理需要高准确率，建议配置人工审核环节"
  ],
  "recommendations": [
    "采用两阶段方案：专业OCR工具(PaddleOCR/云服务) + LLM信息提取",
    "信息提取部分使用GPT-3.5微调即可，无需GPT-4",
    "用5000份标注数据微调模型，学习合同特定术语和字段格式",
    "配置人工审核关键字段（如金额、日期、主体），确保准确性"
  ]
}
\`\`\`

---

## 案例3：合理方案 - 客服场景

**输入：**
- 业务场景：智能客服机器人，处理售后咨询和常见问题解答
- 模型：Claude 3 Sonnet（200B参数，多模态，200K上下文）
- 数据：6000条QA对话记录，已治理
- QPS需求：50，并发：100

**输出：**
\`\`\`json
{
  "score": 85,
  "summary": "技术方案整体合理：模型选择恰当，数据量充足，性能需求合理。建议优先使用RAG方案，根据效果决定是否微调。",
  "dimensions": {
    "modelTaskAlignment": {
      "status": "matched",
      "analysis": "客服场景需要语义理解、多轮对话、知识问答能力，Claude 3 Sonnet的文本理解和生成能力完全匹配需求。"
    },
    "llmNecessity": {
      "status": "necessary",
      "analysis": "客服需要处理开放域问题、理解用户意图、生成自然的回复，需要大模型的语言理解能力。小模型难以应对复杂多变的用户咨询。"
    },
    "fineTuning": {
      "necessary": false,
      "dataAdequacy": "sufficient",
      "analysis": "6000条QA对话数据量充足，但建议先尝试RAG（检索增强生成）方案。将QA库向量化后检索+生成，效果可能已经满足需求，且更易维护更新。如果RAG效果不理想，再考虑微调。"
    },
    "implementationRoadmap": {
      "feasible": true,
      "analysis": "技术方案完全可行，建议分阶段实施以控制风险和成本。",
      "phases": {
        "shortTerm": [
          "第一阶段(2-3周)：实现基于RAG的FAQ问答，将6000条QA向量化后检索+生成",
          "配置相似度阈值，低置信度问题转人工"
        ],
        "midTerm": [
          "第二阶段(1-2个月)：根据真实使用反馈，评估是否需要微调模型",
          "如需微调，使用LoRA方式降低成本和难度"
        ]
      }
    },
    "performanceRequirements": {
      "reasonable": true,
      "analysis": "QPS 50、并发100符合中型客服场景的负载特征。并发数约为QPS的2倍，符合大模型2-3秒响应时间的预期。"
    },
    "costEfficiency": {
      "level": "reasonable",
      "analysis": "Claude 3 Sonnet性价比高，成本是Opus的1/5，适合客服场景。QPS 50的API调用成本可控，且客服场景ROI通常为正（节省人力成本）。"
    }
  },
  "criticalIssues": [],
  "warnings": [],
  "recommendations": [
    "优先实现RAG方案：将6000条QA向量化构建知识库，使用语义检索+Claude生成答案",
    "RAG方案的优势：无需微调、易于更新QA库、成本更低",
    "设置置信度阈值，不确定的问题转人工处理，保证服务质量",
    "收集上线后的真实对话数据，持续扩充QA库",
    "如果3个月后RAG效果不理想，再考虑用积累的数据进行微调"
  ]
}
\`\`\`

---

## 案例4：复杂场景分阶段实施 - 医疗领域

**输入：**
- 业务场景：医疗问诊助手，包括症状理解、疾病知识问答、用药建议、检查项目推荐
- 模型：GPT-4（1.7T参数，多模态，128K上下文）
- 数据：3000条医患对话记录，已标注
- QPS需求：30，并发：60

**输出：**
\`\`\`json
{
  "score": 55,
  "summary": "医疗场景具有特殊性，部分功能可实施但需谨慎。症状理解和知识问答可以做，但用药建议和诊断不建议AI直接给出。数据量偏少，需扩充。",
  "dimensions": {
    "modelTaskAlignment": {
      "status": "matched",
      "analysis": "医疗对话需要理解专业术语、推理能力强，GPT-4的能力匹配。"
    },
    "llmNecessity": {
      "status": "necessary",
      "analysis": "医疗场景需要理解复杂的症状描述、医学知识推理，必须使用大模型。"
    },
    "fineTuning": {
      "necessary": true,
      "dataAdequacy": "insufficient",
      "analysis": "医疗领域专业性强，必须微调。但3000条对话无法覆盖医疗领域的复杂性，建议扩充到至少8000-10000条，且需要医生审核标注质量。"
    },
    "implementationRoadmap": {
      "feasible": true,
      "analysis": "医疗场景需要区分不同功能的风险等级，分阶段实施。",
      "phases": {
        "shortTerm": [
          "低风险功能(1-2个月)：疾病知识问答（基于权威医学知识库的RAG）",
          "症状信息收集和结构化（辅助医生，不直接给诊断）"
        ],
        "midTerm": [
          "中风险功能(3-6个月)：检查项目推荐（需医生审核），用药禁忌提示（基于药品说明书）"
        ],
        "notRecommended": [
          "不建议AI直接给出：疾病诊断、用药剂量建议 - 医疗责任和伦理风险高",
          "这些功能只能作为医生的参考，不能直接给患者"
        ]
      }
    },
    "performanceRequirements": {
      "reasonable": true,
      "analysis": "QPS 30、并发60对于医疗咨询场景是合理的中等负载。"
    },
    "costEfficiency": {
      "level": "reasonable",
      "analysis": "医疗场景对准确性要求极高，GPT-4的成本可接受。"
    },
    "domainConsiderations": {
      "applicable": true,
      "analysis": "医疗是高风险领域，涉及法律和伦理问题。必须配置：(1)人工审核机制 (2)明确告知用户AI仅供参考 (3)关键决策（诊断、用药）必须由医生做出 (4)记录所有交互以备审查。"
    }
  },
  "criticalIssues": [
    "数据量不足：3000条医患对话无法覆盖医疗领域复杂性"
  ],
  "warnings": [
    "医疗场景法律风险高，AI诊断和用药建议不能直接给患者",
    "需要明确的用户告知和免责声明"
  ],
  "recommendations": [
    "数据扩充：将医患对话数据扩充到8000-10000条，并请医生审核标注质量",
    "短期先实现低风险功能：疾病知识问答（基于权威医学知识库RAG）、症状信息收集",
    "配置强制的人工审核机制：所有涉及诊断、用药的建议必须医生审核后才能给出",
    "明确产品定位：AI辅助医生，而非替代医生",
    "用户界面需明确告知：本系统仅供参考，不能替代医生诊断",
    "所有交互完整记录，用于质量审查和责任追溯"
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

---

# 现在请评估以下项目

## 模型信息
${modelInfo}

## 用户需求
**业务场景：** ${req.businessScenario}

**训练数据：** ${req.businessData.volume}条${dataTypesStr}数据，${qualityStr}

**性能需求：** QPS ${req.performanceRequirements.qps}，并发 ${req.performanceRequirements.concurrency}

**硬件配置：** ${req.hardware} × ${req.cardCount}张

---

请严格参考以上案例的评估方法和输出格式，对当前项目进行深度评估。

要求：
1. 评分要准确反映方案质量（致命错误0-30分，有问题40-69分，基本合理70-84分，很好85-100分）
2. 每个维度的analysis要详细（100-200字），不要泛泛而谈
3. 如果业务场景复杂，一定要在implementationRoadmap中给出分阶段实施路径
4. criticalIssues只放阻断性问题，warnings放需要注意的问题
5. recommendations要具体可执行，不要只说"建议优化"这种空话

请直接输出JSON格式的评估结果，不要有任何其他文字。`
}
