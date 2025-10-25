import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse, AuthRequest, AuthResponse } from "@/lib/types"
import { getPrismaClient } from "@/lib/prisma"
import { verifyPassword } from "@/lib/password"
import { signToken } from "@/lib/jwt"

export async function POST(request: NextRequest) {
  const prisma = getPrismaClient();
  try {
    const body: AuthRequest = await request.json()
    const { email, phone, password } = body

    // 验证必填字段 (email 或 phone 二选一)
    if ((!email && !phone) || !password) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: "MISSING_FIELDS",
            message: "邮箱或手机号以及密码为必填项",
          },
        },
        { status: 400 }
      )
    }

    // 查找用户
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : {},
          phone ? { phone } : {},
        ].filter(obj => Object.keys(obj).length > 0),
      },
    })

    if (!user) {
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

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.password)
    if (!isPasswordValid) {
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

    // 生成 JWT token
    const token = signToken({
      userId: user.id,
      email: user.email,
    })

    const response: ApiResponse<AuthResponse> = {
      success: true,
      message: "登录成功",
      data: {
        userId: user.id,
        username: user.name || user.email,
        token,
      },
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("Login error:", error)
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
}
