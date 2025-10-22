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

    // 获取用户列表
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: pageSize,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              evaluations: true,
              feedbacks: true,
            },
          },
        },
      }),
      prisma.user.count(),
    ])

    return NextResponse.json({
      success: true,
      data: {
        users: users.map((user) => ({
          ...user,
          evaluationCount: user._count.evaluations,
          feedbackCount: user._count.feedbacks,
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
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { success: false, error: { message: "获取用户列表失败" } },
      { status: 500 }
    )
  }
}
