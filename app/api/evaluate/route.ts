import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse, EvaluationRequest, EvaluationResponse } from "@/lib/types"
import { withOptionalAuth } from "@/lib/auth-middleware"
import { getPrismaClient } from "@/lib/prisma"
import type { JWTPayload } from "@/lib/jwt"
import { evaluateTechnicalSolution } from "@/lib/technical-evaluator"
import { evaluateBusinessValue } from "@/lib/business-evaluator"
import { calculateResourceFeasibility } from "@/lib/resource-calculator"
import { checkEvaluationIntent } from "@/lib/intent-guard"

/**
 * 从技术评估的角度计算硬件评分（与technical-evaluator.ts中的逻辑保持一致）
 */
async function calculateHardwareScoreFromTechnical(req: EvaluationRequest): Promise<number> {
  const totalCards = req.machineCount * req.cardsPerMachine

  // 计算资源可行性
  const resourceFeasibility = calculateResourceFeasibility(
    req.model,
    req.hardware,
    totalCards,
    req.performanceRequirements.tps
  )

  if (!resourceFeasibility) return 0

  // 使用与技术评估模块相同的逻辑
  const { pretraining, fineTuning, inference } = resourceFeasibility

  // 分析业务场景需求（与技术评估模块保持一致）
  const scenarioLower = req.businessScenario.toLowerCase()

  const needsInference = true // 默认都需要推理
  const needsFineTuning = scenarioLower.includes('微调') ||
                         scenarioLower.includes('训练') ||
                         scenarioLower.includes('定制') ||
                         scenarioLower.includes('领域') ||
                         scenarioLower.includes('专业') ||
                         scenarioLower.includes('优化') ||
                         scenarioLower.includes('特定') ||
                         scenarioLower.includes('个性化')
  const needsPretraining = scenarioLower.includes('预训练') ||
                           scenarioLower.includes('从头训练') ||
                           scenarioLower.includes('基础模型') ||
                           scenarioLower.includes('自训练')

  // 计算各项任务的得分
  const getTaskScore = (usagePercent: number) => {
    if (usagePercent > 100) return 0 // 不可行
    if (usagePercent <= 60) return 100 // 最佳范围
    if (usagePercent <= 90) return 100 - (usagePercent - 60) * 2 // 高效范围，线性下降
    return Math.max(0, 40 - (usagePercent - 90) * 4) // 警告范围，急剧下降
  }

  const inferenceScore = getTaskScore(inference.memoryUsagePercent)
  const fineTuningScore = getTaskScore(fineTuning.memoryUsagePercent)
  const pretrainingScore = getTaskScore(pretraining.memoryUsagePercent)

  // 根据场景需求筛选相关任务，计算加权平均分
  const taskScores = []

  if (needsInference) {
    taskScores.push(inferenceScore)
  }

  if (needsFineTuning) {
    taskScores.push(fineTuningScore)
  }

  if (needsPretraining) {
    taskScores.push(pretrainingScore)
  }

  // 计算相关任务的平均分作为最终得分
  const finalScore = taskScores.length > 0
    ? Math.round(taskScores.reduce((sum, score) => sum + score, 0) / taskScores.length)
    : 0

  return finalScore
}

// 配置函数最大执行时间(240秒,给两个串行LLM调用留足时间: 技术60s+商业120s+缓冲60s)
export const maxDuration = 240

