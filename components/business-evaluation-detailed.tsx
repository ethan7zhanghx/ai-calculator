"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Target,
  Zap,
  Shield,
  Clock,
  Lightbulb,
  AlertTriangle,
  Award,
  Database,
  Users,
} from "lucide-react"

interface BusinessEvaluationDetailedProps {
  evaluation: {
    score: number
    summary: string
    disclaimer: string
    dimensions: {
      // 1. 问题-场景聚焦程度
      problemScenarioFocus: {
        score: number
        analysis: string
        painPointClarity: "clear" | "moderate" | "unclear"
        aiNecessity: "essential" | "helpful" | "unnecessary"
      }
      // 2. 技术壁垒优势
      technicalBarrier: {
        score: number
        analysis: string
        differentiationLevel: "high" | "medium" | "low"
        competitiveAdvantages: string[]
      }
      // 3. 数据支撑潜力
      dataSupportPotential: {
        score: number
        analysis: string
        dataCompleteness: number
        dataAccuracy: number
        dataTimeliness: number
        flywheelPotential: "strong" | "moderate" | "weak"
      }
      // 4. AI人才储备
      aiTalentReserve: {
        score: number
        analysis: string
        talentLevel: "strong" | "moderate" | "weak"
        capabilityGaps: string[]
        developmentSuggestions: string[]
      }
      // 5. ROI合理度
      roiFeasibility: {
        score: number
        analysis: string
        investmentLevel: "high" | "medium" | "low"
        returnPath: string[]
      }
      // 6. 市场竞争力
      marketCompetitiveness: {
        score: number
        analysis: string
        marketTiming: "optimal" | "acceptable" | "poor"
        competitivePosition: "leading" | "following" | "lagging"
      }
    }
    opportunities: string[]
    risks: string[]
    recommendations: string[]
  }
}

