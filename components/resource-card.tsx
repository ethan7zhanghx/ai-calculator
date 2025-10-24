"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CircularProgress } from "@/components/circular-progress"
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import { calculateResourceScore } from "@/lib/resource-calculator"

interface ResourceCardProps {
  title: string
  feasible: boolean
  memoryUsagePercent: number
  memoryRequired: number
  memoryAvailable: number
  suggestions: string[]
  extraInfo?: React.ReactNode
}

export function ResourceCard({
  title,
  feasible,
  memoryUsagePercent,
  memoryRequired,
  memoryAvailable,
  suggestions,
  extraInfo,
}: ResourceCardProps) {
  // 计算可行性得分
  const feasibilityScore = calculateResourceScore(memoryUsagePercent)

  // 根据可行性得分获取颜色和状态
  const getOccupancyStyle = () => {
    if (feasibilityScore < 20) {
      return {
        icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
        cardBg: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
        barBg: "bg-red-500",
      }
    }
    if (feasibilityScore < 50) {
      return {
        icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
        cardBg: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800",
        barBg: "bg-amber-500",
      }
    }
    return {
      icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
      cardBg: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
      barBg: "bg-green-500",
    }
  }

  const style = getOccupancyStyle()

  return (
    <Card className={`border ${style.cardBg}`}>
      <CardContent className="p-4">
        {/* 标题和状态 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {style.icon}
            <h4 className="text-base font-bold">{title}</h4>
          </div>
          <Badge variant={feasible ? "default" : "destructive"} className="text-xs px-2 py-0.5">
            {feasible ? "✓ 可行" : "✗ 不可行"}
          </Badge>
        </div>

        {/* 环形进度条和显存信息 */}
        <div className="flex items-start gap-4 mb-3">
          <div className="flex-shrink-0">
            <CircularProgress
              percentage={feasibilityScore}
              label="可行性"
              size={100}
            />
          </div>

          <div className="flex-1 space-y-2 min-w-0">
            {/* 显存条形图 */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium">显存需求</span>
                <span className="text-muted-foreground">
                  {memoryRequired}GB / {memoryAvailable}GB
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${style.barBg}`}
                  style={{ width: `${Math.min(memoryUsagePercent, 100)}%` }}
                />
              </div>
            </div>

            {/* 额外信息 */}
            {extraInfo && <div className="pt-1">{extraInfo}</div>}
          </div>
        </div>

        {/* 建议列表 */}
        {suggestions.length > 0 && (
          <div className="space-y-1.5 pt-3 border-t">
            <h5 className="text-xs font-semibold text-muted-foreground">建议:</h5>
            <ul className="space-y-1.5">
              {suggestions.map((suggestion, i) => (
                <li key={i} className="flex gap-1.5 text-xs">
                  <span className="text-primary mt-0.5">→</span>
                  <span className="flex-1">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
