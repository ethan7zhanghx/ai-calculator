import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse, AuthRequest, AuthResponse } from "@/lib/types"
import { getPrismaClient } from "@/lib/prisma"
import { hashPassword } from "@/lib/password"
import { signToken } from "@/lib/jwt"

export async function POST(request: NextRequest) {
  const prisma = getPrismaClient();

  // 设置请求超时时间（增加超时处理）
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('请求超时')), 30000); // 30秒超时
  });

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

    // 邮箱格式验证
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: "INVALID_EMAIL",
              message: "邮箱格式不正确",
            },
          },
          { status: 400 }
        )
      }
    }

    // 手机号格式验证
    if (phone) {
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
    }

    // 密码强度验证
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

    // 检查邮箱或手机号是否已存在（添加重试机制）
    let existingUser = null;
    let retries = 3;
    while (retries > 0) {
      try {
        existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              email ? { email } : {},
              phone ? { phone } : {},
            ].filter(obj => Object.keys(obj).length > 0),
          },
        });
        break;
      } catch (dbError) {
        console.error(`数据库查询失败，剩余重试次数: ${retries - 1}`, dbError);
        retries--;
        if (retries === 0) throw dbError;
        await new Promise(resolve => setTimeout(resolve, 500)); // 等待500ms
      }
    }

    if (existingUser) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: "USER_EXISTS",
            message: existingUser.email === email ? "该邮箱已被注册" : "该手机号已被注册",
          },
        },
        { status: 409 }
      )
    }

    // 对密码进行加密
    const hashedPassword = await hashPassword(password)

    // 创建新用户（添加重试机制）
    let user = null;
    retries = 3;
    while (retries > 0) {
      try {
        user = await prisma.user.create({
          data: {
            email: email || `${phone}@placeholder.com`, // 如果没有邮箱,使用手机号生成占位邮箱
            phone: phone || null,
            password: hashedPassword,
            name: phone || email?.split("@")[0], // 使用手机号或邮箱前缀作为默认用户名
          },
        });
        break;
      } catch (dbError) {
        console.error(`数据库创建失败，剩余重试次数: ${retries - 1}`, dbError);
        retries--;
        if (retries === 0) throw dbError;
        await new Promise(resolve => setTimeout(resolve, 500)); // 等待500ms
      }
    }

    // 生成 JWT token
    const token = signToken({
      userId: user.id,
      email: user.email,
    })

    const response: ApiResponse<AuthResponse> = {
      success: true,
      message: "注册成功",
      data: {
        userId: user.id,
        username: user.name || user.email,
        token,
      },
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error("Registration error:", error)

    // 更详细的错误信息
    let errorMessage = "服务器内部错误";
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('请求超时')) {
        errorMessage = "请求超时，请重试";
        statusCode = 408;
      } else if (error.message.includes('database') || error.message.includes('Prisma')) {
        errorMessage = "数据库连接错误，请稍后重试";
        statusCode = 503;
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: errorMessage,
          details: error instanceof Error ? error.message : "未知错误",
        },
      },
      { status: statusCode }
    )
  }
}
