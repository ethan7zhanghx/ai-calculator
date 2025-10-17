"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, AlertCircle, Lightbulb } from "lucide-react"

interface BusinessValueChartProps {
  score: number
  risks: string[]
  opportunities: string[]
}

export function BusinessValueChart({ score, risks, opportunities }: BusinessValueChartProps) {
  // 计算评级
  const getRating = () => {
    if (score >= 80) return { label: "优秀", color: "text-green-600", bgColor: "bg-green-600" }
    if (score >= 60) return { label: "良好", color: "text-blue-600", bgColor: "bg-blue-600" }
    if (score >= 40) return { label: "中等", color: "text-amber-600", bgColor: "bg-amber-600" }
    return { label: "较低", color: "text-red-600", bgColor: "bg-red-600" }
  }

  const rating = getRating()

  // 评分段
  const scoreSegments = [
    { min: 0, max: 40, label: "较低", color: "bg-red-500" },
    { min: 40, max: 60, label: "中等", color: "bg-amber-500" },
    { min: 60, max: 80, label: "良好", color: "bg-blue-500" },
    { min: 80, max: 100, label: "优秀", color: "bg-green-500" },
  ]

  return (
    <div className="space-y-6">
      {/* 评分可视化 */}
      <div className="relative">
        {/* 评分条 */}
        <div className="flex h-12 rounded-lg overflow-hidden mb-4">
          {scoreSegments.map((segment, i) => (
            <div key={i} className={`flex-1 ${segment.color} opacity-30`} />
          ))}
        </div>

        {/* 指针 */}
        <div
          className="absolute top-0 transition-all duration-500"
          style={{ left: `${score}%`, transform: "translateX(-50%)" }}
        >
          <div className="flex flex-col items-center">
            <div className={`w-1 h-12 ${rating.bgColor}`} />
            <div className="mt-2 bg-background border-2 border-primary rounded-lg px-4 py-2 shadow-lg">
              <div className={`text-3xl font-bold ${rating.color}`}>{score}</div>
              <div className="text-xs text-center text-muted-foreground">{rating.label}</div>
            </div>
          </div>
        </div>

        {/* 刻度标签 */}
        <div className="flex justify-between text-xs text-muted-foreground mt-16">
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>

      {/* 风险和机会 */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* 风险 */}
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <h4 className="font-semibold text-red-600">潜在风险</h4>
              <span className="ml-auto text-sm text-muted-foreground">{risks.length}项</span>
            </div>
            {risks.length > 0 ? (
              <ul className="space-y-2">
                {risks.map((risk, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-red-600 mt-0.5">⚠</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">未发现明显风险</p>
            )}
          </CardContent>
        </Card>

        {/* 机会 */}
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-green-600">发展机会</h4>
              <span className="ml-auto text-sm text-muted-foreground">{opportunities.length}项</span>
            </div>
            {opportunities.length > 0 ? (
              <ul className="space-y-2">
                {opportunities.map((opp, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>{opp}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">需进一步挖掘机会</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 价值趋势指示 */}
      <div className="flex items-center justify-center gap-8 py-4 border-t">
        <div className="text-center">
          <TrendingUp className={`h-8 w-8 mx-auto mb-2 ${score >= 60 ? "text-green-600" : "text-muted-foreground"}`} />
          <div className="text-xs text-muted-foreground">
            {score >= 60 ? "值得投资" : "需谨慎评估"}
          </div>
        </div>
      </div>
    </div>
  )
}
