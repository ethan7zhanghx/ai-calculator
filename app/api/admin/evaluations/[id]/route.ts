import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAdmin, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/admin-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdmin(request)
    if (!authResult.isAdmin) {
      if (authResult.error?.includes("权限不足")) {
        return createForbiddenResponse(authResult.error)
      }
      return createUnauthorizedResponse(authResult.error)
    }

    const resolvedParams = await params
    const evaluationId = resolvedParams.id

    // 获取评估详情
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            phone: true,
          },
        },
      },
    })

    if (!evaluation) {
      return NextResponse.json(
        { success: false, error: { message: "评估记录不存在" } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        evaluation: {
          id: evaluation.id,
          userId: evaluation.userId,
          userEmail: evaluation.user.email,
          userName: evaluation.user.name,
          userPhone: evaluation.user.phone,
          model: evaluation.model,
          hardware: evaluation.hardware,
          cardCount: evaluation.cardCount,
          businessScenario: evaluation.businessScenario,
          performanceQPS: evaluation.performanceQPS,
          performanceConcurrency: evaluation.performanceConcurrency,
          businessDataTypes: evaluation.businessDataTypes
            ? JSON.parse(evaluation.businessDataTypes)
            : [],
          businessDataQuality: evaluation.businessDataQuality,
          businessDataVolume: evaluation.businessDataVolume,
          resourceFeasibility: JSON.parse(evaluation.resourceFeasibility),
          technicalFeasibility: JSON.parse(evaluation.technicalFeasibility),
          businessValue: JSON.parse(evaluation.businessValue),
          createdAt: evaluation.createdAt,
        },
      },
    })
  } catch (error) {
    console.error("Error fetching evaluation detail:", error)
    return NextResponse.json(
      { success: false, error: { message: "获取评估详情失败" } },
      { status: 500 }
    )
  }
}
