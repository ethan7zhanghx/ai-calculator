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
} from "lucide-react"

interface BusinessEvaluationDetailedProps {
  evaluation: {
    score: number
    summary: string
    disclaimer: string
    dimensions: {
      problemSolutionFit: {
        score: number
        status: "strong" | "moderate" | "weak"
        analysis: string
        painPoints: string[]
        aiNecessity: "high" | "medium" | "low"
      }
      roiFeasibility: {
        score: number
        analysis: string
        considerations: string[]
      }
      competitiveAdvantage: {
        score: number
        level: "differentiated" | "parity" | "lagging"
        analysis: string
        barriers: string[]
      }
      scalability: {
        score: number
        level: "high" | "medium" | "low"
        analysis: string
        growthPotential: string[]
      }
      implementationRisk: {
        score: number
        level: "low" | "medium" | "high"
        analysis: string
        risks: {
          technical: string[]
          business: string[]
          compliance: string[]
          organizational: string[]
        }
        mitigations: string[]
      }
      marketTiming: {
        score: number
        status: "optimal" | "acceptable" | "poor"
        analysis: string
        urgency: "high" | "medium" | "low"
      }
    }
    opportunities: string[]
    risks: string[]
    recommendations: string[]
  }
}

export function BusinessEvaluationDetailed({ evaluation }: BusinessEvaluationDetailedProps) {
  if (!evaluation || !evaluation.dimensions) {
    return null; // or a loading skeleton
  }
  const { dimensions } = evaluation

  // 状态标识徽章
  const getStatusBadge = (type: string, value: string | undefined) => {
    if (!value) return null;
    const configs: Record<string, Record<string, { variant: any; icon: any; label: string }>> = {
      fit: {
        strong: {
          variant: "default",
          icon: CheckCircle2,
          label: "强匹配",
        },
        moderate: {
          variant: "secondary",
          icon: AlertCircle,
          label: "中等匹配",
        },
        weak: {
          variant: "destructive",
          icon: XCircle,
          label: "弱匹配",
        },
      },
      necessity: {
        high: { variant: "default", icon: CheckCircle2, label: "高必要性" },
        medium: { variant: "secondary", icon: AlertCircle, label: "中等必要性" },
        low: { variant: "destructive", icon: XCircle, label: "低必要性" },
      },
      level: {
        differentiated: {
          variant: "default",
          icon: Award,
          label: "差异化优势",
        },
        parity: {
          variant: "secondary",
          icon: AlertCircle,
          label: "持平",
        },
        lagging: {
          variant: "destructive",
          icon: XCircle,
          label: "落后",
        },
      },
      scalability: {
        high: { variant: "default", icon: TrendingUp, label: "高扩展性" },
        medium: { variant: "secondary", icon: AlertCircle, label: "中等扩展性" },
        low: { variant: "destructive", icon: XCircle, label: "低扩展性" },
      },
      risk: {
        low: { variant: "default", icon: CheckCircle2, label: "低风险" },
        medium: { variant: "secondary", icon: AlertCircle, label: "中等风险" },
        high: { variant: "destructive", icon: AlertTriangle, label: "高风险" },
      },
      timing: {
        optimal: { variant: "default", icon: CheckCircle2, label: "最佳时机" },
        acceptable: { variant: "secondary", icon: AlertCircle, label: "可接受" },
        poor: { variant: "destructive", icon: XCircle, label: "时机不佳" },
      },
      urgency: {
        high: { variant: "destructive", icon: AlertTriangle, label: "高紧迫性" },
        medium: { variant: "secondary", icon: AlertCircle, label: "中等紧迫性" },
        low: { variant: "outline", icon: Clock, label: "低紧迫性" },
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

      {/* 商业机会 */}
      {evaluation.opportunities.length > 0 && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800">
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-900 dark:text-green-100">
            <TrendingUp className="h-5 w-5" />
            商业机会
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
      <Accordion type="multiple" defaultValue={["fit", "roi", "advantage", "scalability"]} className="space-y-2">
        {/* 1. 问题-解决方案匹配度 */}
        <AccordionItem value="fit" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <span className="font-semibold">问题-解决方案匹配度</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">评分: {dimensions.problemSolutionFit?.score ?? 0}</span>
                {getStatusBadge("fit", dimensions.problemSolutionFit?.status ?? 'weak')}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div>
              <h5 className="font-medium mb-2 text-sm">深度分析</h5>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {dimensions.problemSolutionFit?.analysis}
              </p>
            </div>

            {dimensions.problemSolutionFit?.painPoints?.length > 0 && (
              <div>
                <h5 className="font-medium mb-2 text-sm">识别的业务痛点</h5>
                <ul className="space-y-1">
                  {dimensions.problemSolutionFit.painPoints.map((point, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <span className="text-sm font-medium">AI必要性:</span>
              {getStatusBadge("necessity", dimensions.problemSolutionFit?.aiNecessity ?? 'low')}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 2. ROI预期合理性 */}
        <AccordionItem value="roi" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="font-semibold">ROI预期合理性</span>
              </div>
              <span className="text-sm text-muted-foreground">评分: {dimensions.roiFeasibility?.score ?? 0}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div>
              <h5 className="font-medium mb-2 text-sm">投入产出分析</h5>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {dimensions.roiFeasibility?.analysis}
              </p>
            </div>

            {dimensions.roiFeasibility?.considerations?.length > 0 && (
              <div>
                <h5 className="font-medium mb-2 text-sm">关键考量因素</h5>
                <ul className="space-y-1">
                  {dimensions.roiFeasibility.considerations.map((item, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 3. 市场竞争优势 */}
        <AccordionItem value="advantage" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <span className="font-semibold">市场竞争优势</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">评分: {dimensions.competitiveAdvantage?.score ?? 0}</span>
                {getStatusBadge("level", dimensions.competitiveAdvantage?.level ?? 'lagging')}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div>
              <h5 className="font-medium mb-2 text-sm">竞争态势分析</h5>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {dimensions.competitiveAdvantage?.analysis}
              </p>
            </div>

            {dimensions.competitiveAdvantage?.barriers?.length > 0 && (
              <div>
                <h5 className="font-medium mb-2 text-sm">潜在竞争壁垒</h5>
                <ul className="space-y-1">
                  {dimensions.competitiveAdvantage.barriers.map((barrier, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{barrier}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 4. 可扩展性与增长潜力 */}
        <AccordionItem value="scalability" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <span className="font-semibold">可扩展性与增长潜力</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">评分: {dimensions.scalability?.score ?? 0}</span>
                {getStatusBadge("scalability", dimensions.scalability?.level ?? 'low')}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div>
              <h5 className="font-medium mb-2 text-sm">扩展性分析</h5>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {dimensions.scalability?.analysis}
              </p>
            </div>

            {dimensions.scalability?.growthPotential?.length > 0 && (
              <div>
                <h5 className="font-medium mb-2 text-sm">增长潜力</h5>
                <ul className="space-y-1">
                  {dimensions.scalability.growthPotential.map((potential, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                      <span>{potential}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 5. 落地风险评估 */}
        <AccordionItem value="risk" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-semibold">落地风险评估</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">评分: {dimensions.implementationRisk?.score ?? 0}</span>
                {getStatusBadge("risk", dimensions.implementationRisk?.level ?? 'high')}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div>
              <h5 className="font-medium mb-2 text-sm">风险分析</h5>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {dimensions.implementationRisk?.analysis}
              </p>
            </div>

            {/* 风险分类 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dimensions.implementationRisk?.risks?.technical?.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h6 className="font-medium text-sm mb-2 text-red-700 dark:text-red-400">技术风险</h6>
                  <ul className="space-y-1">
                    {dimensions.implementationRisk.risks.technical.map((risk, index) => (
                      <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {dimensions.implementationRisk?.risks?.business?.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h6 className="font-medium text-sm mb-2 text-amber-700 dark:text-amber-400">业务风险</h6>
                  <ul className="space-y-1">
                    {dimensions.implementationRisk.risks.business.map((risk, index) => (
                      <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {dimensions.implementationRisk?.risks?.compliance?.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h6 className="font-medium text-sm mb-2 text-purple-700 dark:text-purple-400">合规风险</h6>
                  <ul className="space-y-1">
                    {dimensions.implementationRisk.risks.compliance.map((risk, index) => (
                      <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                        <span className="text-purple-500 mt-0.5">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {dimensions.implementationRisk?.risks?.organizational?.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h6 className="font-medium text-sm mb-2 text-blue-700 dark:text-blue-400">组织风险</h6>
                  <ul className="space-y-1">
                    {dimensions.implementationRisk.risks.organizational.map((risk, index) => (
                      <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 缓解措施 */}
            {dimensions.implementationRisk?.mitigations?.length > 0 && (
              <div>
                <h5 className="font-medium mb-2 text-sm">风险缓解措施</h5>
                <ul className="space-y-1">
                  {dimensions.implementationRisk.mitigations.map((mitigation, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                      <span>{mitigation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 6. 时间窗口与紧迫性 */}
        <AccordionItem value="timing" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="font-semibold">时间窗口与紧迫性</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">评分: {dimensions.marketTiming?.score ?? 0}</span>
                {getStatusBadge("timing", dimensions.marketTiming?.status ?? 'poor')}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div>
              <h5 className="font-medium mb-2 text-sm">时机分析</h5>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {dimensions.marketTiming?.analysis}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <span className="text-sm font-medium">项目紧迫性:</span>
              {getStatusBadge("urgency", dimensions.marketTiming?.urgency ?? 'low')}
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
