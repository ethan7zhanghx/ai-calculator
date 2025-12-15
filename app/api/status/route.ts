import { NextResponse } from "next/server"
import { getPrismaClient } from "@/lib/prisma"

export async function GET() {
  const prisma = getPrismaClient();
  try {
    const [config, announcements] = await Promise.all([
      prisma.siteConfig.findUnique({ where: { id: 1 } }),
      prisma.announcement.findMany({
        where: { active: true },
        orderBy: { updatedAt: "desc" },
        take: 5, // 提供最近5条公告历史
      }),
    ])

    const latest = announcements?.[0]

    return NextResponse.json({
      success: true,
      data: {
        maintenance: config?.maintenance || false,
        maintenanceMessage: config?.maintenanceMessage || "",
        announcement: latest
          ? {
              id: latest.id,
              title: latest.title,
              content: latest.content,
              updatedAt: latest.updatedAt,
            }
          : null,
        announcementHistory: (announcements || []).map((a) => ({
          id: a.id,
          title: a.title,
          content: a.content,
          updatedAt: a.updatedAt,
        })),
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
