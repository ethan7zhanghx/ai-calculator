import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"

export interface AdminAuthResult {
  isAdmin: boolean
  isSuperAdmin: boolean
  userId?: string
  email?: string
  role?: string
  error?: string
}

/**
 * 验证用户是否为管理员
 * @param request - Next.js请求对象
 * @returns 管理员验证结果
 */
export async function verifyAdmin(request: NextRequest): Promise<AdminAuthResult> {
  try {
    // 1. 检查Authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return {
        isAdmin: false,
        error: "未授权:缺少token",
      }
    }

    // 2. 验证JWT token
    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    if (!decoded) {
      return {
        isAdmin: false,
        error: "无效的token",
      }
    }

    // 3. 从数据库查询用户角色
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    })

    if (!user) {
      return {
        isAdmin: false,
        error: "用户不存在",
      }
    }

    // 4. 检查是否为管理员(admin或super_admin)
    if (user.role !== "admin" && user.role !== "super_admin") {
      return {
        isAdmin: false,
        isSuperAdmin: false,
        userId: user.id,
        email: user.email,
        role: user.role,
        error: "权限不足:需要管理员权限",
      }
    }

    // 5. 验证成功
    return {
      isAdmin: true,
      isSuperAdmin: user.role === "super_admin",
      userId: user.id,
      email: user.email,
      role: user.role,
    }
  } catch (error) {
    console.error("Admin verification error:", error)
    return {
      isAdmin: false,
      isSuperAdmin: false,
      error: "验证失败",
    }
  }
}

/**
 * 验证用户是否为超级管理员
 * @param request - Next.js请求对象
 * @returns 超级管理员验证结果
 */
export async function verifySuperAdmin(request: NextRequest): Promise<AdminAuthResult> {
  const authResult = await verifyAdmin(request)

  if (!authResult.isAdmin) {
    return authResult
  }

  if (!authResult.isSuperAdmin) {
    return {
      isAdmin: true,
      isSuperAdmin: false,
      userId: authResult.userId,
      email: authResult.email,
      role: authResult.role,
      error: "权限不足:需要超级管理员权限",
    }
  }

  return authResult
}

/**
 * 创建统一的未授权响应
 */
export function createUnauthorizedResponse(message: string = "未授权") {
  return Response.json(
    {
      success: false,
      error: {
        message,
        code: "UNAUTHORIZED",
      },
    },
    { status: 401 }
  )
}

/**
 * 创建统一的权限不足响应
 */
export function createForbiddenResponse(message: string = "权限不足") {
  return Response.json(
    {
      success: false,
      error: {
        message,
        code: "FORBIDDEN",
      },
    },
    { status: 403 }
  )
}
