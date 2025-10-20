"use client"

import { Card, CardContent } from "@/components/ui/card"
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
  Target,
  Brain,
  Database,
  Map,
  Zap,
  DollarSign,
  Shield,
  Lightbulb,
  AlertTriangle,
} from "lucide-react"

interface TechnicalEvaluationDetailedProps {
  evaluation: {
    score: number
    summary: string
    dimensions: {
      modelTaskAlignment: {
        status: "matched" | "mismatched" | "partial"
        analysis: string
      }
      llmNecessity: {
        status: "necessary" | "unnecessary" | "debatable"
        analysis: string
        alternatives?: string
      }
      fineTuning: {
        necessary: boolean
        dataAdequacy: "sufficient" | "marginal" | "insufficient"
        analysis: string
      }
      implementationRoadmap: {
        feasible: boolean
        analysis: string
        phases: {
          shortTerm?: string[]
          midTerm?: string[]
          notRecommended?: string[]
        }
      }
      performanceRequirements: {
        reasonable: boolean
        analysis: string
      }
      costEfficiency: {
        level: "reasonable" | "high" | "excessive"
        analysis: string
      }
      domainConsiderations?: {
        applicable: boolean
        analysis: string
      }
    }
    criticalIssues: string[]
    warnings: string[]
    recommendations: string[]
  }
}

