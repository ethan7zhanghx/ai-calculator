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

    // 获取反馈列表
    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
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
      prisma.feedback.count(),
    ])

    return NextResponse.json({
      success: true,
      data: {
        feedbacks: feedbacks.map((feedback) => ({
          id: feedback.id,
          userId: feedback.userId,
          userEmail: feedback.user.email,
          userName: feedback.user.name,
          type: feedback.type,
          moduleName: feedback.moduleName,
          rating: feedback.rating,
          feedbackType: feedback.feedbackType,
          title: feedback.title,
          description: feedback.description,
          contactEmail: feedback.contactEmail,
          evaluationId: feedback.evaluationId,
          createdAt: feedback.createdAt,
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
    console.error("Error fetching feedbacks:", error)
    return NextResponse.json(
      { success: false, error: { message: "获取反馈列表失败" } },
      { status: 500 }
    )
  }
}
