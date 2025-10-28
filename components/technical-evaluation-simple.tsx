"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, AlertCircle, Lightbulb, AlertTriangle } from "lucide-react"
import { TechnicalEvaluationResult } from "@/lib/technical-evaluator"

interface TechnicalEvaluationSimpleProps {
  evaluation: TechnicalEvaluationResult
}

export function TechnicalEvaluationSimple({ evaluation }: TechnicalEvaluationSimpleProps) {
  const [showAllIssues, setShowAllIssues] = useState(false)
  const [showAllRecommendations, setShowAllRecommendations] = useState(false)

  if (!evaluation || !evaluation.dimensions) {
    return null
  }
  const { dimensions } = evaluation

  // 维度评分数据
  const dimensionScores = [
    { label: "技术可行性", score: dimensions.technicalFeasibility?.score ?? 0 },
    { label: "LLM必要性", score: dimensions.llmNecessity?.score ?? 0 },
    { label: "模型适配度", score: dimensions.modelFit?.score ?? 0 },
    { label: "数据质量", score: dimensions.dataAdequacy?.score ?? 0 },
    { label: "硬件性能", score: dimensions.hardwarePerformanceFit?.score ?? 0 },
    { label: "实施风险", score: dimensions.implementationRisk?.score ?? 0 },
  ]

  const getDimensionStyle = (score: number) => {
    if (score >= 80) {
      return { color: "text-green-600", Icon: CheckCircle2 }
    }
    if (score >= 50) {
      return { color: "text-amber-600", Icon: AlertCircle }
    }
    return { color: "text-red-600", Icon: XCircle }
  }

  const issuesToShow = 2;
  const recommendationsToShow = 3;

  return (
    <div className="space-y-4">
      {/* 评估总结 */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
        <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
          <Lightbulb className="h-4 w-4 text-primary" />
          AI评估摘要
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {evaluation.summary}
        </p>
      </div>

      {/* 各维度评分 - 紧凑网格 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {dimensionScores.map((dim, index) => {
          const { color, Icon } = getDimensionStyle(dim.score)
          return (
            <div key={index} className="p-2 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{dim.label}</span>
                <span className={`flex items-center gap-1 ${color}`}>
                  <Icon className="h-3 w-3" />
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold">{dim.score}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 关键问题和建议 - 横向布局 */}
      <div className="grid md:grid-cols-2 gap-3">
        {/* 关键问题 */}
        {evaluation.criticalIssues.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-800">
            <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm text-amber-900 dark:text-amber-100">
              <AlertTriangle className="h-4 w-4" />
              关键问题 ({evaluation.criticalIssues.length})
            </h4>
            <ul className="space-y-1">
              {evaluation.criticalIssues.slice(0, showAllIssues ? evaluation.criticalIssues.length : issuesToShow).map((issue, index) => (
                <li key={index} className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-200">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{issue}</span>
                </li>
              ))}
              {evaluation.criticalIssues.length > issuesToShow && (
                <li>
                  <button
                    onClick={() => setShowAllIssues(!showAllIssues)}
                    className="text-xs text-muted-foreground italic hover:underline mt-1"
                  >
                    {showAllIssues ? "收起" : `还有 ${evaluation.criticalIssues.length - issuesToShow} 项...`}
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* 核心建议 */}
        {evaluation.recommendations.length > 0 && (
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800">
            <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm text-blue-900 dark:text-blue-100">
              <Lightbulb className="h-4 w-4" />
              核心建议 ({evaluation.recommendations.length})
            </h4>
            <ul className="space-y-1">
              {evaluation.recommendations.slice(0, showAllRecommendations ? evaluation.recommendations.length : recommendationsToShow).map((rec, index) => (
                <li key={index} className="flex items-start gap-1.5 text-xs text-blue-800 dark:text-blue-200">
                  <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
              {evaluation.recommendations.length > recommendationsToShow && (
                <li>
                  <button
                    onClick={() => setShowAllRecommendations(!showAllRecommendations)}
                    className="text-xs text-muted-foreground italic hover:underline mt-1"
                  >
                    {showAllRecommendations ? "收起" : `还有 ${evaluation.recommendations.length - recommendationsToShow} 项...`}
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* 下载完整报告提示 */}
      <div className="mt-4 p-3 text-center rounded-lg bg-background/50 border border-border">
        <p className="text-sm text-muted-foreground">
          要点总结如上，您也可以在页面底端下载<span className="font-semibold text-primary">完整版评估报告</span>以深入了解。
        </p>
      </div>
    </div>
  )
}
