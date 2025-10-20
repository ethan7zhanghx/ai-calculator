"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Loader2, Sparkles } from "lucide-react"

const STAGES = [
  // 技术方案评估阶段
  { text: "正在分析模型与业务匹配度...", duration: 5000 },
  { text: "正在评估大模型必要性...", duration: 5000 },
  { text: "正在检查微调必要性与数据充分性...", duration: 5000 },
  { text: "正在规划业务可行性与实施路径...", duration: 7500 },
  { text: "正在评估性能需求合理性...", duration: 5000 },
  { text: "正在分析技术成本效益...", duration: 5000 },
  { text: "正在生成技术方案建议...", duration: 10000 },
  // 商业价值评估阶段
  { text: "正在评估问题与解决方案匹配度...", duration: 5000 },
  { text: "正在分析ROI预期合理性...", duration: 5000 },
  { text: "正在评估市场竞争优势...", duration: 5000 },
  { text: "正在分析可扩展性与增长潜力...", duration: 5000 },
  { text: "正在识别落地风险...", duration: 5000 },
  { text: "正在评估时间窗口与紧迫性...", duration: 7500 },
  { text: "正在生成商业价值报告...", duration: 10000 },
]

export function EvaluationProgress() {
  const [currentStage, setCurrentStage] = useState(0)
  const [progress, setProgress] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    // 阶段切换
    const stageTimer = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < STAGES.length - 1) {
          return prev + 1
        }
        return prev
      })
    }, STAGES[currentStage]?.duration || 4000)

    // 进度条平滑增长（调整速度以匹配更长的总时间）
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev < 95) {
          return prev + 1
        }
        return prev
      })
    }, 750) // 从300ms改为750ms，使进度条增长速度减慢2.5倍

    // 计时器
    const timeTimer = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)

    return () => {
      clearInterval(stageTimer)
      clearInterval(progressTimer)
      clearInterval(timeTimer)
    }
  }, [currentStage])

  // 总预计时间约为 14个阶段 * 平均9.6秒 ≈ 135秒 ≈ 2分15秒，保守估计3分钟
  const estimatedRemaining = Math.max(0, 180 - elapsedTime)

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds} 秒`
    }
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes} 分 ${secs} 秒`
  }

  return (
    <Card className="shadow-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="pt-6 space-y-4">
        {/* 标题 */}
        <div className="flex items-center justify-center gap-3">
          <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          <h3 className="text-lg font-semibold text-primary">AI 深度分析中</h3>
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        </div>

        {/* 进度条 */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progress}% 完成</span>
            <span>预计还需 {formatTime(estimatedRemaining)}</span>
          </div>
        </div>

        {/* 当前阶段 */}
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/60 backdrop-blur">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm font-medium">
              {STAGES[currentStage]?.text || "正在处理..."}
            </span>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="text-center text-xs text-muted-foreground pt-2 border-t">
          💡 完整评估包含技术方案和商业价值两大模块，预计需要 1-3 分钟，感谢您的耐心等待
        </div>
      </CardContent>
    </Card>
  )
}
