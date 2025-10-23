import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const evaluationId = params.id

    // 可选：验证用户token
    const authHeader = request.headers.get("authorization")
    let userId: string | undefined

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "")
      const payload = await verifyToken(token)
      userId = payload?.userId
    }

    // 获取评估数据
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        user: { select: { name: true } },
      },
    })

    if (!evaluation) {
      return NextResponse.json(
        { success: false, error: { message: "评估记录不存在" } },
        { status: 404 }
      )
    }

    // 生成Markdown格式的完整报告
    const report = generateMarkdownReport(evaluation)

    // 返回Markdown文件
    return new NextResponse(report, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="AI评估报告_${new Date().toLocaleDateString()}.md"`,
      },
    })
  } catch (error) {
    console.error("生成报告失败:", error)
    return NextResponse.json(
      { success: false, error: { message: "生成报告失败" } },
      { status: 500 }
    )
  }
}

function generateMarkdownReport(evaluation: any): string {
  const data = evaluation.data as any

  let markdown = `# AI需求评估完整报告\n\n`
  markdown += `**生成时间**: ${new Date(evaluation.createdAt).toLocaleString("zh-CN")}\n\n`
  markdown += `---\n\n`

  // 1. 评估总览
  markdown += `## 📊 评估总览\n\n`

  const resourceScore = Math.round(
    (data.resourceFeasibility.pretraining.memoryUsagePercent +
      data.resourceFeasibility.fineTuning.memoryUsagePercent +
      data.resourceFeasibility.inference.memoryUsagePercent) /
      3
  )
  const technicalScore = data.technicalFeasibility.score
  const businessScore = data.businessValue?.score || 0
  const overallScore = data.businessValue
    ? Math.round((resourceScore + technicalScore + businessScore) / 3)
    : Math.round((resourceScore + technicalScore) / 2)

  markdown += `### 综合评分: **${overallScore}** / 100\n\n`
  markdown += `- 资源可行性: **${resourceScore}** / 100\n`
  markdown += `- 技术合理性: **${technicalScore}** / 100\n`
  if (data.businessValue) {
    markdown += `- 商业价值: **${businessScore}** / 100\n`
  }
  markdown += `\n---\n\n`

  // 2. 资源可行性评估
  markdown += `## 💻 资源可行性评估\n\n`
  markdown += `### 预训练\n\n`
  markdown += `- **可行性**: ${data.resourceFeasibility.pretraining.feasible ? "✅ 可行" : "❌ 不可行"}\n`
  markdown += `- **显存满足度**: ${data.resourceFeasibility.pretraining.memoryUsagePercent}%\n`
  markdown += `- **显存需求**: ${data.resourceFeasibility.pretraining.memoryRequired} GB / ${data.resourceFeasibility.pretraining.memoryAvailable} GB\n\n`
  if (data.resourceFeasibility.pretraining.suggestions.length > 0) {
    markdown += `**建议**:\n`
    data.resourceFeasibility.pretraining.suggestions.forEach((s: string) => {
      markdown += `- ${s}\n`
    })
  }
  markdown += `\n`

  markdown += `### 微调\n\n`
  markdown += `- **可行性**: ${data.resourceFeasibility.fineTuning.feasible ? "✅ 可行" : "❌ 不可行"}\n`
  markdown += `- **显存满足度**: ${data.resourceFeasibility.fineTuning.memoryUsagePercent}%\n`
  markdown += `- **显存需求**: ${data.resourceFeasibility.fineTuning.memoryRequired} GB / ${data.resourceFeasibility.fineTuning.memoryAvailable} GB\n`
  markdown += `- **LoRA**: ${data.resourceFeasibility.fineTuning.loraFeasible ? "✅ 可行" : "❌ 不可行"}\n`
  markdown += `- **QLoRA**: ${data.resourceFeasibility.fineTuning.qloraFeasible ? "✅ 可行" : "❌ 不可行"}\n\n`
  if (data.resourceFeasibility.fineTuning.suggestions.length > 0) {
    markdown += `**建议**:\n`
    data.resourceFeasibility.fineTuning.suggestions.forEach((s: string) => {
      markdown += `- ${s}\n`
    })
  }
  markdown += `\n`

  markdown += `### 推理\n\n`
  markdown += `- **可行性**: ${data.resourceFeasibility.inference.feasible ? "✅ 可行" : "❌ 不可行"}\n`
  markdown += `- **显存满足度**: ${data.resourceFeasibility.inference.memoryUsagePercent}%\n`
  markdown += `- **显存需求**: ${data.resourceFeasibility.inference.memoryRequired} GB / ${data.resourceFeasibility.inference.memoryAvailable} GB\n`
  markdown += `- **支持的QPS**: ${data.resourceFeasibility.inference.supportedQPS}\n`
  markdown += `- **吞吐量**: ${data.resourceFeasibility.inference.supportedThroughput}\n`
  markdown += `- **满足性能要求**: ${data.resourceFeasibility.inference.meetsRequirements ? "✅ 是" : "❌ 否"}\n\n`
  if (data.resourceFeasibility.inference.suggestions.length > 0) {
    markdown += `**建议**:\n`
    data.resourceFeasibility.inference.suggestions.forEach((s: string) => {
      markdown += `- ${s}\n`
    })
  }
  markdown += `\n---\n\n`

  // 3. 技术方案合理性评估
  markdown += `## 🔧 技术方案合理性评估\n\n`
  markdown += `### 评分: **${data.technicalFeasibility.score}** / 100\n\n`

  if (data.technicalFeasibility.detailedEvaluation) {
    const tech = data.technicalFeasibility.detailedEvaluation
    markdown += `**评估总结**:\n${tech.summary}\n\n`

    if (tech.criticalIssues && tech.criticalIssues.length > 0) {
      markdown += `### ⚠️ 致命问题\n\n`
      tech.criticalIssues.forEach((issue: string) => {
        markdown += `- ${issue}\n`
      })
      markdown += `\n`
    }

    if (tech.warnings && tech.warnings.length > 0) {
      markdown += `### ⚡ 警告\n\n`
      tech.warnings.forEach((warning: string) => {
        markdown += `- ${warning}\n`
      })
      markdown += `\n`
    }

    // 各维度详细分析
    markdown += `### 详细维度分析\n\n`

    markdown += `#### 1. 模型与业务匹配度\n`
    markdown += `**状态**: ${tech.dimensions.modelTaskAlignment.status}\n\n`
    markdown += `${tech.dimensions.modelTaskAlignment.analysis}\n\n`

    markdown += `#### 2. 大模型必要性\n`
    markdown += `**状态**: ${tech.dimensions.llmNecessity.status}\n\n`
    markdown += `${tech.dimensions.llmNecessity.analysis}\n\n`
    if (tech.dimensions.llmNecessity.alternatives) {
      markdown += `**替代方案**: ${tech.dimensions.llmNecessity.alternatives}\n\n`
    }

    markdown += `#### 3. 微调必要性与数据充分性\n`
    markdown += `**微调必要**: ${tech.dimensions.fineTuning.necessary ? "是" : "否"}\n`
    markdown += `**数据充分性**: ${tech.dimensions.fineTuning.dataAdequacy}\n\n`
    markdown += `${tech.dimensions.fineTuning.analysis}\n\n`

    markdown += `#### 4. 业务可行性与实施路径\n`
    markdown += `**可行性**: ${tech.dimensions.implementationRoadmap.feasible ? "可行" : "不可行"}\n\n`
    markdown += `${tech.dimensions.implementationRoadmap.analysis}\n\n`

    if (tech.dimensions.implementationRoadmap.phases.shortTerm) {
      markdown += `**短期可落地** (1-2个月):\n`
      tech.dimensions.implementationRoadmap.phases.shortTerm.forEach((item: string) => {
        markdown += `- ${item}\n`
      })
      markdown += `\n`
    }

    if (tech.dimensions.implementationRoadmap.phases.midTerm) {
      markdown += `**中期可落地** (3-6个月):\n`
      tech.dimensions.implementationRoadmap.phases.midTerm.forEach((item: string) => {
        markdown += `- ${item}\n`
      })
      markdown += `\n`
    }

    if (tech.dimensions.implementationRoadmap.phases.notRecommended) {
      markdown += `**不建议做**:\n`
      tech.dimensions.implementationRoadmap.phases.notRecommended.forEach((item: string) => {
        markdown += `- ${item}\n`
      })
      markdown += `\n`
    }

    markdown += `#### 5. 性能需求合理性\n`
    markdown += `**合理性**: ${tech.dimensions.performanceRequirements.reasonable ? "合理" : "不合理"}\n\n`
    markdown += `${tech.dimensions.performanceRequirements.analysis}\n\n`

    markdown += `#### 6. 成本效益\n`
    markdown += `**等级**: ${tech.dimensions.costEfficiency.level}\n\n`
    markdown += `${tech.dimensions.costEfficiency.analysis}\n\n`

    if (tech.dimensions.domainConsiderations?.applicable) {
      markdown += `#### 7. 领域特殊考虑\n`
      markdown += `${tech.dimensions.domainConsiderations.analysis}\n\n`
    }

    if (tech.recommendations && tech.recommendations.length > 0) {
      markdown += `### 💡 实施建议\n\n`
      tech.recommendations.forEach((rec: string) => {
        markdown += `- ${rec}\n`
      })
      markdown += `\n`
    }
  } else {
    if (data.technicalFeasibility.issues.length > 0) {
      markdown += `### 发现的问题\n\n`
      data.technicalFeasibility.issues.forEach((issue: string) => {
        markdown += `- ${issue}\n`
      })
      markdown += `\n`
    }

    if (data.technicalFeasibility.recommendations.length > 0) {
      markdown += `### 改进建议\n\n`
      data.technicalFeasibility.recommendations.forEach((rec: string) => {
        markdown += `- ${rec}\n`
      })
      markdown += `\n`
    }
  }

  markdown += `\n---\n\n`

  // 4. 商业价值评估
  if (data.businessValue) {
    markdown += `## 💰 商业价值评估\n\n`
    markdown += `### 评分: **${data.businessValue.score}** / 100\n\n`

    if (data.businessValue.detailedEvaluation) {
      const business = data.businessValue.detailedEvaluation
      markdown += `**评估总结**:\n${business.summary}\n\n`

      markdown += `**免责声明**:\n${business.disclaimer}\n\n`

      if (business.opportunities && business.opportunities.length > 0) {
        markdown += `### 📈 商业机会\n\n`
        business.opportunities.forEach((opp: string) => {
          markdown += `- ${opp}\n`
        })
        markdown += `\n`
      }

      if (business.risks && business.risks.length > 0) {
        markdown += `### ⚠️ 潜在风险\n\n`
        business.risks.forEach((risk: string) => {
          markdown += `- ${risk}\n`
        })
        markdown += `\n`
      }

      // 各维度详细分析
      markdown += `### 详细维度分析\n\n`

      markdown += `#### 1. 问题-解决方案匹配度\n`
      markdown += `**评分**: ${business.dimensions.problemSolutionFit.score} / 100\n`
      markdown += `**状态**: ${business.dimensions.problemSolutionFit.status}\n\n`
      markdown += `${business.dimensions.problemSolutionFit.analysis}\n\n`

      if (business.dimensions.problemSolutionFit.painPoints.length > 0) {
        markdown += `**业务痛点**:\n`
        business.dimensions.problemSolutionFit.painPoints.forEach((point: string) => {
          markdown += `- ${point}\n`
        })
        markdown += `\n`
      }

      markdown += `**AI必要性**: ${business.dimensions.problemSolutionFit.aiNecessity}\n\n`

      markdown += `#### 2. ROI预期合理性\n`
      markdown += `**评分**: ${business.dimensions.roiFeasibility.score} / 100\n\n`
      markdown += `${business.dimensions.roiFeasibility.analysis}\n\n`

      if (business.dimensions.roiFeasibility.considerations.length > 0) {
        markdown += `**关键考量因素**:\n`
        business.dimensions.roiFeasibility.considerations.forEach((item: string) => {
          markdown += `- ${item}\n`
        })
        markdown += `\n`
      }

      markdown += `#### 3. 市场竞争优势\n`
      markdown += `**评分**: ${business.dimensions.competitiveAdvantage.score} / 100\n`
      markdown += `**等级**: ${business.dimensions.competitiveAdvantage.level}\n\n`
      markdown += `${business.dimensions.competitiveAdvantage.analysis}\n\n`

      if (business.dimensions.competitiveAdvantage.barriers.length > 0) {
        markdown += `**潜在竞争壁垒**:\n`
        business.dimensions.competitiveAdvantage.barriers.forEach((barrier: string) => {
          markdown += `- ${barrier}\n`
        })
        markdown += `\n`
      }

      markdown += `#### 4. 可扩展性与增长潜力\n`
      markdown += `**评分**: ${business.dimensions.scalability.score} / 100\n`
      markdown += `**等级**: ${business.dimensions.scalability.level}\n\n`
      markdown += `${business.dimensions.scalability.analysis}\n\n`

      if (business.dimensions.scalability.growthPotential.length > 0) {
        markdown += `**增长潜力**:\n`
        business.dimensions.scalability.growthPotential.forEach((potential: string) => {
          markdown += `- ${potential}\n`
        })
        markdown += `\n`
      }

      markdown += `#### 5. 落地风险评估\n`
      markdown += `**评分**: ${business.dimensions.implementationRisk.score} / 100\n`
      markdown += `**风险等级**: ${business.dimensions.implementationRisk.level}\n\n`
      markdown += `${business.dimensions.implementationRisk.analysis}\n\n`

      if (business.dimensions.implementationRisk.risks) {
        const risks = business.dimensions.implementationRisk.risks
        if (risks.technical && risks.technical.length > 0) {
          markdown += `**技术风险**:\n`
          risks.technical.forEach((risk: string) => {
            markdown += `- ${risk}\n`
          })
          markdown += `\n`
        }
        if (risks.business && risks.business.length > 0) {
          markdown += `**业务风险**:\n`
          risks.business.forEach((risk: string) => {
            markdown += `- ${risk}\n`
          })
          markdown += `\n`
        }
        if (risks.compliance && risks.compliance.length > 0) {
          markdown += `**合规风险**:\n`
          risks.compliance.forEach((risk: string) => {
            markdown += `- ${risk}\n`
          })
          markdown += `\n`
        }
        if (risks.organizational && risks.organizational.length > 0) {
          markdown += `**组织风险**:\n`
          risks.organizational.forEach((risk: string) => {
            markdown += `- ${risk}\n`
          })
          markdown += `\n`
        }
      }

      if (business.dimensions.implementationRisk.mitigations && business.dimensions.implementationRisk.mitigations.length > 0) {
        markdown += `**风险缓解措施**:\n`
        business.dimensions.implementationRisk.mitigations.forEach((mitigation: string) => {
          markdown += `- ${mitigation}\n`
        })
        markdown += `\n`
      }

      markdown += `#### 6. 时间窗口与紧迫性\n`
      markdown += `**评分**: ${business.dimensions.marketTiming.score} / 100\n`
      markdown += `**时机**: ${business.dimensions.marketTiming.status}\n`
      markdown += `**紧迫性**: ${business.dimensions.marketTiming.urgency}\n\n`
      markdown += `${business.dimensions.marketTiming.analysis}\n\n`

      if (business.recommendations && business.recommendations.length > 0) {
        markdown += `### 💡 行动建议\n\n`
        business.recommendations.forEach((rec: string) => {
          markdown += `- ${rec}\n`
        })
        markdown += `\n`
      }
    } else {
      markdown += `**分析**:\n${data.businessValue.analysis}\n\n`

      if (data.businessValue.opportunities.length > 0) {
        markdown += `### 商业机会\n\n`
        data.businessValue.opportunities.forEach((opp: string) => {
          markdown += `- ${opp}\n`
        })
        markdown += `\n`
      }

      if (data.businessValue.risks.length > 0) {
        markdown += `### 潜在风险\n\n`
        data.businessValue.risks.forEach((risk: string) => {
          markdown += `- ${risk}\n`
        })
        markdown += `\n`
      }
    }
  }

  markdown += `\n---\n\n`
  markdown += `*本报告由AI需求计算器自动生成*\n`

  return markdown
}
