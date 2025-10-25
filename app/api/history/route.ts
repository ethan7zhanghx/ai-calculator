import { NextRequest, NextResponse } from "next/server"
import { getPrismaClient } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"

export async function GET(request: NextRequest) {
  const prisma = getPrismaClient();
  try {
    // 1. 验证用户Token
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: { message: "需要认证" } },
        { status: 401 }
      )
    }

    const token = authHeader.replace("Bearer ", "")
    const payload = await verifyToken(token)
    const userId = payload?.userId

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { message: "无效的Token" } },
        { status: 401 }
      )
    }

    // 2. 从数据库获取该用户的评估历史
    const history = await prisma.evaluation.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" },
      // 只选择列表展示需要的字段，避免传输过多数据
      select: {
        id: true,
        createdAt: true,
        model: true,
        businessScenario: true,
        // 解析JSON字符串以获取总分
        technicalFeasibility: true,
        businessValue: true,
      },
      take: 50, // 最多返回最近50条记录
    })

    // 3. 格式化数据，计算总分
    const formattedHistory = history.map(item => {
      let techScore: number | null = null;
      try {
        if (item.technicalFeasibility) {
          const techData = JSON.parse(item.technicalFeasibility as string);
          if (typeof techData?.score === 'number') {
            techScore = techData.score;
          }
        }
      } catch (e) {
        // 忽略解析错误
      }

      let bizScore: number | null = null;
      try {
        if (item.businessValue) {
          const bizData = JSON.parse(item.businessValue as string);
          if (typeof bizData?.score === 'number') {
            bizScore = bizData.score;
          }
        }
      } catch (e) {
        // 忽略解析错误
      }

      let overallScore: number | null = null;
      if (techScore !== null && bizScore !== null) {
        overallScore = Math.round((techScore + bizScore) / 2);
      } else if (techScore !== null) {
        overallScore = techScore;
      } else if (bizScore !== null) {
        overallScore = bizScore;
      }

      return {
        id: item.id,
        createdAt: item.createdAt,
        model: item.model,
        businessScenario: item.businessScenario,
        score: overallScore,
      }
    })

    return NextResponse.json({ success: true, data: formattedHistory })
  } catch (error) {
    console.error("获取历史记录失败:", error)
    return NextResponse.json(
      { success: false, error: { message: "获取历史记录失败" } },
      { status: 500 }
    )
  }
}
