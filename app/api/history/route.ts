import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"

export async function GET(request: NextRequest) {
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
      let techScore = 0
      try {
        const techData = JSON.parse(item.technicalFeasibility as string)
        techScore = techData?.score || 0
      } catch (e) {
        // 忽略解析错误, 分数默认为0
      }

      let bizScore = 0
      try {
        if (item.businessValue) {
          const bizData = JSON.parse(item.businessValue as string)
          bizScore = bizData?.score || 0
        }
      } catch (e) {
        // 忽略解析错误, 分数默认为0
      }

      const overallScore = bizScore > 0 && techScore > 0
        ? Math.round((techScore + bizScore) / 2)
        : techScore || bizScore

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
