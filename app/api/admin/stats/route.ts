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

    // 获取统计数据
    const [
      totalUsers,
      totalEvaluations,
      totalFeedbacks,
      recentUsers,
      recentEvaluations,
      modelStats,
      hardwareStats,
      feedbackStats,
    ] = await Promise.all([
      // 总用户数
      prisma.user.count(),

      // 总评估数
      prisma.evaluation.count(),

      // 总反馈数
      prisma.feedback.count(),

      // 最近7天新增用户
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // 最近7天评估数
      prisma.evaluation.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // 模型使用统计
      prisma.evaluation.groupBy({
        by: ["model"],
        _count: {
          model: true,
        },
        orderBy: {
          _count: {
            model: "desc",
          },
        },
        take: 10,
      }),

      // 硬件使用统计
      prisma.evaluation.groupBy({
        by: ["hardware"],
        _count: {
          hardware: true,
        },
        orderBy: {
          _count: {
            hardware: "desc",
          },
        },
        take: 10,
      }),

      // 反馈统计
      prisma.feedback.groupBy({
        by: ["type"],
        _count: {
          type: true,
        },
      }),
    ])

    // 获取每日评估趋势（最近30天）
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const evaluationsByDay = await prisma.evaluation.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        createdAt: true,
      },
    })

    // 按日期分组
    const dailyStats = evaluationsByDay.reduce((acc, ev) => {
      const date = ev.createdAt.toISOString().split("T")[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // 填充缺失日期
    const dailyTrend = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split("T")[0]
      dailyTrend.push({
        date: dateStr,
        count: dailyStats[dateStr] || 0,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalEvaluations,
          totalFeedbacks,
          recentUsers,
          recentEvaluations,
        },
        modelStats: modelStats.map((stat) => ({
          model: stat.model,
          count: stat._count.model,
        })),
        hardwareStats: hardwareStats.map((stat) => ({
          hardware: stat.hardware,
          count: stat._count.hardware,
        })),
        feedbackStats: feedbackStats.map((stat) => ({
          type: stat.type,
          count: stat._count.type,
        })),
        dailyTrend,
      },
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json(
      { success: false, error: { message: "获取统计数据失败" } },
      { status: 500 }
    )
  }
}
