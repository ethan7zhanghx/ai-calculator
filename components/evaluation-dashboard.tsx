"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScoreRadar } from "@/components/score-radar"
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp, TrendingDown } from "lucide-react"
import type { EvaluationResponse } from "@/lib/types"

interface EvaluationDashboardProps {
  evaluation: EvaluationResponse
}

export function EvaluationDashboard({ evaluation }: EvaluationDashboardProps) {
  // 计算总体评分
  const resourceScore = Math.round(
    (evaluation.resourceFeasibility.pretraining.memoryUsagePercent +
      evaluation.resourceFeasibility.fineTuning.memoryUsagePercent +
      evaluation.resourceFeasibility.inference.memoryUsagePercent) /
      3
  )

  const technicalScore = evaluation.technicalFeasibility.score
  const businessScore = evaluation.businessValue.score

  const overallScore = Math.round((resourceScore + technicalScore + businessScore) / 3)

  // 判断总体状态
  const getOverallStatus = () => {
    if (overallScore >= 80) return { label: "优秀", icon: CheckCircle2, color: "text-green-600", variant: "default" as const }
    if (overallScore >= 60) return { label: "良好", icon: AlertTriangle, color: "text-amber-600", variant: "secondary" as const }
    return { label: "需改进", icon: XCircle, color: "text-red-600", variant: "destructive" as const }
  }

  const status = getOverallStatus()
  const StatusIcon = status.icon

  // 雷达图数据
  const radarScores = [
    { label: "预训练", value: evaluation.resourceFeasibility.pretraining.memoryUsagePercent, color: "#3b82f6" },
    { label: "微调", value: evaluation.resourceFeasibility.fineTuning.memoryUsagePercent, color: "#8b5cf6" },
    { label: "推理", value: evaluation.resourceFeasibility.inference.memoryUsagePercent, color: "#06b6d4" },
    { label: "技术方案", value: technicalScore, color: "#10b981" },
    { label: "商业价值", value: businessScore, color: "#f59e0b" },
  ]

  // 关键指标
  const keyMetrics = [
    {
      label: "资源可行性",
      value: resourceScore,
      trend: resourceScore >= 70 ? "up" : "down",
      status: resourceScore >= 70 ? "good" : "poor",
    },
    {
      label: "技术合理性",
      value: technicalScore,
      trend: technicalScore >= 70 ? "up" : "down",
      status: technicalScore >= 70 ? "good" : "poor",
    },
    {
      label: "商业价值",
      value: businessScore,
      trend: businessScore >= 70 ? "up" : "down",
      status: businessScore >= 70 ? "good" : "poor",
    },
    {
      label: "支持QPS",
      value: evaluation.resourceFeasibility.inference.supportedQPS,
      trend: evaluation.resourceFeasibility.inference.meetsRequirements ? "up" : "down",
      status: evaluation.resourceFeasibility.inference.meetsRequirements ? "good" : "poor",
      isMetric: true,
    },
  ]

  return (
    <Card className="shadow-lg border-2">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">评估总览</CardTitle>
          <Badge variant={status.variant} className="text-base px-4 py-1">
            <StatusIcon className="h-4 w-4 mr-1" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 总体评分 */}
        <div className="flex flex-col items-center justify-center py-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg">
          <div className="text-6xl font-bold text-primary mb-2">{overallScore}</div>
          <div className="text-sm text-muted-foreground">综合评分</div>
          <div className="mt-4 flex gap-2">
            <div className="text-center px-4">
              <div className="text-2xl font-bold">{resourceScore}</div>
              <div className="text-xs text-muted-foreground">资源</div>
            </div>
            <div className="text-center px-4 border-x">
              <div className="text-2xl font-bold">{technicalScore}</div>
              <div className="text-xs text-muted-foreground">技术</div>
            </div>
            <div className="text-center px-4">
              <div className="text-2xl font-bold">{businessScore}</div>
              <div className="text-xs text-muted-foreground">商业</div>
            </div>
          </div>
        </div>

        {/* 关键指标 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {keyMetrics.map((metric, i) => (
            <Card key={i} className={metric.status === "good" ? "border-green-200 bg-green-50/50 dark:bg-green-950/20" : "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20"}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                  {metric.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-amber-600" />
                  )}
                </div>
                <div className="text-2xl font-bold">
                  {metric.value}
                  {!metric.isMetric && <span className="text-sm text-muted-foreground ml-1"></span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 雷达图 */}
        <div className="pt-4 border-t">
          <h4 className="text-center text-sm font-semibold mb-4 text-muted-foreground">多维度评估雷达图</h4>
          <ScoreRadar scores={radarScores} size={280} />
        </div>

        {/* 快速总结 */}
        <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
          <div>
            <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              资源状态
            </h5>
            <p className="text-sm text-muted-foreground">
              {evaluation.resourceFeasibility.inference.feasible
                ? "硬件资源充足,可支持推理任务"
                : "硬件资源不足,需要优化或扩容"}
            </p>
          </div>
          <div>
            <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              技术评估
            </h5>
            <p className="text-sm text-muted-foreground">
              {evaluation.technicalFeasibility.appropriate
                ? "技术选型合理,匹配业务需求"
                : `发现${evaluation.technicalFeasibility.issues.length}个技术问题`}
            </p>
          </div>
          <div>
            <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              商业价值
            </h5>
            <p className="text-sm text-muted-foreground">
              {businessScore >= 70
                ? "商业价值较高,建议推进"
                : "商业价值有待评估,需优化方案"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
