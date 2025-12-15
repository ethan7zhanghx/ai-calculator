import { NextRequest, NextResponse } from "next/server"
import { getPrismaClient } from "@/lib/prisma"
import { verifyAdmin, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  const prisma = getPrismaClient();
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
    const includeArchived = searchParams.get("includeArchived") === "1"
    const skip = (page - 1) * pageSize
    const where = includeArchived ? {} : { archived: false }

    // 获取评估列表
    const [evaluations, total] = await Promise.all([
      prisma.evaluation.findMany({
        skip,
        take: pageSize,
        orderBy: {
          createdAt: "desc",
        },
        where,
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      }),
      prisma.evaluation.count({ where }),
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
          machineCount: evaluation.machineCount || 1,
          cardsPerMachine: evaluation.cardsPerMachine || evaluation.cardCount || 1,
          businessScenario: evaluation.businessScenario || "",
          businessDataDescription: evaluation.businessDataDescription || "",
          businessDataQuality: evaluation.businessDataQuality || "high",
          performanceTPS: evaluation.performanceTPS || 50,
          performanceConcurrency: evaluation.performanceConcurrency || 100,
          archived: evaluation.archived,
          archivedAt: evaluation.archivedAt,
          createdAt: evaluation.createdAt,
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
