import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")

    // 验证token
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "未授权访问",
          },
        },
        { status: 401 }
      )
    }

    // 演示逻辑：模拟登出成功
    const response: ApiResponse = {
      success: true,
      message: "登出成功",
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
