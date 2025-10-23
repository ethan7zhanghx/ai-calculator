"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"

interface InputSummaryProps {
  model: string
  hardware: string
  cardCount: string
  dataVolume: string
  dataTypes: string[]
  dataQuality: string
  qps: string
  concurrency: string
  onEdit?: () => void
}

export function InputSummary({
  model,
  hardware,
  cardCount,
  dataVolume,
  dataTypes,
  dataQuality,
  qps,
  concurrency,
  onEdit,
}: InputSummaryProps) {
  const dataTypeLabels: Record<string, string> = {
    text: "文本",
    image: "图片",
    qa_pair: "QA Pair",
    video: "视频",
    audio: "音频",
  }

  return (
    <Card className="shadow-lg lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">输入配置</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* 模型和硬件 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-muted-foreground">模型</span>
            <span className="font-medium">{model}</span>
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-muted-foreground">硬件</span>
            <span className="font-medium">{hardware}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">卡数</span>
            <span className="font-medium">{cardCount} 张</span>
          </div>
        </div>

        <Separator />

        {/* 数据信息 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">数据量</span>
            <span className="font-medium">{Number(dataVolume).toLocaleString()} 条</span>
          </div>
          <div className="mb-2">
            <div className="text-muted-foreground mb-1">数据类型</div>
            <div className="flex flex-wrap gap-1">
              {dataTypes.map((type) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {dataTypeLabels[type] || type}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">数据治理</span>
            <Badge variant={dataQuality === "high" ? "default" : "secondary"} className="text-xs">
              {dataQuality === "high" ? "已治理" : "未治理"}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* 性能要求 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-muted-foreground">期望QPS</span>
            <span className="font-medium">{qps}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">并发数</span>
            <span className="font-medium">{concurrency}</span>
          </div>
        </div>

        {/* 编辑按钮 - 底部 */}
        {onEdit && (
          <>
            <Separator />
            <Button
              variant="outline"
              size="lg"
              onClick={onEdit}
              className="w-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-medium"
            >
              <Edit className="h-4 w-4 mr-2" />
              重新编辑配置
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
