import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse, AuthRequest, AuthResponse } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const body: AuthRequest = await request.json()
    const { phone, password } = body

    // 验证必填字段
    if (!phone || !password) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: "MISSING_FIELDS",
            message: "手机号和密码为必填项",
          },
        },
        { status: 400 }
      )
    }

    // 演示逻辑：简单的手机号格式验证
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: "INVALID_PHONE",
            message: "手机号格式不正确",
          },
        },
        { status: 400 }
      )
    }

    // 演示逻辑：密码长度验证
    if (password.length < 6) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: "WEAK_PASSWORD",
            message: "密码长度至少为6位",
          },
        },
        { status: 400 }
      )
    }

    // 演示逻辑：模拟注册成功，使用手机号作为用户名
    const mockUserId = `user_${Date.now()}`
    const mockToken = `token_${Math.random().toString(36).substring(7)}`
    const username = phone // 使用手机号作为用户名

    const response: ApiResponse<AuthResponse> = {
      success: true,
      message: "注册成功",
      data: {
        userId: mockUserId,
        username,
        token: mockToken,
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
