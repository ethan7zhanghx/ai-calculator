import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse, ModuleFeedbackRequest } from "@/lib/types"
import { withOptionalAuth } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import type { JWTPayload } from "@/lib/jwt"

export const POST = withOptionalAuth(async (request: NextRequest, user: JWTPayload | null) => {
  try {
    const body: ModuleFeedbackRequest = await request.json()

    // 调试日志
    console.log("Module feedback - user:", user)
    console.log("Module feedback - body:", body)

    // 验证必填字段
    if (!body.evaluationId || !body.moduleType || !body.feedbackType) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: "MISSING_FIELDS",
            message: "请提供完整的反馈信息",
          },
        },
        { status: 400 }
      )
    }

    // 验证字段值
    const validModuleTypes = ["resource", "technical", "business"]
    const validFeedbackTypes = ["like", "dislike"]

    if (!validModuleTypes.includes(body.moduleType)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: "INVALID_MODULE_TYPE",
            message: "无效的模块类型",
          },
        },
        { status: 400 }
      )
    }

    if (!validFeedbackTypes.includes(body.feedbackType)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: "INVALID_FEEDBACK_TYPE",
            message: "无效的反馈类型",
          },
        },
        { status: 400 }
      )
    }

    // 对于模块反馈,如果用户未登录,创建匿名用户或使用特殊用户ID
    // 这里我们要求模块反馈必须登录
    if (!user) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: "AUTH_REQUIRED",
            message: "模块反馈需要登录",
          },
        },
        { status: 401 }
      )
    }

    // 保存反馈到数据库
    const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).substring(7)}`

    await prisma.feedback.create({
      data: {
        id: feedbackId,
        userId: user.userId,
        type: "module",
        evaluationId: body.evaluationId,
        moduleName: body.moduleType,
        rating: body.feedbackType === "like" ? "positive" : "negative",
      },
    })

    const response: ApiResponse = {
      success: true,
      message: "感谢您的反馈",
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("Module feedback error:", error)
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
