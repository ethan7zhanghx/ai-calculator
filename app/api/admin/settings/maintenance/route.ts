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

    const config = await prisma.siteConfig.findUnique({ where: { id: 1 } })
    return NextResponse.json({
      success: true,
      data: {
        maintenance: config?.maintenance || false,
        maintenanceMessage: config?.maintenanceMessage || "",
      },
    })
  } catch (error) {
    console.error("获取维护配置失败:", error)
    return NextResponse.json(
      { success: false, error: { message: "获取维护配置失败" } },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
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
    const maintenance = Boolean(body.maintenance)
    const maintenanceMessage = typeof body.maintenanceMessage === "string" ? body.maintenanceMessage : null

    const config = await prisma.siteConfig.upsert({
      where: { id: 1 },
      update: {
        maintenance,
        maintenanceMessage,
      },
      create: {
        maintenance,
        maintenanceMessage,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        maintenance: config.maintenance,
        maintenanceMessage: config.maintenanceMessage,
      },
    })
  } catch (error) {
    console.error("更新维护配置失败:", error)
    return NextResponse.json(
      { success: false, error: { message: "更新维护配置失败" } },
      { status: 500 }
    )
  }
}
