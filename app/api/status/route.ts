import { NextResponse } from "next/server"
import { getPrismaClient } from "@/lib/prisma"

export async function GET() {
  const prisma = getPrismaClient();
  try {
    const [config, announcement] = await Promise.all([
      prisma.siteConfig.findUnique({ where: { id: 1 } }),
      prisma.announcement.findFirst({
        where: { active: true },
        orderBy: { updatedAt: "desc" },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        maintenance: config?.maintenance || false,
        maintenanceMessage: config?.maintenanceMessage || "",
        announcement: announcement
          ? {
              id: announcement.id,
              title: announcement.title,
              content: announcement.content,
              updatedAt: announcement.updatedAt,
            }
          : null,
      },
    })
  } catch (error) {
    console.error("获取站点状态失败:", error)
    return NextResponse.json(
      { success: false, error: { message: "获取站点状态失败" } },
      { status: 500 }
    )
  }
}
