"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, AlertCircle, Lightbulb, TrendingUp, AlertTriangle, Shield } from "lucide-react"

interface BusinessEvaluationSimpleProps {
  evaluation: {
    score: number
    summary: string
    disclaimer: string
    dimensions: {
      // 1. 问题-场景聚焦程度
      problemScenarioFocus: {
        score: number
        painPointClarity: "clear" | "moderate" | "unclear"
        aiNecessity: "essential" | "helpful" | "unnecessary"
      }
      // 2. 技术壁垒优势
      technicalBarrier: {
        score: number
        differentiationLevel: "high" | "medium" | "low"
      }
      // 3. 数据支撑潜力
      dataSupportPotential: {
        score: number
        flywheelPotential: "strong" | "moderate" | "weak"
      }
      // 4. AI人才储备
      aiTalentReserve: {
        score: number
        talentLevel: "strong" | "moderate" | "weak"
      }
      // 5. ROI合理度
      roiFeasibility: {
        score: number
        investmentLevel: "high" | "medium" | "low"
      }
      // 6. 市场竞争力
      marketCompetitiveness: {
        score: number
        marketTiming: "optimal" | "acceptable" | "poor"
      }
    }
    opportunities: string[]
    risks: string[]
    recommendations: string[]
  }
}

export function BusinessEvaluationSimple({ evaluation }: BusinessEvaluationSimpleProps) {
  const [showAllOpportunities, setShowAllOpportunities] = useState(false)
  const [showAllRisks, setShowAllRisks] = useState(false)
  const [showAllRecommendations, setShowAllRecommendations] = useState(false)

  if (!evaluation) {
    return null
  }
  const { dimensions } = evaluation

  // 维度评分数据
  const dimensionScores = [
    { label: "场景聚焦程度", value: dimensions?.problemScenarioFocus?.score ?? 0, status: dimensions?.problemScenarioFocus?.painPointClarity ?? 'unclear' },
    { label: "技术壁垒优势", value: dimensions?.technicalBarrier?.score ?? 0, status: dimensions?.technicalBarrier?.differentiationLevel ?? 'low' },
    { label: "数据支撑潜力", value: dimensions?.dataSupportPotential?.score ?? 0, status: dimensions?.dataSupportPotential?.flywheelPotential ?? 'weak' },
    { label: "AI人才储备", value: dimensions?.aiTalentReserve?.score ?? 0, status: dimensions?.aiTalentReserve?.talentLevel ?? 'weak' },
    { label: "ROI合理度", value: dimensions?.roiFeasibility?.score ?? 0, status: dimensions?.roiFeasibility?.investmentLevel ?? 'high' },
    { label: "市场竞争力", value: dimensions?.marketCompetitiveness?.score ?? 0, status: dimensions?.marketCompetitiveness?.marketTiming ?? 'poor' },
  ]

  const getStatusColor = (status: string) => {
    // 正面状态（绿色）
    if (status === "clear" || status === "essential" || status === "high" || status === "strong" || status === "optimal" || status === "low") {
      return "text-green-600"
    }
    // 中性状态（琥珀色）
    if (status === "moderate" || status === "helpful" || status === "medium" || status === "acceptable") {
      return "text-amber-600"
    }
    // 负面状态（红色）
    if (status === "unclear" || status === "unnecessary" || status === "weak" || status === "poor") {
      return "text-red-600"
    }
    return "text-blue-600"
  }

  const getStatusIcon = (status: string) => {
    // 正面状态图标
    if (status === "clear" || status === "essential" || status === "high" || status === "strong" || status === "optimal" || status === "low") {
      return <CheckCircle2 className="h-3 w-3" />
    }
    // 中性状态图标
    if (status === "moderate" || status === "helpful" || status === "medium" || status === "acceptable") {
      return <AlertCircle className="h-3 w-3" />
    }
    // 负面状态图标
    if (status === "unclear" || status === "unnecessary" || status === "weak" || status === "poor") {
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
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold">{dim.value}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </div>
        ))}
      </div>

      {/* 场景机会和风险 - 横向布局 */}
      <div className="grid md:grid-cols-2 gap-3">
        {/* 场景机会 */}
        {evaluation.opportunities.length > 0 && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800">
            <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm text-green-900 dark:text-green-100">
              <TrendingUp className="h-4 w-4" />
              场景机会 ({evaluation.opportunities.length})
            </h4>
            <ul className="space-y-1">
              {evaluation.opportunities.slice(0, showAllOpportunities ? evaluation.opportunities.length : 3).map((opportunity, index) => (
                <li key={index} className="flex items-start gap-1.5 text-xs text-green-800 dark:text-green-200">
                  <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>{opportunity}</span>
                </li>
              ))}
              {evaluation.opportunities.length > 3 && (
                <li>
                  <button
                    onClick={() => setShowAllOpportunities(!showAllOpportunities)}
                    className="text-xs text-muted-foreground italic hover:underline"
                  >
                    {showAllOpportunities ? "收起" : `展开另外 ${evaluation.opportunities.length - 3} 项...`}
                  </button>
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
              {evaluation.risks.slice(0, showAllRisks ? evaluation.risks.length : 3).map((risk, index) => (
                <li key={index} className="flex items-start gap-1.5 text-xs text-red-800 dark:text-red-200">
                  <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>{risk}</span>
                </li>
              ))}
              {evaluation.risks.length > 3 && (
                <li>
                  <button
                    onClick={() => setShowAllRisks(!showAllRisks)}
                    className="text-xs text-muted-foreground italic hover:underline"
                  >
                    {showAllRisks ? "收起" : `展开另外 ${evaluation.risks.length - 3} 项...`}
                  </button>
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
            {evaluation.recommendations.slice(0, showAllRecommendations ? evaluation.recommendations.length : 3).map((rec, index) => (
              <li key={index} className="flex items-start gap-1.5 text-xs text-blue-800 dark:text-blue-200">
                <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{rec}</span>
              </li>
            ))}
            {evaluation.recommendations.length > 3 && (
              <li>
                <button
                  onClick={() => setShowAllRecommendations(!showAllRecommendations)}
                  className="text-xs text-muted-foreground italic hover:underline"
                >
                  {showAllRecommendations ? "收起" : `展开另外 ${evaluation.recommendations.length - 3} 项...`}
                </button>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* 下载完整报告提示 */}
      <div className="mt-4 p-3 text-center rounded-lg bg-secondary/20 border border-border">
        <p className="text-sm text-muted-foreground">
          想深入了解？页面底部可下载<span className="font-semibold text-primary">完整版评估报告</span>。
        </p>
      </div>
    </div>
  )
}
