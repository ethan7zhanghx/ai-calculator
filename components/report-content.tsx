"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Printer } from "lucide-react"
import { useRouter } from "next/navigation"
import { calculateResourceScore } from "@/lib/resource-calculator"

interface ReportContentProps {
  evaluation: any
}

export function ReportContent({ evaluation }: ReportContentProps) {
  const router = useRouter()

  const handlePrint = () => {
    window.print()
  }

  // 使用保存的硬件评分，确保历史记录显示一致性
  const resourceScore = evaluation.hardwareScore ??
    evaluation.technicalFeasibility?.hardwareScore ??
    Math.round((
      calculateResourceScore(evaluation.resourceFeasibility?.pretraining?.memoryUsagePercent ?? 0) +
      calculateResourceScore(evaluation.resourceFeasibility?.fineTuning?.memoryUsagePercent ?? 0) +
      calculateResourceScore(evaluation.resourceFeasibility?.inference?.memoryUsagePercent ?? 0)
    ) / 3)

  const techData = evaluation.technicalFeasibility?.detailedEvaluation || evaluation.technicalFeasibility
  const technicalScore = techData?.score || 0
  const businessScore = evaluation.businessValue?.score || 0
  const overallScore = evaluation.businessValue
    ? Math.round((resourceScore + technicalScore + businessScore) / 3)
    : Math.round((resourceScore + technicalScore) / 2)

  return (
    <div className="min-h-screen bg-white">
      {/* 工具栏 - 只在屏幕显示，打印时隐藏 */}
      <div className="print:hidden sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <h1 className="text-lg font-semibold">AI需求评估完整报告</h1>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            打印报告
          </Button>
        </div>
      </div>

      {/* 报告内容 */}
      <div className="container mx-auto px-6 py-8 max-w-5xl print:px-0 print:py-0 print:max-w-none">
        <article className="prose prose-sm max-w-none print:prose-print">
          {/* 报告标题 */}
          <div className="text-center mb-8 print:mb-6">
            <h1 className="text-3xl font-bold mb-2 print:text-2xl">AI需求评估完整报告</h1>
            <p className="text-muted-foreground text-sm">
              生成时间: {new Date(evaluation.createdAt).toLocaleString("zh-CN")}
            </p>
          </div>

          <hr className="my-6" />

          {/* 评估总览 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">📊 评估总览</h2>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 mb-4 print:bg-gray-50">
              <div className="text-center">
                <div className="text-5xl font-bold text-blue-600 mb-2">{overallScore}</div>
                <div className="text-sm text-muted-foreground">综合评分 / 100</div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{resourceScore}</div>
                  <div className="text-xs text-muted-foreground">资源可行性</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{technicalScore}</div>
                  <div className="text-xs text-muted-foreground">技术合理性</div>
                </div>
                {evaluation.businessValue && (
                  <div className="text-center">
                    <div className="text-2xl font-bold">{businessScore}</div>
                    <div className="text-xs text-muted-foreground">场景价值</div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <hr className="my-6 print:my-4" />

          {/* 资源可行性评估 */}
          <section className="mb-8 page-break-inside-avoid">
            <h2 className="text-2xl font-bold mb-4">💻 资源可行性评估</h2>

            <div className="space-y-6">
              {/* 预训练 */}
              <div>
                <h3 className="text-xl font-semibold mb-2">预训练</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>可行性:</strong> {evaluation.resourceFeasibility?.pretraining?.feasible ? "✅ 可行" : "❌ 不可行"}
                  </li>
                  <li>
                    <strong>显存满足度:</strong> {evaluation.resourceFeasibility?.pretraining?.memoryUsagePercent || 0}%
                  </li>
                  <li>
                    <strong>显存需求:</strong> {evaluation.resourceFeasibility?.pretraining?.memoryRequired || 0} GB / {evaluation.resourceFeasibility?.pretraining?.memoryAvailable || 0} GB
                  </li>
                </ul>
                {evaluation.resourceFeasibility?.pretraining?.suggestions && evaluation.resourceFeasibility.pretraining.suggestions.length > 0 && (
                  <div className="mt-2">
                    <strong>建议:</strong>
                    <ul className="list-disc pl-5 mt-1">
                      {evaluation.resourceFeasibility.pretraining.suggestions.map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 微调 */}
              <div>
                <h3 className="text-xl font-semibold mb-2">微调</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>可行性:</strong> {evaluation.resourceFeasibility?.fineTuning?.feasible ? "✅ 可行" : "❌ 不可行"}
                  </li>
                  <li>
                    <strong>显存满足度:</strong> {evaluation.resourceFeasibility?.fineTuning?.memoryUsagePercent || 0}%
                  </li>
                  <li>
                    <strong>显存需求:</strong> {evaluation.resourceFeasibility?.fineTuning?.memoryRequired || 0} GB / {evaluation.resourceFeasibility?.fineTuning?.memoryAvailable || 0} GB
                  </li>
                  <li>
                    <strong>LoRA:</strong> {evaluation.resourceFeasibility?.fineTuning?.loraFeasible ? "✅ 可行" : "❌ 不可行"}
                  </li>
                  <li>
                    <strong>QLoRA:</strong> {evaluation.resourceFeasibility?.fineTuning?.qloraFeasible ? "✅ 可行" : "❌ 不可行"}
                  </li>
                </ul>
                {evaluation.resourceFeasibility?.fineTuning?.suggestions && evaluation.resourceFeasibility.fineTuning.suggestions.length > 0 && (
                  <div className="mt-2">
                    <strong>建议:</strong>
                    <ul className="list-disc pl-5 mt-1">
                      {evaluation.resourceFeasibility.fineTuning.suggestions.map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 推理 */}
              <div>
                <h3 className="text-xl font-semibold mb-2">推理</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>可行性:</strong> {evaluation.resourceFeasibility?.inference?.feasible ? "✅ 可行" : "❌ 不可行"}
                  </li>
                  <li>
                    <strong>显存满足度:</strong> {evaluation.resourceFeasibility?.inference?.memoryUsagePercent || 0}%
                  </li>
                  <li>
                    <strong>显存需求:</strong> {evaluation.resourceFeasibility?.inference?.memoryRequired || 0} GB / {evaluation.resourceFeasibility?.inference?.memoryAvailable || 0} GB
                  </li>
                  <li>
                    <strong>支持的QPS:</strong> {evaluation.resourceFeasibility?.inference?.supportedQPS || 0}
                  </li>
                  <li>
                    <strong>吞吐量:</strong> {evaluation.resourceFeasibility?.inference?.supportedThroughput || 0}
                  </li>
                  <li>
                    <strong>满足性能要求:</strong> {evaluation.resourceFeasibility?.inference?.meetsRequirements ? "✅ 是" : "❌ 否"}
                  </li>
                </ul>
                {evaluation.resourceFeasibility?.inference?.suggestions && evaluation.resourceFeasibility.inference.suggestions.length > 0 && (
                  <div className="mt-2">
                    <strong>建议:</strong>
                    <ul className="list-disc pl-5 mt-1">
                      {evaluation.resourceFeasibility.inference.suggestions.map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>

          <hr className="my-6 print:my-4 page-break-before" />

          {/* 技术方案合理性评估 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">🔧 技术方案合理性评估</h2>

            <div className="bg-blue-50 rounded-lg p-4 mb-4 print:bg-gray-50">
              <div className="text-center">
                <span className="text-3xl font-bold text-blue-600">{technicalScore}</span>
                <span className="text-sm text-muted-foreground ml-2">/ 100</span>
              </div>
            </div>

            {techData && techData.summary && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">评估总结</h3>
                <p className="text-sm leading-relaxed">{techData.summary}</p>
              </div>
            )}

            {techData?.criticalIssues && techData.criticalIssues.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2 text-red-600">⚠️ 致命问题</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {techData.criticalIssues.map((issue: string, i: number) => (
                    <li key={i} className="text-sm">{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {techData?.dimensions && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-2">详细维度分析</h3>

                {/* 技术可行性 */}
                <div className="page-break-inside-avoid">
                  <h4 className="font-semibold mb-1">1. 技术可行性</h4>
                  <p className="text-sm mb-1">
                    <strong>评分:</strong> {techData.dimensions?.technicalFeasibility?.score || 0} / 100
                  </p>
                  <p className="text-sm mb-2">
                    <strong>分析:</strong> {techData.dimensions?.technicalFeasibility?.analysis || '暂无分析'}
                  </p>
                  {techData.dimensions?.technicalFeasibility?.implementationPath?.paradigm && (
                    <p className="text-sm mb-2">
                      <strong>推荐技术范式:</strong> {techData.dimensions.technicalFeasibility.implementationPath.paradigm}
                    </p>
                  )}
                  {techData.dimensions?.technicalFeasibility?.implementationPath?.shortTerm && techData.dimensions.technicalFeasibility.implementationPath.shortTerm.length > 0 && (
                    <div className="mb-2">
                      <strong className="text-sm">短期可落地 (1-2个月):</strong>
                      <ul className="list-disc pl-5 mt-1">
                        {techData.dimensions.technicalFeasibility.implementationPath.shortTerm.map((item: string, i: number) => (
                          <li key={i} className="text-sm">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* 大模型必要性 */}
                <div className="page-break-inside-avoid">
                  <h4 className="font-semibold mb-1">2. 大模型必要性</h4>
                  <p className="text-sm mb-1">
                    <strong>评分:</strong> {techData.dimensions?.llmNecessity?.score || 0} / 100
                  </p>
                  <p className="text-sm mb-2">
                    <strong>分析:</strong> {techData.dimensions?.llmNecessity?.analysis || '暂无分析'}
                  </p>
                </div>

                {/* 模型适配度 */}
                <div className="page-break-inside-avoid">
                  <h4 className="font-semibold mb-1">3. 模型适配度</h4>
                  <p className="text-sm mb-1">
                    <strong>评分:</strong> {techData.dimensions?.modelFit?.score || 0} / 100
                  </p>
                  <p className="text-sm mb-2">
                    <strong>分析:</strong> {techData.dimensions?.modelFit?.analysis || '暂无分析'}
                  </p>
                </div>

                {/* 数据质量与充足性 */}
                <div className="page-break-inside-avoid">
                  <h4 className="font-semibold mb-1">4. 数据质量与充足性</h4>
                  <p className="text-sm mb-1">
                    <strong>评分:</strong> {techData.dimensions?.dataAdequacy?.score || 0} / 100
                  </p>
                  <p className="text-sm mb-2">
                    <strong>分析:</strong> {techData.dimensions?.dataAdequacy?.analysis || '暂无分析'}
                  </p>
                </div>

                {/* 硬件与性能匹配度 */}
                <div className="page-break-inside-avoid">
                  <h4 className="font-semibold mb-1">5. 硬件与性能匹配度</h4>
                  <p className="text-sm mb-1">
                    <strong>评分:</strong> {techData.dimensions?.hardwarePerformanceFit?.score || 0} / 100
                  </p>
                  <p className="text-sm mb-2">
                    <strong>分析:</strong> {techData.dimensions?.hardwarePerformanceFit?.analysis || '暂无分析'}
                  </p>
                </div>

                {/* 实施风险 */}
                <div className="page-break-inside-avoid">
                  <h4 className="font-semibold mb-1">6. 实施风险</h4>
                  <p className="text-sm mb-1">
                    <strong>评分:</strong> {techData.dimensions?.implementationRisk?.score || 0} / 100
                  </p>
                  <p className="text-sm mb-2">
                    <strong>分析:</strong> {techData.dimensions?.implementationRisk?.analysis || '暂无分析'}
                  </p>
                </div>
              </div>
            )}

            {techData?.recommendations && techData.recommendations.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">💡 总体建议</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {techData.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="text-sm">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* 场景价值评估 */}
          {evaluation.businessValue && (
            <>
              <hr className="my-6 print:my-4 page-break-before" />
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">💰 场景价值评估</h2>

                <div className="bg-amber-50 rounded-lg p-4 mb-4 print:bg-gray-50">
                  <div className="text-center">
                    <span className="text-3xl font-bold text-amber-600">{businessScore}</span>
                    <span className="text-sm text-muted-foreground ml-2">/ 100</span>
                  </div>
                </div>

                {evaluation.businessValue.detailedEvaluation && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">评估总结</h3>
                      <p className="text-sm leading-relaxed">{evaluation.businessValue.detailedEvaluation.summary}</p>
                    </div>

                    {evaluation.businessValue.detailedEvaluation.opportunities && evaluation.businessValue.detailedEvaluation.opportunities.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">📈 商业机会</h3>
                        <ul className="list-disc pl-5 space-y-1">
                          {evaluation.businessValue.detailedEvaluation.opportunities.map((opp: string, i: number) => (
                            <li key={i} className="text-sm">{opp}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {evaluation.businessValue.detailedEvaluation.risks && evaluation.businessValue.detailedEvaluation.risks.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">⚠️ 潜在风险</h3>
                        <ul className="list-disc pl-5 space-y-1">
                          {evaluation.businessValue.detailedEvaluation.risks.map((risk: string, i: number) => (
                            <li key={i} className="text-sm">{risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {evaluation.businessValue.detailedEvaluation.recommendations && evaluation.businessValue.detailedEvaluation.recommendations.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">💡 行动建议</h3>
                        <ul className="list-disc pl-5 space-y-1">
                          {evaluation.businessValue.detailedEvaluation.recommendations.map((rec: string, i: number) => (
                            <li key={i} className="text-sm">{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </>
          )}

          <hr className="my-6 print:my-4" />

          {/* 报告说明 */}
          <footer className="text-center text-sm text-muted-foreground mt-8">
            <p>*本报告由AI需求计算器自动生成*</p>
          </footer>
        </article>
      </div>

      {/* 打印样式 */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 2cm;
            size: A4;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .page-break-before {
            page-break-before: always;
          }

          .page-break-inside-avoid {
            page-break-inside: avoid;
          }

          /* 打印时的prose样式优化 */
          .prose-print h1 {
            font-size: 24pt;
            margin-bottom: 12pt;
          }

          .prose-print h2 {
            font-size: 18pt;
            margin-top: 16pt;
            margin-bottom: 8pt;
          }

          .prose-print h3 {
            font-size: 14pt;
            margin-top: 12pt;
            margin-bottom: 6pt;
          }

          .prose-print h4 {
            font-size: 12pt;
            margin-top: 8pt;
            margin-bottom: 4pt;
          }

          .prose-print p, .prose-print li {
            font-size: 10pt;
            line-height: 1.5;
          }

          .prose-print ul, .prose-print ol {
            margin-top: 4pt;
            margin-bottom: 8pt;
          }
        }
      `}</style>
    </div>
  )
}
