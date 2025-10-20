import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse, EvaluationRequest, EvaluationResponse } from "@/lib/types"
import { withOptionalAuth } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import type { JWTPayload } from "@/lib/jwt"
import { evaluateTechnicalSolution } from "@/lib/technical-evaluator"
import { evaluateBusinessValue } from "@/lib/business-evaluator"

// 配置函数最大执行时间（Vercel 免费版最多 10 秒）
export const maxDuration = 10

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

    // 并行执行技术方案评估和商业价值评估 - 节省时间
    let technicalEvaluation
    let businessEvaluation

    try {
      // 使用 Promise.all 并行执行两个 LLM 调用
      [technicalEvaluation, businessEvaluation] = await Promise.all([
        evaluateTechnicalSolution(body),
        evaluateBusinessValue(body)
      ])
    } catch (error) {
      console.error("评估失败:", error)
      // 如果 LLM 评估失败，返回错误
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: "EVALUATION_FAILED",
            message: error instanceof Error ? error.message : "AI 评估服务暂时不可用，请稍后重试",
          },
        },
        { status: 503 }
      )
    }

    const technicalScore = technicalEvaluation.score
    const technicalIssues = [
      ...technicalEvaluation.criticalIssues,
      ...technicalEvaluation.warnings,
    ]
    const technicalRecommendations = technicalEvaluation.recommendations

    const businessScore = businessEvaluation.score
    const businessAnalysis = businessEvaluation.summary

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
      // 保存完整的LLM评估结果
      detailedEvaluation: technicalEvaluation,
    }

    const businessValue = {
      score: businessScore,
      analysis: businessAnalysis,
      risks: businessEvaluation.risks,
      opportunities: businessEvaluation.opportunities,
      // 保存完整的LLM评估结果
      detailedEvaluation: businessEvaluation,
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

