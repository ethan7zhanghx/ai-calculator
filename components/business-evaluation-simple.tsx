"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, AlertCircle, Lightbulb, TrendingUp, AlertTriangle, Shield } from "lucide-react"

interface BusinessEvaluationSimpleProps {
  evaluation: {
    score: number
    summary: string
    disclaimer: string
    dimensions: {
      problemSolutionFit: { score: number; status: "strong" | "moderate" | "weak" }
      roiFeasibility: { score: number }
      competitiveAdvantage: { score: number; level: "differentiated" | "parity" | "lagging" }
      scalability: { score: number; level: "high" | "medium" | "low" }
      implementationRisk: { score: number; level: "low" | "medium" | "high" }
      marketTiming: { score: number; status: "optimal" | "acceptable" | "poor" }
    }
    opportunities: string[]
    risks: string[]
    recommendations: string[]
  }
}

export function BusinessEvaluationSimple({ evaluation }: BusinessEvaluationSimpleProps) {
  if (!evaluation) {
    return null
  }
  const { dimensions } = evaluation

  // 维度评分数据
  const dimensionScores = [
    { label: "问题匹配度", value: dimensions?.problemSolutionFit?.score ?? 0, status: dimensions?.problemSolutionFit?.status ?? 'weak' },
    { label: "ROI合理性", value: dimensions?.roiFeasibility?.score ?? 0, status: "neutral" },
    { label: "竞争优势", value: dimensions?.competitiveAdvantage?.score ?? 0, status: dimensions?.competitiveAdvantage?.level ?? 'lagging' },
    { label: "可扩展性", value: dimensions?.scalability?.score ?? 0, status: dimensions?.scalability?.level ?? 'low' },
    { label: "实施风险", value: dimensions?.implementationRisk?.score ?? 0, status: dimensions?.implementationRisk?.level ?? 'high' },
    { label: "市场时机", value: dimensions?.marketTiming?.score ?? 0, status: dimensions?.marketTiming?.status ?? 'poor' },
  ]

  const getStatusColor = (status: string) => {
    if (status === "strong" || status === "differentiated" || status === "high" || status === "optimal" || status === "low") {
      return "text-green-600"
    }
    if (status === "moderate" || status === "parity" || status === "medium" || status === "acceptable") {
      return "text-amber-600"
    }
    if (status === "weak" || status === "lagging" || status === "poor") {
      return "text-red-600"
    }
    return "text-blue-600"
  }

  const getStatusIcon = (status: string) => {
    if (status === "strong" || status === "differentiated" || status === "optimal") {
      return <CheckCircle2 className="h-3 w-3" />
    }
    if (status === "moderate" || status === "parity" || status === "medium" || status === "acceptable") {
      return <AlertCircle className="h-3 w-3" />
    }
    if (status === "weak" || status === "lagging" || status === "poor" || status === "high") {
      return <XCircle className="h-3 w-3" />
    }
    return <TrendingUp className="h-3 w-3" />
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

      {/* 免责声明 */}
      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-800">
        <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
          <Shield className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>{evaluation.disclaimer}</span>
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

      {/* 商业机会和风险 - 横向布局 */}
      <div className="grid md:grid-cols-2 gap-3">
        {/* 商业机会 */}
        {evaluation.opportunities.length > 0 && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800">
            <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm text-green-900 dark:text-green-100">
              <TrendingUp className="h-4 w-4" />
              商业机会 ({evaluation.opportunities.length})
            </h4>
            <ul className="space-y-1">
              {evaluation.opportunities.slice(0, 3).map((opportunity, index) => (
                <li key={index} className="flex items-start gap-1.5 text-xs text-green-800 dark:text-green-200">
                  <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{opportunity}</span>
                </li>
              ))}
              {evaluation.opportunities.length > 3 && (
                <li className="text-xs text-muted-foreground italic">
                  还有 {evaluation.opportunities.length - 3} 项...
                </li>
              )}
            </ul>
          </div>
        )}

        {/* 潜在风险 */}
        {evaluation.risks.length > 0 && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800">
            <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm text-red-900 dark:text-red-100">
              <AlertTriangle className="h-4 w-4" />
              潜在风险 ({evaluation.risks.length})
            </h4>
            <ul className="space-y-1">
              {evaluation.risks.slice(0, 3).map((risk, index) => (
                <li key={index} className="flex items-start gap-1.5 text-xs text-red-800 dark:text-red-200">
                  <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{risk}</span>
                </li>
              ))}
              {evaluation.risks.length > 3 && (
                <li className="text-xs text-muted-foreground italic">
                  还有 {evaluation.risks.length - 3} 项...
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* 行动建议 */}
      {evaluation.recommendations.length > 0 && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm text-blue-900 dark:text-blue-100">
            <Lightbulb className="h-4 w-4" />
            行动建议 ({evaluation.recommendations.length})
          </h4>
          <ul className="space-y-1">
            {evaluation.recommendations.slice(0, 3).map((rec, index) => (
              <li key={index} className="flex items-start gap-1.5 text-xs text-blue-800 dark:text-blue-200">
                <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{rec}</span>
              </li>
            ))}
            {evaluation.recommendations.length > 3 && (
              <li className="text-xs text-muted-foreground italic">
                还有 {evaluation.recommendations.length - 3} 项...
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
