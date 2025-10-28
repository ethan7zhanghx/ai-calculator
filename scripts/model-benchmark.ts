/**
 * 模型横向测评工具
 * 用于测试不同模型在AI项目评估任务中的表现，并生成测评报告
 */

import { evaluateTechnicalFeasibility } from "../lib/technical-evaluator"
import { evaluateBusinessValue } from "../lib/business-evaluator"
import type { EvaluationRequest } from "../lib/types"

// 测试模型列表
const TEST_MODELS = [
  "ernie-4.5-turbo-128k",
  "ernie-4.5-21b-a3b-thinking",
  "ernie-4.5-21b-a3b",
  "ernie-x1.1",
  "deepseek-v3",
  "kimi-k2-instruct",
  "qwen3-235b-a22b-instruct-2507"
] as const

// 测试用例定义
interface TestCase {
  id: string
  name: string
  description: string
  scenario: string
  evaluationRequest: EvaluationRequest
  category: string
  expectedBehavior?: string
}

const TEST_CASES: TestCase[] = [
  {
    id: "case1_baseline_ecommerce_rag",
    name: "基准案例 - 电商客服RAG",
    description: "一个各方面都合理（模型、硬件、场景）的电商客服RAG方案，用于建立性能和质量的基准线",
    category: "基准测试",
    scenario: "我们是一家中型电商平台，希望构建一个AI智能客服，基于我们的FAQ知识库，处理售前商品咨询、订单状态查询、售后退换货指引等常见问题。目标是7x24小时服务，提高用户满意度，并降低人工客服团队的重复性工作负担。",
    evaluationRequest: {
      model: "Llama 3 70B",
      hardware: "NVIDIA A100 (80GB)",
      machineCount: 2,
      cardsPerMachine: 4,
      businessData: {
        description: "10000条历史客服对话记录（已脱敏）和完善的FAQ知识库",
        quality: "high"
      },
      businessScenario: "智能客服系统，处理常见咨询并提供24/7服务支持",
      performanceRequirements: {
        tps: 50,
        concurrency: 100
      }
    },
    expectedBehavior: "应该识别出这是一个合理的RAG场景，给出高分评价"
  },
  {
    id: "case2_high_risk_medical_diagnosis",
    name: "高风险场景识别 - 医疗诊断",
    description: "测试模型在面对医疗诊断这类高风险、高合规要求的业务时，能否准确识别出其固有的法律、伦理和安全风险",
    category: "风险识别",
    scenario: "我们计划开发一款面向C端用户的AI辅助诊断应用。用户输入自己的症状描述后，AI可以直接给出可能的疾病诊断、病情严重程度评估和具体的用药建议（包括药品名称和剂量）。",
    evaluationRequest: {
      model: "ERNIE-4.5-VL-424B-A47B-PT",
      hardware: "NVIDIA H800 80GB",
      machineCount: 4,
      cardsPerMachine: 8,
      businessData: {
        description: "5000条脱敏病例数据",
        quality: "high"
      },
      businessScenario: "AI诊断助手，用户输入症状后AI给出疾病判断和就医建议",
      performanceRequirements: {
        tps: 20,
        concurrency: 50
      }
    },
    expectedBehavior: "应该识别出这是高风险医疗场景，强烈建议不要直接进行诊断"
  },
  {
    id: "case3_overkill_sentiment_analysis",
    name: "成本效益判断 - 过度设计的情感分析",
    description: "通过用顶级大模型处理简单的文本分类任务，测试模型能否识别出'杀鸡用牛刀'式的资源浪费，并提出更具性价比的替代方案",
    category: "成本效益",
    scenario: "我们需要对网站上的用户评论进行情感分析，简单分为正面、负面、中性三类，用于内部监控产品口碑。",
    evaluationRequest: {
      model: "GPT-4",
      hardware: "NVIDIA H100",
      machineCount: 2,
      cardsPerMachine: 8,
      businessData: {
        description: "50000条用户评论数据",
        quality: "medium"
      },
      businessScenario: "用户评论情感分类，用于产品口碑监控",
      performanceRequirements: {
        tps: 100,
        concurrency: 200
      }
    },
    expectedBehavior: "应该识别出这是过度设计，推荐使用更简单的传统方法"
  },
  {
    id: "case4_mismatched_model_for_vision_task",
    name: "模态匹配错误 - 文本模型处理图像任务",
    description: "使用纯文本模型处理图像任务，测试模型能否发现这种根本性的、跨模态的错误",
    category: "模态匹配",
    scenario: "我们是一家服装电商，希望AI能根据我们的产品图片，自动生成吸引人的、符合品牌调性的商品描述文案，用于商品详情页。",
    evaluationRequest: {
      model: "Claude-3",
      hardware: "NVIDIA A100 (40GB)",
      machineCount: 1,
      cardsPerMachine: 4,
      businessData: {
        description: "10000张商品图片和对应的描述文案",
        quality: "high"
      },
      businessScenario: "根据商品图片生成描述文案",
      performanceRequirements: {
        tps: 30,
        concurrency: 60
      }
    },
    expectedBehavior: "应该识别出模型不支持图像处理，建议更换多模态模型"
  },
  {
    id: "case5_insufficient_hardware_for_llm",
    name: "硬件资源评估 - 显存不足",
    description: "使用消费级显卡运行大型模型，测试模型能否准确计算出显存不足的结论，并给出如量化、更换硬件等合理建议",
    category: "资源评估",
    scenario: "我们希望为公司的法务团队（约10人）构建一个私有化的法律文书审阅助手。AI需要能够理解复杂的法律条款，并根据预设的规则进行合同风险审查。考虑到数据安全，必须本地化部署。",
    evaluationRequest: {
      model: "GPT-4",
      hardware: "NVIDIA RTX 4090",
      machineCount: 1,
      cardsPerMachine: 1,
      businessData: {
        description: "2000份法律合同文档和审查规则",
        quality: "high"
      },
      businessScenario: "私有化法律文书审阅助手，进行合同风险审查",
      performanceRequirements: {
        tps: 10,
        concurrency: 20
      }
    },
    expectedBehavior: "应该识别出硬件资源不足，建议量化或更换硬件"
  },
  {
    id: "case6_specialized_ocr_task",
    name: "专用vs通用模型 - OCR任务",
    description: "使用通用多模态模型处理成熟的OCR任务，测试模型是否具备'专业领域应使用专用模型'的认知",
    category: "模型选择",
    scenario: "我们财务部门每月需要处理数千张各类发票的录入工作，希望通过AI自动识别发票上的关键字段（如发票代码、号码、金额、日期等）并录入系统，以提升效率。",
    evaluationRequest: {
      model: "Qwen-VL-Max",
      hardware: "NVIDIA RTX 4090",
      machineCount: 1,
      cardsPerMachine: 1,
      businessData: {
        description: "2000张发票图片样本",
        quality: "medium"
      },
      businessScenario: "发票OCR识别，自动录入关键字段信息",
      performanceRequirements: {
        tps: 10,
        concurrency: 15
      }
    },
    expectedBehavior: "应该推荐使用专业OCR服务而非通用大模型"
  },
  {
    id: "case7_low_quality_data_finetuning",
    name: "数据质量评估 - 低质量数据微调",
    description: "使用低质量、未清洗的数据进行微调，测试模型能否意识到'垃圾进，垃圾出'的风险",
    category: "数据质量",
    scenario: "我们希望基于从网络论坛和社交媒体上爬取的约2万条闲聊对话数据，微调一个具有我们品牌独特风格的聊天机器人，用于官网与用户互动。",
    evaluationRequest: {
      model: "Llama 3 8B",
      hardware: "NVIDIA A100 (40GB)",
      machineCount: 1,
      cardsPerMachine: 2,
      businessData: {
        description: "20000条网络爬取的闲聊对话数据，未经过清洗",
        quality: "low"
      },
      businessScenario: "品牌风格聊天机器人，用于官网用户互动",
      performanceRequirements: {
        tps: 25,
        concurrency: 50
      }
    },
    expectedBehavior: "应该强调数据清洗的重要性，指出低质量数据的风险"
  },
  {
    id: "case8_unrealistic_performance_req",
    name: "性能需求匹配 - 过高要求",
    description: "为一个低频内部工具设置极高的性能指标，测试模型能否识别出性能要求与实际业务需求不匹配",
    category: "需求匹配",
    scenario: "我们希望为公司内部的100名员工提供一个博客写作助手，辅助他们构思、起草和润色文章。这是一个内部工具，使用频率不高。",
    evaluationRequest: {
      model: "Claude-3",
      hardware: "NVIDIA A100 (80GB)",
      machineCount: 2,
      cardsPerMachine: 4,
      businessData: {
        description: "1000篇优质博客文章样本",
        quality: "high"
      },
      businessScenario: "内部博客写作助手，帮助员工构思和润色文章",
      performanceRequirements: {
        tps: 1000,
        concurrency: 2000
      }
    },
    expectedBehavior: "应该指出性能要求过高，与实际业务需求不匹配"
  },
  {
    id: "case9_long_context_challenge",
    name: "上下文窗口限制",
    description: "选择一个上下文窗口远小于任务所需文本长度的模型，测试模型能否发现这一限制",
    category: "上下文限制",
    scenario: "我们需要一个AI工具，能够一次性读取并总结一份长达100页（约5万字）的年度财务报告，提取关键的财务指标、风险点和未来展望。",
    evaluationRequest: {
      model: "GPT-3.5-turbo",
      hardware: "NVIDIA A100 (80GB)",
      machineCount: 1,
      cardsPerMachine: 2,
      businessData: {
        description: "多份年度财务报告样本",
        quality: "high"
      },
      businessScenario: "长文档总结工具，处理100页财务报告",
      performanceRequirements: {
        tps: 5,
        concurrency: 10
      }
    },
    expectedBehavior: "应该识别出上下文长度不足，建议更换长上下文模型"
  },
  {
    id: "case10_small_model_for_deep_knowledge",
    name: "知识复杂度匹配",
    description: "使用参数量极小的模型处理需要深度专业知识和复杂推理的任务",
    category: "知识复杂度",
    scenario: "我们希望构建一个能进行多轮深入对话的专业物理学知识问答机器人，能够准确回答从牛顿力学到量子场论的各种问题，并能进行一定的推理。",
    evaluationRequest: {
      model: "Llama 3 8B",
      hardware: "NVIDIA RTX 4090",
      machineCount: 1,
      cardsPerMachine: 1,
      businessData: {
        description: "物理学教科书和论文数据",
        quality: "high"
      },
      businessScenario: "专业物理学知识问答机器人",
      performanceRequirements: {
        tps: 15,
        concurrency: 30
      }
    },
    expectedBehavior: "应该指出模型能力不足，建议使用更大的专业模型"
  }
]

