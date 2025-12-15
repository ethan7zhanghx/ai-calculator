import { NextRequest, NextResponse } from "next/server"
import { getPrismaClient } from "@/lib/prisma"
import { verifyAdmin, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  const prisma = getPrismaClient();
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.isAdmin) {
      if (authResult.error?.includes("权限不足")) {
        return createForbiddenResponse(authResult.error)
      }
      return createUnauthorizedResponse(authResult.error)
    }

    const announcements = await prisma.announcement.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
    })

    return NextResponse.json({ success: true, data: announcements })
  } catch (error) {
    console.error("获取公告失败:", error)
    return NextResponse.json(
      { success: false, error: { message: "获取公告失败" } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const prisma = getPrismaClient();
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.isAdmin) {
      if (authResult.error?.includes("权限不足")) {
        return createForbiddenResponse(authResult.error)
      }
      return createUnauthorizedResponse(authResult.error)
    }

    const body = await request.json()
    const { title, content, active = true } = body

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: { message: "标题和内容不能为空" } },
        { status: 400 }
      )
    }

    const announcement = await prisma.announcement.create({
      data: { title, content, active },
    })

    return NextResponse.json({ success: true, data: announcement })
  } catch (error) {
    console.error("创建公告失败:", error)
    return NextResponse.json(
      { success: false, error: { message: "创建公告失败" } },
      { status: 500 }
    )
  }
}
