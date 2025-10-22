import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifySuperAdmin, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/admin-auth"

/**
 * GET - 获取所有管理员列表(仅超级管理员)
 */
export async function GET(request: NextRequest) {
  try {
    // 验证超级管理员权限
    const authResult = await verifySuperAdmin(request)
    if (!authResult.isSuperAdmin) {
      if (authResult.error?.includes("超级管理员")) {
        return createForbiddenResponse(authResult.error)
      }
      return createUnauthorizedResponse(authResult.error)
    }

    // 获取所有管理员(包括普通管理员和超级管理员)
    const admins = await prisma.user.findMany({
      where: {
        OR: [
          { role: "admin" },
          { role: "super_admin" },
        ],
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            evaluations: true,
            feedbacks: true,
          },
        },
      },
      orderBy: [
        { role: "desc" }, // super_admin 在前
        { createdAt: "desc" },
      ],
    })

    return NextResponse.json({
      success: true,
      data: {
        admins: admins.map((admin) => ({
          ...admin,
          evaluationCount: admin._count.evaluations,
          feedbackCount: admin._count.feedbacks,
        })),
        total: admins.length,
      },
    })
  } catch (error) {
    console.error("Error fetching admins:", error)
    return NextResponse.json(
      { success: false, error: { message: "获取管理员列表失败" } },
      { status: 500 }
    )
  }
}

/**
 * POST - 赋予用户管理员权限(仅超级管理员)
 */
export async function POST(request: NextRequest) {
  try {
    // 验证超级管理员权限
    const authResult = await verifySuperAdmin(request)
    if (!authResult.isSuperAdmin) {
      if (authResult.error?.includes("超级管理员")) {
        return createForbiddenResponse(authResult.error)
      }
      return createUnauthorizedResponse(authResult.error)
    }

    const body = await request.json()
    const { userId, role } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { message: "缺少用户ID" } },
        { status: 400 }
      )
    }

    if (role !== "admin" && role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: { message: "无效的角色类型" } },
        { status: 400 }
      )
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: "用户不存在" } },
        { status: 404 }
      )
    }

    // 更新用户角色
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        user: updatedUser,
        message: `成功将用户设置为${role === "super_admin" ? "超级管理员" : "管理员"}`,
      },
    })
  } catch (error) {
    console.error("Error granting admin role:", error)
    return NextResponse.json(
      { success: false, error: { message: "授权失败" } },
      { status: 500 }
    )
  }
}

/**
 * DELETE - 撤销管理员权限(仅超级管理员)
 */
export async function DELETE(request: NextRequest) {
  try {
    // 验证超级管理员权限
    const authResult = await verifySuperAdmin(request)
    if (!authResult.isSuperAdmin) {
      if (authResult.error?.includes("超级管理员")) {
        return createForbiddenResponse(authResult.error)
      }
      return createUnauthorizedResponse(authResult.error)
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { message: "缺少用户ID" } },
        { status: 400 }
      )
    }

    // 检查是否是自己
    if (userId === authResult.userId) {
      return NextResponse.json(
        { success: false, error: { message: "不能撤销自己的超级管理员权限" } },
        { status: 400 }
      )
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: "用户不存在" } },
        { status: 404 }
      )
    }

    // 将用户角色改回普通用户
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: "user" },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        user: updatedUser,
        message: "成功撤销管理员权限",
      },
    })
  } catch (error) {
    console.error("Error revoking admin role:", error)
    return NextResponse.json(
      { success: false, error: { message: "撤销权限失败" } },
      { status: 500 }
    )
  }
}
