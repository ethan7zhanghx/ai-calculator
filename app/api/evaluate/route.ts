import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse, EvaluationRequest, EvaluationResponse } from "@/lib/types"
import { withOptionalAuth } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import type { JWTPayload } from "@/lib/jwt"

// 硬件规格数据
const hardwareSpecs: Record<string, { vram: number }> = {
  "NVIDIA A100 (80GB)": { vram: 80 },
  "NVIDIA A100 (40GB)": { vram: 40 },
  "NVIDIA H100": { vram: 80 },
  "NVIDIA V100": { vram: 32 },
  "NVIDIA RTX 4090": { vram: 24 },
  "NVIDIA RTX 3090": { vram: 24 },
}

// 模型规格数据
const modelSpecs: Record<string, {
  vramPerGPU: number
  minGPUs: number
  paramSize: string
}> = {
  "GPT-4": { vramPerGPU: 80, minGPUs: 8, paramSize: "1.7T" },
  "GPT-3.5": { vramPerGPU: 40, minGPUs: 2, paramSize: "175B" },
  "Claude 3 Opus": { vramPerGPU: 80, minGPUs: 8, paramSize: "~500B" },
  "Claude 3 Sonnet": { vramPerGPU: 40, minGPUs: 2, paramSize: "~200B" },
  "Llama 3 70B": { vramPerGPU: 80, minGPUs: 4, paramSize: "70B" },
  "Llama 3 8B": { vramPerGPU: 16, minGPUs: 1, paramSize: "8B" },
  "Mistral Large": { vramPerGPU: 80, minGPUs: 4, paramSize: "~140B" },
  "Mistral 7B": { vramPerGPU: 14, minGPUs: 1, paramSize: "7B" },
}

