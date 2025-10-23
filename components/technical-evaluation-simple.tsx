"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, AlertCircle, Lightbulb, AlertTriangle } from "lucide-react"

interface TechnicalEvaluationSimpleProps {
  evaluation: {
    score: number
    summary: string
    dimensions: {
      modelTaskAlignment: { status: "matched" | "mismatched" | "partial"; score?: number }
      llmNecessity: { status: "necessary" | "unnecessary" | "debatable"; score?: number }
      fineTuning: { necessary: boolean; dataAdequacy: "sufficient" | "marginal" | "insufficient"; score?: number }
      implementationRoadmap: { feasible: boolean; score?: number }
      performanceRequirements: { reasonable: boolean; score?: number }
      costEfficiency: { level: "reasonable" | "high" | "excessive"; score?: number }
    }
    criticalIssues: string[]
    warnings: string[]
    recommendations: string[]
  }
}

export function TechnicalEvaluationSimple({ evaluation }: TechnicalEvaluationSimpleProps) {
  const { dimensions } = evaluation

  // 维度评分数据
  const dimensionScores = [
    { label: "模型匹配度", value: dimensions.modelTaskAlignment.score || 0, status: dimensions.modelTaskAlignment.status },
    { label: "LLM必要性", value: dimensions.llmNecessity.score || 0, status: dimensions.llmNecessity.status },
    { label: "微调数据", value: dimensions.fineTuning.score || 0, status: dimensions.fineTuning.dataAdequacy },
    { label: "实施路径", value: dimensions.implementationRoadmap.score || 0, status: dimensions.implementationRoadmap.feasible ? "good" : "bad" },
    { label: "性能需求", value: dimensions.performanceRequirements.score || 0, status: dimensions.performanceRequirements.reasonable ? "good" : "bad" },
    { label: "成本效益", value: dimensions.costEfficiency.score || 0, status: dimensions.costEfficiency.level },
  ]

  const getStatusColor = (status: string) => {
    if (status === "matched" || status === "necessary" || status === "sufficient" || status === "good" || status === "reasonable") {
      return "text-green-600"
    }
    if (status === "partial" || status === "debatable" || status === "marginal" || status === "high") {
      return "text-amber-600"
    }
    return "text-red-600"
  }

  const getStatusIcon = (status: string) => {
    if (status === "matched" || status === "necessary" || status === "sufficient" || status === "good" || status === "reasonable") {
      return <CheckCircle2 className="h-3 w-3" />
    }
    if (status === "partial" || status === "debatable" || status === "marginal" || status === "high") {
      return <AlertCircle className="h-3 w-3" />
    }
    return <XCircle className="h-3 w-3" />
  }

  return (
    <div className="space-y-4">
      {/* 评估总结 */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
        <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
          <Lightbulb className="h-4 w-4 text-primary" />
          评估总结
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {evaluation.summary}
        </p>
      </div>

      {/* 各维度评分 - 紧凑网格 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {dimensionScores.map((dim, index) => (
          <div key={index} className="p-2 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{dim.label}</span>
              <span className={`flex items-center gap-1 ${getStatusColor(dim.status)}`}>
                {getStatusIcon(dim.status)}
              </span>
            </div>
            <div className="text-lg font-bold">{dim.value}</div>
          </div>
        ))}
      </div>

      {/* 关键问题和建议 - 横向布局 */}
      <div className="grid md:grid-cols-2 gap-3">
        {/* 关键问题 */}
        {(evaluation.criticalIssues.length > 0 || evaluation.warnings.length > 0) && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-800">
            <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm text-amber-900 dark:text-amber-100">
              <AlertTriangle className="h-4 w-4" />
              关键问题 ({evaluation.criticalIssues.length + evaluation.warnings.length})
            </h4>
            <ul className="space-y-1">
              {evaluation.criticalIssues.slice(0, 2).map((issue, index) => (
                <li key={index} className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-200">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span className="line-clamp-2">{issue}</span>
                </li>
              ))}
              {evaluation.warnings.slice(0, 2).map((warning, index) => (
                <li key={index} className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-200">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span className="line-clamp-2">{warning}</span>
                </li>
              ))}
              {(evaluation.criticalIssues.length + evaluation.warnings.length > 4) && (
                <li className="text-xs text-muted-foreground italic">
                  还有 {evaluation.criticalIssues.length + evaluation.warnings.length - 4} 项...
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
              {evaluation.recommendations.slice(0, 4).map((rec, index) => (
                <li key={index} className="flex items-start gap-1.5 text-xs text-blue-800 dark:text-blue-200">
                  <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{rec}</span>
                </li>
              ))}
              {evaluation.recommendations.length > 4 && (
                <li className="text-xs text-muted-foreground italic">
                  还有 {evaluation.recommendations.length - 4} 项...
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
