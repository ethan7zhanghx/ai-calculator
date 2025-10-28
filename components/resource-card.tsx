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
  // 显存占用率用于显示（限制在100%）
  const displayUsagePercent = Math.min(memoryUsagePercent, 100)

  // 根据显存占用率获取颜色和状态
  const getOccupancyStyle = () => {
    if (memoryUsagePercent > 90) {
      // 高占用率：红色（危险）
      return {
        icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
        cardBg: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
        barBg: "bg-red-500",
        circleColor: "text-red-600",
      }
    }
    if (memoryUsagePercent > 70) {
      // 中占用率：黄色（警告）
      return {
        icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
        cardBg: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800",
        barBg: "bg-amber-500",
        circleColor: "text-amber-600",
      }
    }
    // 低占用率：绿色（良好）
    return {
      icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
      cardBg: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
      barBg: "bg-green-500",
      circleColor: "text-green-600",
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
        <div className="flex flex-col xl:flex-row items-center xl:items-start gap-4 mb-3">
          <div className="flex-shrink-0">
            <CircularProgress
              percentage={displayUsagePercent}
              label="显存占用"
              size={100}
              color={style.circleColor}
            />
          </div>

          <div className="flex-1 space-y-2 min-w-0 w-full">
            {/* 显存条形图 */}
            <div>
              <div className="text-xs mb-1">
                <div className="font-medium whitespace-nowrap">显存需求</div>
                <div className="text-muted-foreground whitespace-nowrap">
                  {memoryRequired}GB / {memoryAvailable}GB
                </div>
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
