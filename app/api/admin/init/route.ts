import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * 初始化超级管理员 API
 * ⚠️ 重要：这是一个临时端点，仅用于首次设置
 * 设置完成后应该删除此文件或添加额外的安全验证
 *
 * 使用方法：
 * POST /api/admin/init
 * Body: { "identifier": "手机号或邮箱", "secret": "你的密钥" }
 */

// 设置一个密钥，防止未授权访问
// ⚠️ 请在环境变量中设置 ADMIN_INIT_SECRET，或者修改这里的默认值
const INIT_SECRET = process.env.ADMIN_INIT_SECRET || "change-me-in-production"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { identifier, secret } = body

    // 验证密钥
    if (secret !== INIT_SECRET) {
      return NextResponse.json(
        {
          success: false,
          error: "无效的密钥",
        },
        { status: 403 }
      )
    }

    if (!identifier) {
      return NextResponse.json(
        {
          success: false,
          error: "请提供用户手机号或邮箱",
        },
        { status: 400 }
      )
    }

    // 查找用户
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
        ],
      },
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: `用户不存在: ${identifier}`,
          tip: "请先在网站注册该账号",
        },
        { status: 404 }
      )
    }

    // 检查是否已经是管理员
    if (user.role === "super_admin") {
      return NextResponse.json(
        {
          success: true,
          message: "该用户已经是超级管理员",
          user: {
            email: user.email,
            phone: user.phone,
            role: user.role,
          },
        },
        { status: 200 }
      )
    }

    // 更新为超级管理员
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: "super_admin" },
    })

    return NextResponse.json(
      {
        success: true,
        message: "成功设置超级管理员权限",
        user: {
          email: updatedUser.email,
          phone: updatedUser.phone,
          role: updatedUser.role,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Init admin error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "服务器错误",
      },
      { status: 500 }
    )
  }
}
