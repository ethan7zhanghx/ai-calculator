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

import { TechnicalEvaluationResult } from "@/lib/technical-evaluator"

interface TechnicalEvaluationDetailedProps {
  evaluation: TechnicalEvaluationResult
}

export function TechnicalEvaluationDetailed({ evaluation }: TechnicalEvaluationDetailedProps) {
  if (!evaluation || !evaluation.dimensions) {
    return null; // or a loading skeleton
  }
  const { dimensions } = evaluation

  // 分数徽章
  const ScoreBadge = ({ score }: { score: number | undefined }) => {
    const finalScore = score ?? 0;
    const getScoreColor = () => {
      if (finalScore >= 90) return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-700"
      if (finalScore >= 70) return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-700"
      if (finalScore >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-100 dark:border-yellow-700"
      if (finalScore >= 30) return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-100 dark:border-orange-700"
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-700"
    }
    return (
      <div
        className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getScoreColor()}`}
      >
        {finalScore}
      </div>
    )
  }

  const ParadigmBadge = ({ paradigm }: { paradigm: string }) => {
    const paradigmMap: Record<string, { label: string, color: string }> = {
      "RAG": { label: "RAG 方案", color: "bg-sky-100 text-sky-800 border-sky-200" },
      "Fine-tuning": { label: "微调方案", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
      "Agent": { label: "Agent 方案", color: "bg-purple-100 text-purple-800 border-purple-200" },
      "General": { label: "通用方案", color: "bg-slate-100 text-slate-800 border-slate-200" },
      "Not Recommended": { label: "不推荐", color: "bg-red-100 text-red-800 border-red-200" },
    }
    const config = paradigmMap[paradigm] || paradigmMap["General"]
    return (
      <Badge className={`${config.color} dark:bg-opacity-20 dark:text-white/80`}>{config.label}</Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* 评估总结 */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
        <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
          <Lightbulb className="h-4 w-4 text-primary" />
          评估总结
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {evaluation.summary}
        </p>
      </div>

      {/* 致命问题 */}
      {evaluation.criticalIssues.length > 0 && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800">
          <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm text-red-900 dark:text-red-100">
            <XCircle className="h-4 w-4" />
            关键问题
          </h4>
          <ul className="space-y-1.5">
            {evaluation.criticalIssues.map((issue, index) => (
              <li key={index} className="flex items-start gap-2 text-xs text-red-800 dark:text-red-200">
                <span className="text-red-500 mt-0.5">•</span>
                <span className="leading-relaxed">{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 详细维度分析 */}
      <Accordion type="multiple" defaultValue={["technicalFeasibility", "modelFit", "dataAdequacy", "hardwarePerformanceFit", "implementationRisk", "llmNecessity"]} className="space-y-2">
        {/* 1. 技术可行性 */}
        <AccordionItem value="technicalFeasibility" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Map className="h-5 w-5 text-primary" />
                <span className="font-semibold">技术可行性</span>
              </div>
              <div className="flex items-center gap-2">
                <ScoreBadge score={dimensions.technicalFeasibility?.score} />
                <ParadigmBadge paradigm={dimensions.technicalFeasibility?.implementationPath.paradigm ?? "General"} />
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {dimensions.technicalFeasibility?.analysis}
            </p>
            {(dimensions.technicalFeasibility?.implementationPath?.shortTerm || dimensions.technicalFeasibility?.implementationPath?.midTerm) && (
              <div className="space-y-3">
                <h5 className="font-medium text-sm">实施路径</h5>
                {dimensions.technicalFeasibility.implementationPath.shortTerm && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800">
                    <h6 className="font-medium text-sm mb-2 text-green-900 dark:text-green-100 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      短期 (1-2个月)
                    </h6>
                    <ul className="space-y-1">
                      {dimensions.technicalFeasibility.implementationPath.shortTerm.map((item, i) => (
                        <li key={i} className="text-sm text-green-800 dark:text-green-200 flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">→</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {dimensions.technicalFeasibility.implementationPath.midTerm && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                    <h6 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      中期 (3-6个月)
                    </h6>
                    <ul className="space-y-1">
                      {dimensions.technicalFeasibility.implementationPath.midTerm.map((item, i) => (
                        <li key={i} className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">→</span>
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

        {/* 2. LLM必要性 */}
        <AccordionItem value="llmNecessity" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <span className="font-semibold">LLM必要性</span>
              </div>
              <ScoreBadge score={dimensions.llmNecessity?.score} />
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {dimensions.llmNecessity?.analysis}
            </p>
            {dimensions.llmNecessity?.alternatives && (
              <div className="p-3 rounded-lg bg-gray-100 border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                <h5 className="font-medium text-sm mb-2 text-gray-900 dark:text-gray-100">替代方案</h5>
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                  {dimensions.llmNecessity.alternatives}
                </p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 3. 模型适配度 */}
        <AccordionItem value="modelFit" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <span className="font-semibold">模型适配度</span>
              </div>
              <ScoreBadge score={dimensions.modelFit?.score} />
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {dimensions.modelFit?.analysis}
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* 4. 数据质量与充足性 */}
        <AccordionItem value="dataAdequacy" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <span className="font-semibold">数据质量与充足性</span>
              </div>
              <ScoreBadge score={dimensions.dataAdequacy?.score} />
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {dimensions.dataAdequacy?.analysis}
            </p>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-2 bg-muted/50 rounded-md">
                <p className="text-xs text-muted-foreground">质量评估</p>
                <p className="font-semibold text-sm">{dimensions.dataAdequacy?.qualityAssessment}</p>
              </div>
              <div className="p-2 bg-muted/50 rounded-md">
                <p className="text-xs text-muted-foreground">数量评估</p>
                <p className="font-semibold text-sm">{dimensions.dataAdequacy?.quantityAssessment}</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 5. 硬件与性能匹配度 */}
        <AccordionItem value="hardwarePerformanceFit" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <span className="font-semibold">硬件与性能匹配度</span>
              </div>
              <ScoreBadge score={dimensions.hardwarePerformanceFit?.score} />
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {dimensions.hardwarePerformanceFit?.analysis}
            </p>
            {dimensions.hardwarePerformanceFit?.recommendations && dimensions.hardwarePerformanceFit.recommendations.length > 0 && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                <h5 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">优化建议</h5>
                <ul className="space-y-1">
                  {dimensions.hardwarePerformanceFit.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">→</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 6. 实施风险 */}
        <AccordionItem value="implementationRisk" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-semibold">实施风险</span>
              </div>
              <ScoreBadge score={dimensions.implementationRisk?.score} />
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {dimensions.implementationRisk?.analysis}
            </p>
            {dimensions.implementationRisk?.riskItems && dimensions.implementationRisk.riskItems.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-800">
                <h5 className="font-medium text-sm mb-2 text-amber-900 dark:text-amber-100">风险项</h5>
                <ul className="space-y-1">
                  {dimensions.implementationRisk.riskItems.map((item, i) => (
                    <li key={i} className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* 总体建议 */}
      {evaluation.recommendations.length > 0 && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800">
          <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm text-green-900 dark:text-green-100">
            <Lightbulb className="h-4 w-4" />
            总体建议
          </h4>
          <ul className="space-y-1.5">
            {evaluation.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2 text-xs text-green-800 dark:text-green-200">
                <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span className="leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
