import { notFound } from "next/navigation"
import { getPrismaClient } from "@/lib/prisma"
import { calculateResourceScore } from "@/lib/resource-calculator"
import { ReportContent } from "@/components/report-content"
import { Toaster } from "@/components/ui/toaster"

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const prisma = getPrismaClient()
  const { id: evaluationId } = await params

  try {
    // 获取评估数据
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        user: { select: { name: true } },
      },
    })

    if (!evaluation) {
      notFound()
    }

    // 解析JSON字符串字段
    const parsedEvaluation = {
      ...evaluation,
      resourceFeasibility: JSON.parse(evaluation.resourceFeasibility as string),
      technicalFeasibility: JSON.parse(evaluation.technicalFeasibility as string),
      businessValue: evaluation.businessValue ? JSON.parse(evaluation.businessValue as string) : null,
    }

    return (
      <>
        <ReportContent evaluation={parsedEvaluation} />
        <Toaster />
      </>
    )
  } catch (error) {
    console.error("加载报告失败:", error)
    notFound()
  }
}
