import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse, ModuleFeedbackRequest } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const body: ModuleFeedbackRequest = await request.json()

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

    // 演示逻辑：模拟保存反馈成功
    console.log("Module feedback received:", {
      evaluationId: body.evaluationId,
      moduleType: body.moduleType,
      feedbackType: body.feedbackType,
      comment: body.comment,
      timestamp: new Date().toISOString(),
    })

    const response: ApiResponse = {
      success: true,
      message: "感谢您的反馈",
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
