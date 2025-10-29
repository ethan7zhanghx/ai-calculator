"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"

interface InputSummaryProps {
  model: string
  hardware: string
  machineCount: string
  cardsPerMachine: string
  dataDescription: string
  dataQuality: string
  businessScenario?: string
  tps: string
  concurrency: string
  onEdit?: () => void
}

export function InputSummary({
  model,
  hardware,
  machineCount,
  cardsPerMachine,
  dataDescription,
  dataQuality,
  businessScenario,
  tps,
  concurrency,
  onEdit,
}: InputSummaryProps) {
  const totalCards = (parseInt(machineCount) || 0) * (parseInt(cardsPerMachine) || 0)

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
          <div className="flex items-center justify-between mb-1">
            <span className="text-muted-foreground">机器配置</span>
            <span className="font-medium">{machineCount} 机 × {cardsPerMachine} 卡</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">总卡数</span>
            <span className="font-medium">{totalCards} 张</span>
          </div>
        </div>

        {businessScenario && (
          <>
            <Separator />

            {/* 业务场景 */}
            <div>
              <div className="text-muted-foreground mb-1">业务场景</div>
              <p className="text-sm font-medium leading-relaxed">{businessScenario}</p>
            </div>
          </>
        )}

        <Separator />

        {/* 数据信息 */}
        <div>
          <div className="mb-2">
            <div className="text-muted-foreground mb-1">微调数据</div>
            <p className="text-sm font-medium leading-relaxed">{dataDescription}</p>
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
            <span className="text-muted-foreground">期望TPS</span>
            <span className="font-medium">{tps}</span>
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
