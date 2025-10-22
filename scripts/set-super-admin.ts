/**
 * 设置超级管理员脚本 (私密)
 * 使用方法: npx tsx scripts/set-super-admin.ts <email_or_phone>
 * 示例: npx tsx scripts/set-super-admin.ts 13053797782@example.com
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function setSuperAdmin() {
  const identifier = process.argv[2]

  if (!identifier) {
    console.error("❌ 请提供用户邮箱或手机号")
    console.log("使用方法: npx tsx scripts/set-super-admin.ts <email_or_phone>")
    console.log("示例: npx tsx scripts/set-super-admin.ts 13053797782@example.com")
    process.exit(1)
  }

  try {
    // 查找用户(通过邮箱或手机号)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
        ],
      },
    })

    if (!user) {
      console.error(`❌ 用户不存在: ${identifier}`)
      console.log("请确保该邮箱或手机号已经注册")
      process.exit(1)
    }

    // 更新为超级管理员
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: "super_admin" },
    })

    console.log("✅ 成功设置超级管理员权限")
    console.log(`用户: ${updatedUser.email}`)
    console.log(`手机: ${updatedUser.phone || "-"}`)
    console.log(`角色: ${updatedUser.role}`)
    console.log(`ID: ${updatedUser.id}`)
    console.log("\n🔐 超级管理员权限:")
    console.log("   - 查看所有后台数据")
    console.log("   - 管理普通用户")
    console.log("   - 授予/撤销其他用户的管理员权限")
  } catch (error) {
    console.error("❌ 设置超级管理员失败:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

setSuperAdmin()
