import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse, GeneralFeedbackRequest } from "@/lib/types"

export async function POST(request: NextRequest) {
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

    // 演示逻辑：模拟保存反馈
    const feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substring(7)}`

    console.log("General feedback received:", {
      feedbackId,
      type: body.type,
      title: body.title,
      description: body.description,
      email: body.email,
      timestamp: new Date().toISOString(),
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
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "服务器内部错误",
        },
      },
      { status: 500 }
    )
  }
}
