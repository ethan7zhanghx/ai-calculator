import { NextRequest, NextResponse } from "next/server"
import { getPrismaClient } from "@/lib/prisma"
import { verifyAdmin, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/admin-auth"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = getPrismaClient();
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.isAdmin) {
      if (authResult.error?.includes("权限不足")) {
        return createForbiddenResponse(authResult.error)
      }
      return createUnauthorizedResponse(authResult.error)
    }

    const { id } = await params
    const body = await request.json()
    const data: any = {}
    if (typeof body.title === "string") data.title = body.title
    if (typeof body.content === "string") data.content = body.content
    if (typeof body.active === "boolean") data.active = body.active

    const updated = await prisma.announcement.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("更新公告失败:", error)
    return NextResponse.json(
      { success: false, error: { message: "更新公告失败" } },
      { status: 500 }
    )
  }
}