// 新增：支持流式响应的POST处理器
export const POST = withOptionalAuth(async (request: NextRequest, user: JWTPayload | null) => {
  try {
    const body: EvaluationRequest = await request.json()

    // 验证必填字段
    if (!body.model || !body.hardware || !body.machineCount || !body.cardsPerMachine) {
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

    // 计算总卡数
    const totalCards = body.machineCount * body.cardsPerMachine

    const resourceFeasibility = calculateResourceFeasibility(
      body.model,
      body.hardware,
      totalCards,
      body.performanceRequirements.tps
    )

    if (!resourceFeasibility) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: "INVALID_SELECTION",
            message: "无效的模型或硬件选择",
          },
        },
        { status: 400 }
      )
    }

    const evaluationId = `eval_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        try {
          // 第1步：立即发送资源可行性评估结果
          if (controller.desiredSize) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'resource',
              data: {
                evaluationId,
                resourceFeasibility,
                createdAt: new Date().toISOString(),
              }
            })}\n\n`))
          }

          // 第2步：意图识别，过滤不符合要求的请求
          const intentResult = await checkEvaluationIntent(body, "ernie-4.5-turbo-128k")
          if (!intentResult.allowed) {
            console.log("意图识别未通过，跳过后续评估。原因:", intentResult.reason)
            if (controller.desiredSize) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'intent_rejected',
                data: {
                  reason: intentResult.reason || "输入未通过意图校验，请完善后重试。",
                }
              })}\n\n`))
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'complete'
              })}\n\n`))
            }
            return
          }

          // 第3步：执行技术方案评估
          let technicalEvaluation
          let hardwareScore = 0
          try {
            console.log("开始技术方案评估...")
            technicalEvaluation = await evaluateTechnicalSolution(body, "ernie-4.5-turbo-128k")
            console.log("技术方案评估完成,得分:", technicalEvaluation.score)

            // 计算硬件资源评分（与技术评估时LLM看到的评分保持一致）
            hardwareScore = await calculateHardwareScoreFromTechnical(body)
            console.log("硬件资源评分:", hardwareScore)

            const technicalScore = technicalEvaluation.score
            const technicalIssues = technicalEvaluation.criticalIssues
            const technicalRecommendations = technicalEvaluation.recommendations

            const technicalFeasibility = {
              appropriate: technicalIssues.length === 0,
              score: technicalScore,
              issues: technicalIssues,
              recommendations: technicalRecommendations,
              detailedEvaluation: technicalEvaluation,
            }

            // 发送技术评估结果（包含硬件评分）
            if (controller.desiredSize) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'technical',
                data: {
                  technicalFeasibility,
                  hardwareScore // 传递技术评估时计算的硬件评分
                }
              })}\n\n`))
            }

          } catch (error) {
            console.error("技术方案评估失败:", error)
            // 发送技术评估失败通知
            if (controller.desiredSize) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'error',
                module: 'technical',
                error: error instanceof Error ? error.message : "技术方案评估失败"
              })}\n\n`))
            }
          }

          // 第4步：执行场景价值评估
          let businessEvaluation
          try {
            console.log("开始场景价值评估...")
            businessEvaluation = await evaluateBusinessValue(body, "ernie-4.5-turbo-128k")
            console.log("场景价值评估完成,得分:", businessEvaluation.score)

            const businessScore = businessEvaluation?.score || 0
            const businessAnalysis = businessEvaluation?.summary || ""

            const businessValue = businessEvaluation ? {
              score: businessScore,
              analysis: businessAnalysis,
              risks: businessEvaluation.risks,
              opportunities: businessEvaluation.opportunities,
              detailedEvaluation: businessEvaluation,
            } : null

            // 发送场景价值评估结果
            if (controller.desiredSize) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'business',
                data: { businessValue }
              })}\n\n`))
            }

          } catch (error) {
            console.error("场景价值评估失败:", error)
            // 发送场景价值评估失败通知（不中断整体流程）
            if (controller.desiredSize) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'error',
                module: 'business',
                error: error instanceof Error ? error.message : "场景价值评估失败"
              })}\n\n`))
            }
          }

          // 第5步：保存到数据库
          if (user && technicalEvaluation) {
            try {
              const prisma = getPrismaClient();
              const technicalScore = technicalEvaluation.score
              const technicalIssues = technicalEvaluation.criticalIssues
              const technicalRecommendations = technicalEvaluation.recommendations

              const technicalFeasibility = {
                appropriate: technicalIssues.length === 0,
                score: technicalScore,
                issues: technicalIssues,
                recommendations: technicalRecommendations,
                detailedEvaluation: technicalEvaluation,
                hardwareScore, // 保存硬件评分以供报告使用
              }

              const businessValue = businessEvaluation ? {
                score: businessEvaluation.score,
                analysis: businessEvaluation.summary,
                risks: businessEvaluation.risks,
                opportunities: businessEvaluation.opportunities,
                detailedEvaluation: businessEvaluation,
              } : null

              await prisma.evaluation.create({
                data: {
                  id: evaluationId,
                  userId: user.userId,
                  model: body.model,
                  hardware: body.hardware,
                  cardCount: totalCards,
                  machineCount: body.machineCount || 1,
                  cardsPerMachine: body.cardsPerMachine || 1,
                  businessDataDescription: body.businessData?.description || "",
                  businessDataQuality: body.businessData?.quality || "high",
                  businessScenario: body.businessScenario || "",
                  performanceTPS: body.performanceRequirements?.tps || 50,
                  performanceConcurrency: body.performanceRequirements?.concurrency || 100,
                  resourceFeasibility: JSON.stringify(resourceFeasibility),
                  technicalFeasibility: JSON.stringify(technicalFeasibility),
                  businessValue: JSON.stringify(businessValue),
                },
              })
            } catch (dbError) {
              console.error("Failed to save evaluation to database:", dbError)
            }
          }

          // 第6步：发送完成信号
          if (controller.desiredSize) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'complete'
            })}\n\n`))
          }

        } catch (error) {
          console.error("Stream error:", error)
          if (controller.desiredSize) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              module: 'system',
              error: error instanceof Error ? error.message : "服务器内部错误"
            })}\n\n`))
          }
        } finally {
          controller.close()
        }
      }
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

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