export const POST = withOptionalAuth(async (request: NextRequest, user: JWTPayload | null) => {
  try {
    const body: EvaluationRequest = await request.json()

    // 验证必填字段
    if (!body.model || !body.hardware || !body.cardCount) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: "MISSING_FIELDS",
            message: "请填写完整的评估信息",
          },
        },
        { status: 400 }
      )
    }

    const hwSpec = hardwareSpecs[body.hardware]
    const modelSpec = modelSpecs[body.model]

    if (!hwSpec || !modelSpec) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: "INVALID_SELECTION",
            message: "无效的硬件或模型选择",
          },
        },
        { status: 400 }
      )
    }

    // 计算资源可行性
    const totalVRAM = hwSpec.vram * body.cardCount

    // 预训练评估
    const pretrainingRequired = modelSpec.vramPerGPU * modelSpec.minGPUs * 1.5 // 预训练需要更多显存
    const pretrainingPercent = Math.min((totalVRAM / pretrainingRequired) * 100, 100)
    const pretrainingFeasible = totalVRAM >= pretrainingRequired

    // 微调评估
    const finetuningRequired = modelSpec.vramPerGPU * modelSpec.minGPUs * 1.2
    const finetuningPercent = Math.min((totalVRAM / finetuningRequired) * 100, 100)
    const finetuningFeasible = totalVRAM >= finetuningRequired

    // LoRA/QLoRA评估
    const loraRequired = modelSpec.vramPerGPU * modelSpec.minGPUs * 0.6
    const qloraRequired = modelSpec.vramPerGPU * modelSpec.minGPUs * 0.4
    const loraFeasible = totalVRAM >= loraRequired
    const qloraFeasible = totalVRAM >= qloraRequired

    // 推理评估
    const inferenceRequired = modelSpec.vramPerGPU * modelSpec.minGPUs
    const inferencePercent = Math.min((totalVRAM / inferenceRequired) * 100, 100)
    const inferenceFeasible = totalVRAM >= inferenceRequired

    // 计算QPS (简化公式: 显存越多,QPS越高)
    const baseQPS = body.cardCount * 10
    const supportedQPS = inferenceFeasible ? baseQPS * (totalVRAM / inferenceRequired) : 0
    const meetsQPSRequirements = supportedQPS >= body.performanceRequirements.qps

    // 量化选项
    const quantizationOptions = [
      {
        type: "FP16" as const,
        memoryUsagePercent: inferencePercent,
        supportedQPS: supportedQPS,
        meetsRequirements: meetsQPSRequirements,
      },
      {
        type: "INT8" as const,
        memoryUsagePercent: Math.min(inferencePercent * 0.5, 100),
        supportedQPS: supportedQPS * 1.5,
        meetsRequirements: supportedQPS * 1.5 >= body.performanceRequirements.qps,
      },
      {
        type: "INT4" as const,
        memoryUsagePercent: Math.min(inferencePercent * 0.25, 100),
        supportedQPS: supportedQPS * 2,
        meetsRequirements: supportedQPS * 2 >= body.performanceRequirements.qps,
      },
    ]

    // 技术方案评估
    const scenarioLower = body.businessScenario?.toLowerCase() || ""
    const hasOCR = scenarioLower.includes("ocr") || scenarioLower.includes("文字识别")
    const hasVision = scenarioLower.includes("图像") || scenarioLower.includes("视觉") || scenarioLower.includes("图片")
    const isTextModel = !body.model.includes("Vision") && !body.model.includes("视觉")

    const technicalIssues: string[] = []
    const technicalRecommendations: string[] = []

    if (hasOCR) {
      technicalIssues.push("检测到OCR需求,大语言模型可能不是最优选择")
      technicalRecommendations.push("建议考虑专门的OCR方案如PaddleOCR、Tesseract")
    }

    if (hasVision && isTextModel) {
      technicalIssues.push("业务有视觉需求但选择了文本模型")
      technicalRecommendations.push("建议选择多模态模型如GPT-4V、Claude 3")
    }

    const technicalScore = technicalIssues.length === 0 ? 90 : technicalIssues.length === 1 ? 60 : 30

    // 商业价值评估 (演示用AI生成的分析)
    const businessAnalysis = generateBusinessAnalysis(body)
    const businessScore = calculateBusinessScore(body)

    const evaluationId = `eval_${Date.now()}_${Math.random().toString(36).substring(7)}`

    const resourceFeasibility = {
      pretraining: {
        feasible: pretrainingFeasible,
        memoryUsagePercent: Math.round(pretrainingPercent),
        memoryRequired: pretrainingRequired,
        memoryAvailable: totalVRAM,
        suggestions: pretrainingFeasible
          ? ["硬件资源充足,可以进行预训练"]
          : ["显存不足,建议增加GPU数量或选择更小的模型"],
      },
      fineTuning: {
        feasible: finetuningFeasible,
        memoryUsagePercent: Math.round(finetuningPercent),
        memoryRequired: finetuningRequired,
        memoryAvailable: totalVRAM,
        loraFeasible,
        qloraFeasible,
        suggestions: finetuningFeasible
          ? ["硬件资源可以支持全量微调"]
          : loraFeasible
          ? ["建议使用LoRA进行参数高效微调"]
          : qloraFeasible
          ? ["建议使用QLoRA进行量化微调"]
          : ["当前硬件无法支持微调,建议采购更多硬件或选择更小的模型"],
      },
      inference: {
        feasible: inferenceFeasible,
        memoryUsagePercent: Math.round(inferencePercent),
        memoryRequired: inferenceRequired,
        memoryAvailable: totalVRAM,
        supportedThroughput: Math.round(supportedQPS * 10),
        supportedQPS: Math.round(supportedQPS),
        meetsRequirements: meetsQPSRequirements,
        quantizationOptions,
        suggestions: meetsQPSRequirements
          ? ["当前配置可以满足QPS要求"]
          : quantizationOptions.find(q => q.meetsRequirements)
          ? [`建议使用${quantizationOptions.find(q => q.meetsRequirements)?.type}量化以满足QPS要求`]
          : ["即使使用量化也无法满足QPS要求,建议增加GPU数量"],
      },
    }

    const technicalFeasibility = {
      appropriate: technicalIssues.length === 0,
      score: technicalScore,
      issues: technicalIssues,
      recommendations: technicalRecommendations,
    }

    const businessValue = {
      score: businessScore,
      analysis: businessAnalysis,
      risks: generateRisks(body),
      opportunities: generateOpportunities(body),
    }

    // 如果用户已登录,保存评估历史到数据库
    if (user) {
      try {
        await prisma.evaluation.create({
          data: {
            id: evaluationId,
            userId: user.userId,
            model: body.model,
            hardware: body.hardware,
            cardCount: body.cardCount,
            businessDataVolume: body.businessData?.volume || null,
            businessDataTypes: JSON.stringify(body.businessData?.dataTypes || []),
            businessDataQuality: body.businessData?.quality || null,
            businessScenario: body.businessScenario || null,
            performanceQPS: body.performanceRequirements?.qps || null,
            performanceConcurrency: body.performanceRequirements?.concurrency || null,
            resourceFeasibility: JSON.stringify(resourceFeasibility),
            technicalFeasibility: JSON.stringify(technicalFeasibility),
            businessValue: JSON.stringify(businessValue),
          },
        })
      } catch (dbError) {
        console.error("Failed to save evaluation to database:", dbError)
        // 不中断流程,即使保存失败也返回评估结果
      }
    }

    const response: ApiResponse<EvaluationResponse> = {
      success: true,
      message: "评估完成",
      data: {
        evaluationId,
        resourceFeasibility,
        technicalFeasibility,
        businessValue,
        createdAt: new Date().toISOString(),
      },
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("Evaluation error:", error)
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "服务器内部错误",
          details: error instanceof Error ? error.message : "未知错误",
        },
      },
      { status: 500 }
    )
  }
})

