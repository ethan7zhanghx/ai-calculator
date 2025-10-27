import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse, EvaluationRequest, EvaluationResponse } from "@/lib/types"
import { withOptionalAuth } from "@/lib/auth-middleware"
import { getPrismaClient } from "@/lib/prisma"
import type { JWTPayload } from "@/lib/jwt"
import { evaluateTechnicalSolution } from "@/lib/technical-evaluator"
import { evaluateBusinessValue } from "@/lib/business-evaluator"
import { calculateResourceFeasibility } from "@/lib/resource-calculator"

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

          // 第2步：执行技术方案评估
          let technicalEvaluation
          try {
            console.log("开始技术方案评估...")
            technicalEvaluation = await evaluateTechnicalSolution(body)
            console.log("技术方案评估完成,得分:", technicalEvaluation.score)

            const technicalScore = technicalEvaluation.score
            const technicalIssues = [
              ...technicalEvaluation.criticalIssues,
              ...technicalEvaluation.warnings,
            ]
            const technicalRecommendations = technicalEvaluation.recommendations

            const technicalFeasibility = {
              appropriate: technicalIssues.length === 0,
              score: technicalScore,
              issues: technicalIssues,
              recommendations: technicalRecommendations,
              detailedEvaluation: technicalEvaluation,
            }

            // 发送技术评估结果
            if (controller.desiredSize) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'technical',
                data: { technicalFeasibility }
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

          // 第3步：执行商业价值评估
          let businessEvaluation
          try {
            console.log("开始商业价值评估...")
            businessEvaluation = await evaluateBusinessValue(body)
            console.log("商业价值评估完成,得分:", businessEvaluation.score)

            const businessScore = businessEvaluation?.score || 0
            const businessAnalysis = businessEvaluation?.summary || ""

            const businessValue = businessEvaluation ? {
              score: businessScore,
              analysis: businessAnalysis,
              risks: businessEvaluation.risks,
              opportunities: businessEvaluation.opportunities,
              detailedEvaluation: businessEvaluation,
            } : null

            // 发送商业价值评估结果
            if (controller.desiredSize) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'business',
                data: { businessValue }
              })}\n\n`))
            }

          } catch (error) {
            console.error("商业价值评估失败:", error)
            // 发送商业价值评估失败通知（不中断整体流程）
            if (controller.desiredSize) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'error',
                module: 'business',
                error: error instanceof Error ? error.message : "商业价值评估失败"
              })}\n\n`))
            }
          }

          // 第4步：保存到数据库
          if (user && technicalEvaluation) {
            try {
              const prisma = getPrismaClient();
              const technicalScore = technicalEvaluation.score
              const technicalIssues = [
                ...technicalEvaluation.criticalIssues,
                ...technicalEvaluation.warnings,
              ]
              const technicalRecommendations = technicalEvaluation.recommendations

              const technicalFeasibility = {
                appropriate: technicalIssues.length === 0,
                score: technicalScore,
                issues: technicalIssues,
                recommendations: technicalRecommendations,
                detailedEvaluation: technicalEvaluation,
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
                  machineCount: body.machineCount,
                  cardsPerMachine: body.cardsPerMachine,
                  businessDataDescription: body.businessData?.description || "",
                  businessDataQuality: body.businessData?.quality || "high",
                  businessScenario: body.businessScenario || "",
                  performanceTPS: body.performanceRequirements?.tps || 0,
                  performanceConcurrency: body.performanceRequirements?.concurrency || 0,
                  resourceFeasibility: JSON.stringify(resourceFeasibility),
                  technicalFeasibility: JSON.stringify(technicalFeasibility),
                  businessValue: JSON.stringify(businessValue),
                },
              })
            } catch (dbError) {
              console.error("Failed to save evaluation to database:", dbError)
            }
          }

          // 第5步：发送完成信号
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