export function BusinessEvaluationDetailed({ evaluation }: BusinessEvaluationDetailedProps) {
  if (!evaluation || !evaluation.dimensions) {
    return null
  }
  const { dimensions } = evaluation

  // 状态标识徽章
  const getStatusBadge = (type: string, value: string | undefined) => {
    if (!value) return null
    const configs: Record<string, Record<string, { variant: any; icon: any; label: string }>> = {
      clarity: {
        clear: { variant: "default", icon: CheckCircle2, label: "明确" },
        moderate: { variant: "secondary", icon: AlertCircle, label: "中等" },
        unclear: { variant: "destructive", icon: XCircle, label: "不明确" },
      },
      necessity: {
        essential: { variant: "default", icon: CheckCircle2, label: "必要" },
        helpful: { variant: "secondary", icon: AlertCircle, label: "有帮助" },
        unnecessary: { variant: "destructive", icon: XCircle, label: "非必要" },
      },
      differentiation: {
        high: { variant: "default", icon: Award, label: "高差异化" },
        medium: { variant: "secondary", icon: AlertCircle, label: "中等差异化" },
        low: { variant: "destructive", icon: XCircle, label: "低差异化" },
      },
      flywheel: {
        strong: { variant: "default", icon: TrendingUp, label: "强飞轮效应" },
        moderate: { variant: "secondary", icon: AlertCircle, label: "中等飞轮效应" },
        weak: { variant: "destructive", icon: XCircle, label: "弱飞轮效应" },
      },
      talent: {
        strong: { variant: "default", icon: CheckCircle2, label: "储备充足" },
        moderate: { variant: "secondary", icon: AlertCircle, label: "储备中等" },
        weak: { variant: "destructive", icon: XCircle, label: "储备不足" },
      },
      investment: {
        high: { variant: "destructive", icon: AlertTriangle, label: "投入较高" },
        medium: { variant: "secondary", icon: AlertCircle, label: "投入中等" },
        low: { variant: "default", icon: CheckCircle2, label: "投入较低" },
      },
      timing: {
        optimal: { variant: "default", icon: CheckCircle2, label: "最佳时机" },
        acceptable: { variant: "secondary", icon: AlertCircle, label: "可接受" },
        poor: { variant: "destructive", icon: XCircle, label: "时机不佳" },
      },
      position: {
        leading: { variant: "default", icon: Award, label: "领先" },
        following: { variant: "secondary", icon: AlertCircle, label: "跟随" },
        lagging: { variant: "destructive", icon: XCircle, label: "落后" },
      },
    }

    const config = configs[type]?.[value]
    if (!config) return null

    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* 评估总结 */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          评估总结
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {evaluation.summary}
        </p>
      </div>

      {/* 免责声明 */}
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-800">
        <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-900 dark:text-amber-100">
          <Shield className="h-5 w-5" />
          免责声明
        </h4>
        <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
          {evaluation.disclaimer}
        </p>
      </div>

      {/* 场景机会 */}
      {evaluation.opportunities.length > 0 && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800">
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-900 dark:text-green-100">
            <TrendingUp className="h-5 w-5" />
            场景机会
          </h4>
          <ul className="space-y-2">
            {evaluation.opportunities.map((opportunity, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-green-800 dark:text-green-200">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="leading-relaxed">{opportunity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 潜在风险 */}
      {evaluation.risks.length > 0 && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800">
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-red-900 dark:text-red-100">
            <AlertTriangle className="h-5 w-5" />
            潜在风险
          </h4>
          <ul className="space-y-2">
            {evaluation.risks.map((risk, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-red-800 dark:text-red-200">
                <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="leading-relaxed">{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 详细维度分析 */}
      <Accordion type="multiple" defaultValue={["focus", "barrier", "data", "talent"]} className="space-y-2">
        {/* 1. 问题-场景聚焦程度 */}
        <AccordionItem value="focus" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <span className="font-semibold">场景聚焦程度</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">评分: {dimensions.problemScenarioFocus?.score ?? 0}</span>
                {getStatusBadge("clarity", dimensions.problemScenarioFocus?.painPointClarity ?? 'unclear')}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div>
              <h5 className="font-medium mb-2 text-sm">深度分析</h5>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {dimensions.problemScenarioFocus?.analysis}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <span className="text-sm font-medium">AI必要性:</span>
              {getStatusBadge("necessity", dimensions.problemScenarioFocus?.aiNecessity ?? 'unnecessary')}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 2. 技术壁垒优势 */}
        <AccordionItem value="barrier" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <span className="font-semibold">技术壁垒优势</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">评分: {dimensions.technicalBarrier?.score ?? 0}</span>
                {getStatusBadge("differentiation", dimensions.technicalBarrier?.differentiationLevel ?? 'low')}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div>
              <h5 className="font-medium mb-2 text-sm">竞争优势分析</h5>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {dimensions.technicalBarrier?.analysis}
              </p>
            </div>

            {dimensions.technicalBarrier?.competitiveAdvantages?.length > 0 && (
              <div>
                <h5 className="font-medium mb-2 text-sm">竞争优势</h5>
                <ul className="space-y-1">
                  {dimensions.technicalBarrier.competitiveAdvantages.map((advantage, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{advantage}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 3. 数据支撑潜力 */}
        <AccordionItem value="data" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <span className="font-semibold">数据支撑潜力</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">评分: {dimensions.dataSupportPotential?.score ?? 0}</span>
                {getStatusBadge("flywheel", dimensions.dataSupportPotential?.flywheelPotential ?? 'weak')}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div>
              <h5 className="font-medium mb-2 text-sm">数据质量分析</h5>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {dimensions.dataSupportPotential?.analysis}
              </p>
            </div>

            {/* 数据评分指标 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">数据完整性</div>
                <div className="text-lg font-bold">{dimensions.dataSupportPotential?.dataCompleteness ?? 0}</div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">数据准确性</div>
                <div className="text-lg font-bold">{dimensions.dataSupportPotential?.dataAccuracy ?? 0}</div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">数据时效性</div>
                <div className="text-lg font-bold">{dimensions.dataSupportPotential?.dataTimeliness ?? 0}</div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 4. AI人才储备 */}
        <AccordionItem value="talent" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-semibold">AI人才储备</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">评分: {dimensions.aiTalentReserve?.score ?? 0}</span>
                {getStatusBadge("talent", dimensions.aiTalentReserve?.talentLevel ?? 'weak')}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div>
              <h5 className="font-medium mb-2 text-sm">人才能力分析</h5>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {dimensions.aiTalentReserve?.analysis}
              </p>
            </div>

            {dimensions.aiTalentReserve?.capabilityGaps?.length > 0 && (
              <div>
                <h5 className="font-medium mb-2 text-sm">能力缺口</h5>
                <ul className="space-y-1">
                  {dimensions.aiTalentReserve.capabilityGaps.map((gap, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {dimensions.aiTalentReserve?.developmentSuggestions?.length > 0 && (
              <div>
                <h5 className="font-medium mb-2 text-sm">发展建议</h5>
                <ul className="space-y-1">
                  {dimensions.aiTalentReserve.developmentSuggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 5. ROI合理度 */}
        <AccordionItem value="roi" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="font-semibold">ROI合理度</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">评分: {dimensions.roiFeasibility?.score ?? 0}</span>
                {getStatusBadge("investment", dimensions.roiFeasibility?.investmentLevel ?? 'high')}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div>
              <h5 className="font-medium mb-2 text-sm">投入产出分析</h5>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {dimensions.roiFeasibility?.analysis}
              </p>
            </div>

            {dimensions.roiFeasibility?.returnPath?.length > 0 && (
              <div>
                <h5 className="font-medium mb-2 text-sm">回报路径</h5>
                <ul className="space-y-1">
                  {dimensions.roiFeasibility.returnPath.map((path, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{path}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 6. 市场竞争力 */}
        <AccordionItem value="market" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="font-semibold">市场竞争力</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">评分: {dimensions.marketCompetitiveness?.score ?? 0}</span>
                {getStatusBadge("timing", dimensions.marketCompetitiveness?.marketTiming ?? 'poor')}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div>
              <h5 className="font-medium mb-2 text-sm">市场分析</h5>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {dimensions.marketCompetitiveness?.analysis}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <span className="text-sm font-medium">竞争地位:</span>
              {getStatusBadge("position", dimensions.marketCompetitiveness?.competitivePosition ?? 'lagging')}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* 行动建议 */}
      {evaluation.recommendations.length > 0 && (
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Lightbulb className="h-5 w-5" />
            行动建议
          </h4>
          <ul className="space-y-2">
            {evaluation.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="leading-relaxed">{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
