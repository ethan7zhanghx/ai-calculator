"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CircularProgress } from "@/components/circular-progress"
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react"

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
  const getStatusIcon = () => {
    if (memoryUsagePercent >= 80) return <CheckCircle2 className="h-5 w-5 text-green-600" />
    if (memoryUsagePercent >= 50) return <AlertTriangle className="h-5 w-5 text-amber-600" />
    return <XCircle className="h-5 w-5 text-red-600" />
  }

  const getStatusColor = () => {
    if (memoryUsagePercent >= 80) return "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
    if (memoryUsagePercent >= 50) return "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800"
    return "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
  }

  return (
    <Card className={`border-2 ${getStatusColor()}`}>
      <CardContent className="pt-6">
        {/* 标题和状态 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <h4 className="text-lg font-bold">{title}</h4>
          </div>
          <Badge variant={feasible ? "default" : "destructive"} className="text-sm px-3 py-1">
            {feasible ? "✓ 可行" : "✗ 不可行"}
          </Badge>
        </div>

        {/* 环形进度条和显存信息 */}
        <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
          <div className="flex-shrink-0">
            <CircularProgress percentage={memoryUsagePercent} label="显存满足度" size={140} />
          </div>

          <div className="flex-1 space-y-3 w-full">
            {/* 显存条形图 */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">显存需求</span>
                <span className="text-muted-foreground">
                  {memoryRequired}GB / {memoryAvailable}GB
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    memoryUsagePercent >= 80
                      ? "bg-green-500"
                      : memoryUsagePercent >= 50
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(memoryUsagePercent, 100)}%` }}
                />
              </div>
            </div>

            {/* 额外信息 */}
            {extraInfo && <div className="pt-2">{extraInfo}</div>}
          </div>
        </div>

        {/* 建议列表 */}
        {suggestions.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <h5 className="text-sm font-semibold text-muted-foreground">建议:</h5>
            <ul className="space-y-2">
              {suggestions.map((suggestion, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-primary mt-0.5">→</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