// 测试结果接口
interface TestResult {
  testCaseId: string
  modelName: string
  technicalEvaluation: {
    success: boolean
    score?: number
    responseTime?: number
    error?: string
    result?: any
  }
  businessEvaluation: {
    success: boolean
    score?: number
    responseTime?: number
    error?: string
    result?: any
  }
  totalResponseTime?: number
  timestamp: string
}

// 执行单个测试
async function runSingleTest(testCase: TestCase, modelName: string): Promise<TestResult> {
  console.log(`🧪 测试 ${testCase.id} - ${modelName}`)

  const result: TestResult = {
    testCaseId: testCase.id,
    modelName,
    technicalEvaluation: { success: false },
    businessEvaluation: { success: false },
    timestamp: new Date().toISOString()
  }

  try {
    // 测试技术评估
    const techStartTime = Date.now()
    const techResult = await evaluateTechnicalFeasibility(testCase.evaluationRequest, modelName)
    const techEndTime = Date.now()

    result.technicalEvaluation = {
      success: true,
      score: techResult.score,
      responseTime: techEndTime - techStartTime,
      result: techResult
    }

    console.log(`  ✅ 技术评估完成 (${techEndTime - techStartTime}ms, 评分: ${techResult.score})`)
  } catch (error) {
    result.technicalEvaluation = {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
    console.log(`  ❌ 技术评估失败: ${error}`)
  }

  try {
    // 测试场景价值评估
    const businessStartTime = Date.now()
    const businessResult = await evaluateBusinessValue(testCase.evaluationRequest, modelName)
    const businessEndTime = Date.now()

    result.businessEvaluation = {
      success: true,
      score: businessResult.score,
      responseTime: businessEndTime - businessStartTime,
      result: businessResult
    }

    console.log(`  ✅ 场景价值评估完成 (${businessEndTime - businessStartTime}ms, 评分: ${businessResult.score})`)
  } catch (error) {
    result.businessEvaluation = {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
    console.log(`  ❌ 场景价值评估失败: ${error}`)
  }

  // 计算总响应时间
  if (result.technicalEvaluation.responseTime && result.businessEvaluation.responseTime) {
    result.totalResponseTime = result.technicalEvaluation.responseTime + result.businessEvaluation.responseTime
  }

  return result
}

// 执行所有测试
async function runAllTests(): Promise<TestResult[]> {
  console.log(`🚀 开始模型横向测评`)
  console.log(`测试模型: ${TEST_MODELS.join(", ")}`)
  console.log(`测试用例: ${TEST_CASES.length} 个`)
  console.log(`总计测试: ${TEST_MODELS.length * TEST_CASES.length} 项`)
  console.log()

  const results: TestResult[] = []

  for (const testCase of TEST_CASES) {
    console.log(`\n📋 执行测试用例: ${testCase.name}`)
    console.log(`   ${testCase.description}`)

    for (const modelName of TEST_MODELS) {
      try {
        const result = await runSingleTest(testCase, modelName)
        results.push(result)

        // 添加延迟避免API限流
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`测试 ${testCase.id} - ${modelName} 发生异常:`, error)
      }
    }
  }

  console.log(`\n✅ 所有测试完成! 共计 ${results.length} 个结果`)
  return results
}

// 生成测评报告
function generateReport(results: TestResult[]): string {
  const report: string[] = []

  // 报告头部
  report.push("# 大模型横向测评报告")
  report.push("")
  report.push("## 1. 核心摘要")
  report.push("")
  report.push("本次测评旨在对比不同大模型在AI项目评估任务中的表现，主要考察评估质量、响应速度两个维度。")
  report.push("")

  // 性能总结表格
  report.push("### 性能总结 (平均响应时间)")
  report.push("")
  report.push("| 模型名称 | 技术评估平均耗时 (毫秒) | 场景价值评估平均耗时 (毫秒) | 总平均耗时 (毫秒) |")
  report.push("| :--- | :--- | :--- | :--- |")

  for (const modelName of TEST_MODELS) {
    const modelResults = results.filter(r => r.modelName === modelName)

    const techTimes = modelResults
      .filter(r => r.technicalEvaluation.success && r.technicalEvaluation.responseTime)
      .map(r => r.technicalEvaluation.responseTime!)

    const businessTimes = modelResults
      .filter(r => r.businessEvaluation.success && r.businessEvaluation.responseTime)
      .map(r => r.businessEvaluation.responseTime!)

    const totalTimes = modelResults
      .filter(r => r.totalResponseTime)
      .map(r => r.totalResponseTime!)

    const techAvg = techTimes.length > 0 ? Math.round(techTimes.reduce((a, b) => a + b, 0) / techTimes.length) : "NaN"
    const businessAvg = businessTimes.length > 0 ? Math.round(businessTimes.reduce((a, b) => a + b, 0) / businessTimes.length) : "NaN"
    const totalAvg = totalTimes.length > 0 ? Math.round(totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length) : "NaN"

    report.push(`| \`${modelName}\` | ${techAvg} | ${businessAvg} | ${totalAvg} |`)
  }

  report.push("")
  report.push("## 2. 详细测评结果")
  report.push("")

  // 测试用例设计思路
  report.push("### 测试用例设计思路")
  report.push("")
  report.push("为了全面评估不同模型的能力，我们设计了以下10个具有代表性的测试用例，每个用例都旨在考察模型的特定分析维度：")
  report.push("")

  for (const testCase of TEST_CASES) {
    report.push(`- **${testCase.id}**: **${testCase.category}**。${testCase.description}`)
  }

  report.push("")
  report.push("---")
  report.push("")

  // 按测试用例分组显示结果
  for (const testCase of TEST_CASES) {
    report.push(`### 案例: ${testCase.id}`)
    report.push("")
    report.push(`**场景描述:** ${testCase.scenario}`)
    report.push("")

    const caseResults = results.filter(r => r.testCaseId === testCase.id)

    for (const modelName of TEST_MODELS) {
      const result = caseResults.find(r => r.modelName === modelName)

      report.push(`#### 模型: \`${modelName}\``)

      if (!result) {
        report.push("*   **评估失败:** 测试未执行")
      } else if (!result.technicalEvaluation.success && !result.businessEvaluation.success) {
        report.push(`*   **评估失败:** ${result.technicalEvaluation.error || result.businessEvaluation.error || "未知错误"}`)
      } else {
        const techStatus = result.technicalEvaluation.success
          ? `✅ (评分: ${result.technicalEvaluation.score}, 耗时: ${result.technicalEvaluation.responseTime}ms)`
          : `❌ (${result.technicalEvaluation.error})`

        const businessStatus = result.businessEvaluation.success
          ? `✅ (评分: ${result.businessEvaluation.score}, 耗时: ${result.businessEvaluation.responseTime}ms)`
          : `❌ (${result.businessEvaluation.error})`

        report.push(`*   **技术评估:** ${techStatus}`)
        report.push(`*   **场景价值评估:** ${businessStatus}`)

        if (result.totalResponseTime) {
          report.push(`*   **总耗时:** ${result.totalResponseTime}ms`)
        }
      }

      report.push("")
    }

    report.push("---")
    report.push("")
  }

  return report.join("\n")
}

// 保存报告到文件
async function saveReport(report: string): Promise<void> {
  const fs = await import('fs/promises')
  const path = await import('path')

  const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const filename = `模型横向测评报告_${timestamp}.md`
  const filepath = path.join(process.cwd(), filename)

  await fs.writeFile(filepath, report, 'utf-8')
  console.log(`📄 报告已保存: ${filepath}`)
}

// 主函数
async function main() {
  try {
    console.log("🔧 检查环境变量...")
    if (!process.env.QIANFAN_API_KEY) {
      console.error("❌ 错误: QIANFAN_API_KEY 环境变量未设置")
      process.exit(1)
    }

    const results = await runAllTests()
    const report = generateReport(results)
    await saveReport(report)

    console.log("\n🎉 测评完成!")
  } catch (error) {
    console.error("❌ 测评过程中发生错误:", error)
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
}

export { runAllTests, generateReport, type TestResult, type TestCase }