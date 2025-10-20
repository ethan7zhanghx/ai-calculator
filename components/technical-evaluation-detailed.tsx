/**
 * 技术方案评估详细展示组件
 * 展示LLM深度评估的完整结果
 */

import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { CheckCircle2, XCircle, AlertCircle, TrendingUp } from "lucide-react"

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

  // 状态图标和颜色映射
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "matched":
      case "necessary":
      case "sufficient":
      case "reasonable":
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />匹配</Badge>
      case "mismatched":
      case "unnecessary":
      case "insufficient":
      case "excessive":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />不匹配</Badge>
      case "partial":
      case "debatable":
      case "marginal":
      case "high":
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />部分</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* 总结 */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          评估总结
        </h4>
        <p className="text-sm leading-relaxed">{evaluation.summary}</p>
      </div>

      {/* 致命问题 */}
      {evaluation.criticalIssues.length > 0 && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
          <h4 className="font-semibold text-sm mb-2 text-red-600 dark:text-red-400 flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            致命问题
          </h4>
          <ul className="space-y-2">
            {evaluation.criticalIssues.map((issue, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-red-600 dark:text-red-400 mt-0.5">•</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 警告 */}
      {evaluation.warnings.length > 0 && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <h4 className="font-semibold text-sm mb-2 text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            警告
          </h4>
          <ul className="space-y-2">
            {evaluation.warnings.map((warning, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Separator />

      {/* 详细维度分析 - 使用手风琴 */}
      <Accordion type="multiple" className="w-full" defaultValue={["alignment", "necessity", "finetuning", "roadmap"]}>
        {/* 1. 模型与业务匹配度 */}
        <AccordionItem value="alignment">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <span className="font-medium">模型与业务匹配度</span>
              {getStatusBadge(dimensions.modelTaskAlignment.status)}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {dimensions.modelTaskAlignment.analysis}
                </p>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* 2. 大模型必要性 */}
        <AccordionItem value="necessity">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <span className="font-medium">大模型必要性</span>
              {getStatusBadge(dimensions.llmNecessity.status)}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {dimensions.llmNecessity.analysis}
                </p>
                {dimensions.llmNecessity.alternatives && (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <h5 className="text-xs font-semibold mb-1 text-blue-600 dark:text-blue-400">替代方案：</h5>
                    <p className="text-sm text-blue-900 dark:text-blue-100">{dimensions.llmNecessity.alternatives}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* 3. 微调评估 */}
        <AccordionItem value="finetuning">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <span className="font-medium">微调必要性与数据充分性</span>
              <Badge variant={dimensions.fineTuning.necessary ? "default" : "secondary"}>
                {dimensions.fineTuning.necessary ? "需要微调" : "无需微调"}
              </Badge>
              {getStatusBadge(dimensions.fineTuning.dataAdequacy)}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {dimensions.fineTuning.analysis}
                </p>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* 4. 业务可行性与实施路径 */}
        <AccordionItem value="roadmap">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <span className="font-medium">业务可行性与实施路径</span>
              <Badge variant={dimensions.implementationRoadmap.feasible ? "default" : "destructive"}>
                {dimensions.implementationRoadmap.feasible ? "可行" : "不可行"}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-4 space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {dimensions.implementationRoadmap.analysis}
                </p>

                {/* 分阶段实施路径 */}
                {(dimensions.implementationRoadmap.phases.shortTerm ||
                  dimensions.implementationRoadmap.phases.midTerm ||
                  dimensions.implementationRoadmap.phases.notRecommended) && (
                  <div className="space-y-3">
                    <h5 className="text-sm font-semibold">实施路径：</h5>

                    {/* 短期可落地 */}
                    {dimensions.implementationRoadmap.phases.shortTerm && (
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                        <h6 className="text-xs font-semibold mb-2 text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          短期可落地 (1-2个月)
                        </h6>
                        <ul className="space-y-1">
                          {dimensions.implementationRoadmap.phases.shortTerm.map((item, i) => (
                            <li key={i} className="text-sm flex gap-2">
                              <span className="text-green-600 dark:text-green-400">→</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 中期可落地 */}
                    {dimensions.implementationRoadmap.phases.midTerm && (
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                        <h6 className="text-xs font-semibold mb-2 text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          中期可落地 (3-6个月)
                        </h6>
                        <ul className="space-y-1">
                          {dimensions.implementationRoadmap.phases.midTerm.map((item, i) => (
                            <li key={i} className="text-sm flex gap-2">
                              <span className="text-blue-600 dark:text-blue-400">→</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 不建议 */}
                    {dimensions.implementationRoadmap.phases.notRecommended && (
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                        <h6 className="text-xs font-semibold mb-2 text-red-600 dark:text-red-400 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          不建议做
                        </h6>
                        <ul className="space-y-1">
                          {dimensions.implementationRoadmap.phases.notRecommended.map((item, i) => (
                            <li key={i} className="text-sm flex gap-2">
                              <span className="text-red-600 dark:text-red-400">✗</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* 5. 性能需求合理性 */}
        <AccordionItem value="performance">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <span className="font-medium">性能需求合理性</span>
              {getStatusBadge(dimensions.performanceRequirements.reasonable ? "reasonable" : "excessive")}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {dimensions.performanceRequirements.analysis}
                </p>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* 6. 成本效益 */}
        <AccordionItem value="cost">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <span className="font-medium">成本效益</span>
              {getStatusBadge(dimensions.costEfficiency.level)}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {dimensions.costEfficiency.analysis}
                </p>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* 7. 领域特殊考虑 */}
        {dimensions.domainConsiderations?.applicable && (
          <AccordionItem value="domain">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <span className="font-medium">领域特殊考虑</span>
                <Badge variant="secondary">适用</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {dimensions.domainConsiderations.analysis}
                  </p>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      <Separator />

      {/* 实施建议 */}
      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-sm mb-3 text-blue-600 dark:text-blue-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          实施建议
        </h4>
        <ul className="space-y-2">
          {evaluation.recommendations.map((rec, i) => (
            <li key={i} className="text-sm flex gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-0.5">→</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