export function TechnicalEvaluationDetailed({ evaluation }: TechnicalEvaluationDetailedProps) {
  const { dimensions } = evaluation

  // 状态徽章
  const getStatusBadge = (type: string, value: string | boolean) => {
    const configs: Record<string, Record<string, { variant: any; icon: any; label: string }>> = {
      alignment: {
        matched: { variant: "default", icon: CheckCircle2, label: "完全匹配" },
        partial: { variant: "secondary", icon: AlertCircle, label: "部分匹配" },
        mismatched: { variant: "destructive", icon: XCircle, label: "不匹配" },
      },
      necessity: {
        necessary: { variant: "default", icon: CheckCircle2, label: "必要" },
        debatable: { variant: "secondary", icon: AlertCircle, label: "存疑" },
        unnecessary: { variant: "destructive", icon: XCircle, label: "非必要" },
      },
      adequacy: {
        sufficient: { variant: "default", icon: CheckCircle2, label: "充足" },
        marginal: { variant: "secondary", icon: AlertCircle, label: "勉强" },
        insufficient: { variant: "destructive", icon: XCircle, label: "不足" },
      },
      boolean: {
        true: { variant: "default", icon: CheckCircle2, label: "是" },
        false: { variant: "secondary", icon: XCircle, label: "否" },
      },
      reasonable: {
        true: { variant: "default", icon: CheckCircle2, label: "合理" },
        false: { variant: "destructive", icon: XCircle, label: "不合理" },
      },
      cost: {
        reasonable: { variant: "default", icon: CheckCircle2, label: "合理" },
        high: { variant: "secondary", icon: AlertCircle, label: "偏高" },
        excessive: { variant: "destructive", icon: XCircle, label: "过高" },
      },
    }

    const config = configs[type]?.[String(value)]
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

      {/* 致命问题 */}
      {evaluation.criticalIssues.length > 0 && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800">
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-red-900 dark:text-red-100">
            <XCircle className="h-5 w-5" />
            致命问题
          </h4>
          <ul className="space-y-2">
            {evaluation.criticalIssues.map((issue, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-red-800 dark:text-red-200">
                <span className="text-red-500 mt-0.5">•</span>
                <span className="leading-relaxed">{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 警告 */}
      {evaluation.warnings.length > 0 && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-800">
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-amber-900 dark:text-amber-100">
            <AlertTriangle className="h-5 w-5" />
            警告
          </h4>
          <ul className="space-y-2">
            {evaluation.warnings.map((warning, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
                <span className="text-amber-500 mt-0.5">•</span>
                <span className="leading-relaxed">{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 详细维度分析 */}
      <Accordion type="multiple" defaultValue={["alignment", "necessity", "finetuning", "roadmap"]} className="space-y-2">
        {/* 1. 模型与业务匹配度 */}
        <AccordionItem value="alignment" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <span className="font-semibold">模型与业务匹配度</span>
              </div>
              {getStatusBadge("alignment", dimensions.modelTaskAlignment.status)}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {dimensions.modelTaskAlignment.analysis}
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* 2. 大模型必要性 */}
        <AccordionItem value="necessity" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <span className="font-semibold">大模型必要性</span>
              </div>
              {getStatusBadge("necessity", dimensions.llmNecessity.status)}
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {dimensions.llmNecessity.analysis}
            </p>

            {dimensions.llmNecessity.alternatives && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                <h5 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">替代方案</h5>
                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                  {dimensions.llmNecessity.alternatives}
                </p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 3. 微调必要性与数据充分性 */}
        <AccordionItem value="finetuning" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <span className="font-semibold">微调必要性与数据充分性</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge("boolean", dimensions.fineTuning.necessary)}
                {getStatusBadge("adequacy", dimensions.fineTuning.dataAdequacy)}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {dimensions.fineTuning.analysis}
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* 4. 业务可行性与实施路径 */}
        <AccordionItem value="roadmap" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Map className="h-5 w-5 text-primary" />
                <span className="font-semibold">业务可行性与实施路径</span>
              </div>
              {getStatusBadge("boolean", dimensions.implementationRoadmap.feasible)}
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {dimensions.implementationRoadmap.analysis}
            </p>

            {/* 分阶段实施路径 */}
            {(dimensions.implementationRoadmap.phases.shortTerm ||
              dimensions.implementationRoadmap.phases.midTerm ||
              dimensions.implementationRoadmap.phases.notRecommended) && (
              <div className="space-y-3">
                <h5 className="font-medium text-sm">分阶段实施路径</h5>

                {/* 短期可落地 */}
                {dimensions.implementationRoadmap.phases.shortTerm && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800">
                    <h6 className="font-medium text-sm mb-2 text-green-900 dark:text-green-100 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      短期可落地 (1-2个月)
                    </h6>
                    <ul className="space-y-1">
                      {dimensions.implementationRoadmap.phases.shortTerm.map((item, i) => (
                        <li key={i} className="text-sm text-green-800 dark:text-green-200 flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">→</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 中期可落地 */}
                {dimensions.implementationRoadmap.phases.midTerm && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                    <h6 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      中期可落地 (3-6个月)
                    </h6>
                    <ul className="space-y-1">
                      {dimensions.implementationRoadmap.phases.midTerm.map((item, i) => (
                        <li key={i} className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">→</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 不建议做 */}
                {dimensions.implementationRoadmap.phases.notRecommended && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800">
                    <h6 className="font-medium text-sm mb-2 text-red-900 dark:text-red-100 flex items-center gap-1">
                      <XCircle className="h-4 w-4" />
                      不建议做
                    </h6>
                    <ul className="space-y-1">
                      {dimensions.implementationRoadmap.phases.notRecommended.map((item, i) => (
                        <li key={i} className="text-sm text-red-800 dark:text-red-200 flex items-start gap-2">
                          <span className="text-red-600 mt-0.5">✗</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 5. 性能需求合理性 */}
        <AccordionItem value="performance" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <span className="font-semibold">性能需求合理性</span>
              </div>
              {getStatusBadge("reasonable", dimensions.performanceRequirements.reasonable)}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {dimensions.performanceRequirements.analysis}
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* 6. 成本效益 */}
        <AccordionItem value="cost" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="font-semibold">成本效益</span>
              </div>
              {getStatusBadge("cost", dimensions.costEfficiency.level)}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {dimensions.costEfficiency.analysis}
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* 7. 领域特殊考虑 */}
        {dimensions.domainConsiderations?.applicable && (
          <AccordionItem value="domain" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-semibold">领域特殊考虑</span>
                </div>
                <Badge variant="default">适用</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {dimensions.domainConsiderations.analysis}
              </p>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {/* 实施建议 */}
      {evaluation.recommendations.length > 0 && (
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Lightbulb className="h-5 w-5" />
            实施建议
          </h4>
          <ul className="space-y-2">
            {evaluation.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
