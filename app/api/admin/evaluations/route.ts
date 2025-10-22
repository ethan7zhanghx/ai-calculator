import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAdmin, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdmin(request)
    if (!authResult.isAdmin) {
      if (authResult.error?.includes("权限不足")) {
        return createForbiddenResponse(authResult.error)
      }
      return createUnauthorizedResponse(authResult.error)
    }

    // 获取分页参数
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "10")
    const skip = (page - 1) * pageSize

    // 获取评估列表
    const [evaluations, total] = await Promise.all([
      prisma.evaluation.findMany({
        skip,
        take: pageSize,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      }),
      prisma.evaluation.count(),
    ])

    return NextResponse.json({
      success: true,
      data: {
        evaluations: evaluations.map((evaluation) => ({
          id: evaluation.id,
          userId: evaluation.userId,
          userEmail: evaluation.user.email,
          userName: evaluation.user.name,
          model: evaluation.model,
          hardware: evaluation.hardware,
          cardCount: evaluation.cardCount,
          businessScenario: evaluation.businessScenario,
          performanceQPS: evaluation.performanceQPS,
          performanceConcurrency: evaluation.performanceConcurrency,
          createdAt: evaluation.createdAt,
          // 解析JSON字段
          businessDataTypes: evaluation.businessDataTypes
            ? JSON.parse(evaluation.businessDataTypes)
            : [],
          businessDataQuality: evaluation.businessDataQuality,
          businessDataVolume: evaluation.businessDataVolume,
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    })
  } catch (error) {
    console.error("Error fetching evaluations:", error)
    return NextResponse.json(
      { success: false, error: { message: "获取评估记录失败" } },
      { status: 500 }
    )
  }
}
