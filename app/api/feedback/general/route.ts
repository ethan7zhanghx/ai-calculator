import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse, GeneralFeedbackRequest } from "@/lib/types"
import { withOptionalAuth } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import type { JWTPayload } from "@/lib/jwt"

export const POST = withOptionalAuth(async (request: NextRequest, user: JWTPayload | null) => {
  try {
    const body: GeneralFeedbackRequest = await request.json()

    // 验证必填字段
    if (!body.type || !body.title || !body.description) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: "MISSING_FIELDS",
            message: "请填写完整的反馈信息",
          },
        },
        { status: 400 }
      )
    }

    // 验证反馈类型
    const validTypes = ["bug", "feature", "improvement", "other"]
    if (!validTypes.includes(body.type)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: "INVALID_TYPE",
            message: "无效的反馈类型",
          },
        },
        { status: 400 }
      )
    }

    // 通用反馈也要求登录
    if (!user) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: "AUTH_REQUIRED",
            message: "提交反馈需要登录",
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
        type: "general",
        feedbackType: body.type,
        title: body.title,
        description: body.description,
        contactEmail: body.email || null,
      },
    })

    const response: ApiResponse<{ feedbackId: string }> = {
      success: true,
      message: "感谢您的反馈,我们会认真处理",
      data: {
        feedbackId,
      },
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("General feedback error:", error)
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