// 演示用的商业价值分析生成函数
function generateBusinessAnalysis(req: EvaluationRequest): string {
  const scenario = req.businessScenario || "未指定业务场景"
  const dataVolume = req.businessData?.volume || 0
  const qps = req.performanceRequirements?.qps || 0

  return `基于您提供的信息,该AI项目旨在${scenario}。

数据规模: ${dataVolume.toLocaleString()}条记录
性能要求: ${qps} QPS, ${req.performanceRequirements?.concurrency || 0}并发用户

商业价值分析:
1. 规模化潜力: ${dataVolume > 10000 ? "数据量充足,具有良好的规模化基础" : "数据量偏少,可能影响模型效果"}
2. 性能目标: ${qps > 100 ? "高QPS要求体现了业务的活跃度" : "QPS要求适中,适合起步阶段"}
3. 技术成熟度: 所选模型${req.model}在业界已有成熟应用,技术风险可控

总体来看,该项目${dataVolume > 5000 && qps > 10 ? "具有较好的商业价值" : "需要进一步验证商业价值"}。`
}

function calculateBusinessScore(req: EvaluationRequest): number {
  let score = 50 // 基础分

  // 数据量评分
  const volume = req.businessData?.volume || 0
  if (volume > 100000) score += 20
  else if (volume > 10000) score += 15
  else if (volume > 1000) score += 10

  // 性能要求评分
  const qps = req.performanceRequirements?.qps || 0
  if (qps > 100) score += 15
  else if (qps > 10) score += 10
  else if (qps > 1) score += 5

  // 数据质量评分
  if (req.businessData?.quality === "high") score += 15
  else if (req.businessData?.quality === "medium") score += 10

  return Math.min(score, 100)
}

function generateRisks(req: EvaluationRequest): string[] {
  const risks: string[] = []

  if ((req.businessData?.volume || 0) < 1000) {
    risks.push("数据量较小,可能导致模型过拟合")
  }

  if (req.businessData?.quality === "low") {
    risks.push("数据质量较低,需要投入清洗和标注成本")
  }

  if ((req.performanceRequirements?.qps || 0) > 1000) {
    risks.push("高QPS要求可能需要大量硬件投入")
  }

  if (risks.length === 0) {
    risks.push("整体风险可控,建议做好充分的测试")
  }

  return risks
}

function generateOpportunities(req: EvaluationRequest): string[] {
  const opportunities: string[] = []

  if ((req.businessData?.volume || 0) > 10000) {
    opportunities.push("充足的数据量为模型优化提供了良好基础")
  }

  if (req.businessData?.quality === "high") {
    opportunities.push("高质量数据可以显著提升模型效果")
  }

  if (req.businessData?.dataTypes?.includes("qa_pair")) {
    opportunities.push("QA对数据特别适合对话式AI应用")
  }

  if (opportunities.length === 0) {
    opportunities.push("建议从小规模试点开始,验证技术方案")
  }

  return opportunities
}
