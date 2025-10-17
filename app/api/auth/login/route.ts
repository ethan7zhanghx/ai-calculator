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

    // 演示逻辑：模拟用户不存在的情况 (演示用,实际中应该查询数据库)
    if (phone === "10000000000") {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "用户不存在",
          },
        },
        { status: 404 }
      )
    }

    // 演示逻辑：模拟密码错误的情况
    if (password === "wrongpassword") {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "密码错误",
          },
        },
        { status: 401 }
      )
    }

    // 演示逻辑：模拟登录成功，使用手机号作为用户名
    const mockUserId = `user_${Date.now()}`
    const mockToken = `token_${Math.random().toString(36).substring(7)}`
    const mockUsername = phone // 使用手机号作为用户名

    const response: ApiResponse<AuthResponse> = {
      success: true,
      message: "登录成功",
      data: {
        userId: mockUserId,
        username: mockUsername,
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
