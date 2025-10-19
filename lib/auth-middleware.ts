import { NextRequest, NextResponse } from "next/server"
import { verifyToken, extractBearerToken, type JWTPayload } from "@/lib/jwt"
import type { ApiResponse } from "@/lib/types"

/**
 * 认证中间件 - 验证请求中的 JWT token
 * 使用方法:
 *
 * import { withAuth } from "@/lib/auth-middleware"
 *
 * export const POST = withAuth(async (request: NextRequest, user: JWTPayload) => {
 *   // 此处 user 已验证,可以直接使用
 *   const userId = user.userId
 *   // ... 你的业务逻辑
 * })
 */

export type AuthenticatedHandler = (
  request: NextRequest,
  user: JWTPayload
) => Promise<NextResponse> | NextResponse

export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest) => {
    try {
      // 从请求头中提取 token
      const authHeader = request.headers.get("Authorization")
      const token = extractBearerToken(authHeader)

      if (!token) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: "MISSING_TOKEN",
              message: "未提供认证令牌",
            },
          },
          { status: 401 }
        )
      }

      // 验证 token
      const user = verifyToken(token)
      if (!user) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: "INVALID_TOKEN",
              message: "无效或已过期的令牌",
            },
          },
          { status: 401 }
        )
      }

      // Token 验证成功,调用原始处理函数
      return handler(request, user)
    } catch (error) {
      console.error("Authentication error:", error)
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: "AUTH_ERROR",
            message: "认证失败",
            details: error instanceof Error ? error.message : "未知错误",
          },
        },
        { status: 500 }
      )
    }
  }
}

/**
 * 可选认证中间件 - 如果提供了 token 则验证,否则继续执行但 user 为 null
 * 适用于某些接口既可以匿名访问,也可以登录访问的场景
 */
export type OptionalAuthHandler = (
  request: NextRequest,
  user: JWTPayload | null
) => Promise<NextResponse> | NextResponse

export function withOptionalAuth(handler: OptionalAuthHandler) {
  return async (request: NextRequest) => {
    try {
      const authHeader = request.headers.get("Authorization")
      const token = extractBearerToken(authHeader)

      let user: JWTPayload | null = null
      if (token) {
        user = verifyToken(token)
      }

      return handler(request, user)
    } catch (error) {
      console.error("Optional authentication error:", error)
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: "AUTH_ERROR",
            message: "认证失败",
            details: error instanceof Error ? error.message : "未知错误",
          },
        },
        { status: 500 }
      )
    }
  }
}
