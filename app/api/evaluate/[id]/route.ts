import { NextRequest, NextResponse } from "next/server"
import { getPrismaClient } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = getPrismaClient();
  try {
    const { id: evaluationId } = await params

    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
    })

    if (!evaluation) {
      return NextResponse.json(
        { success: false, error: { message: "评估记录不存在" } },
        { status: 404 }
      )
    }

    // The data is stored as JSON strings, so we need to parse them.
    const responseData = {
      evaluationId: evaluation.id,
      resourceFeasibility: JSON.parse(evaluation.resourceFeasibility),
      technicalFeasibility: JSON.parse(evaluation.technicalFeasibility),
      businessValue: evaluation.businessValue ? JSON.parse(evaluation.businessValue) : null,
      createdAt: evaluation.createdAt.toISOString(),
      // Also return the original inputs to repopulate the form summary
      model: evaluation.model,
      hardware: evaluation.hardware,
      cardCount: String(evaluation.cardCount),
      machineCount: evaluation.machineCount ? String(evaluation.machineCount) : String(1),
      cardsPerMachine: evaluation.cardsPerMachine ? String(evaluation.cardsPerMachine) : String(evaluation.cardCount),
      businessDataDescription: evaluation.businessDataDescription || '',
      businessDataVolume: String(evaluation.businessDataVolume), // 兼容旧数据
      businessDataTypes: JSON.parse(evaluation.businessDataTypes || '[]'),
      businessDataQuality: evaluation.businessDataQuality,
      businessScenario: evaluation.businessScenario,
      performanceTPS: evaluation.performanceTPS ? String(evaluation.performanceTPS) : String(evaluation.performanceQPS || ''),
      performanceQPS: String(evaluation.performanceQPS), // 兼容旧数据
      performanceConcurrency: String(evaluation.performanceConcurrency),
    };


    return NextResponse.json({ success: true, data: responseData })
  } catch (error) {
    console.error("获取评估数据失败:", error)
    return NextResponse.json(
      { success: false, error: { message: "获取评估数据失败" } },
      { status: 500 }
    )
  }
}
