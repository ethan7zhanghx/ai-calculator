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
    const archived = Boolean(body.archived)

    const updated = await prisma.evaluation.update({
      where: { id },
      data: {
        archived,
        archivedAt: archived ? new Date() : null,
      },
      select: {
        id: true,
        archived: true,
        archivedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error("归档评估失败:", error)
    return NextResponse.json(
      { success: false, error: { message: "归档失败" } },
      { status: 500 }
    )
  }
}
