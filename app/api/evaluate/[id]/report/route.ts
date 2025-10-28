import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { getPrismaClient } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { calculateResourceScore } from "@/lib/resource-calculator"
import { marked } from "marked"
import fs from "fs/promises"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = getPrismaClient();
  try {
    const { id: evaluationId } = await params

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

    // 解析JSON字符串字段
    const parsedEvaluation = {
      ...evaluation,
      resourceFeasibility: JSON.parse(evaluation.resourceFeasibility as string),
      technicalFeasibility: JSON.parse(evaluation.technicalFeasibility as string),
      businessValue: evaluation.businessValue ? JSON.parse(evaluation.businessValue as string) : null,
    }

    // 生成Markdown格式的完整报告
    const reportMarkdown = generateMarkdownReport(parsedEvaluation)

    // 生成PDF文档
    try {
      console.log("开始生成PDF报告...")

      const pdfBuffer = await generatePDFWithCloudSupport(reportMarkdown)

      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error("生成的PDF文件为空")
      }

      console.log("✅ PDF生成完成，文件大小:", pdfBuffer.length, "bytes")

      // 返回PDF文档
      const filename = `AI评估报告_${new Date().toLocaleDateString('zh-CN')}.pdf`
      const headers = new Headers()
      headers.append("Content-Type", "application/pdf")
      headers.append("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`)
      headers.append("Content-Length", pdfBuffer.length.toString())
      headers.append("Cache-Control", "no-cache, no-store, must-revalidate")

      return new Response(pdfBuffer, {
        status: 200,
        headers
      })

    } catch (pdfError) {
      console.error("PDF生成失败:", pdfError)

      // 降级方案：返回Markdown文件
      console.log("降级为Markdown文件下载")
      const markdownBuffer = Buffer.from(reportMarkdown, 'utf-8')
      const filename = `AI评估报告_${evaluation.id}_${new Date().toISOString().split('T')[0]}.md`
      const headers = new Headers()
      headers.append("Content-Type", "text/markdown; charset=utf-8")
      headers.append("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`)
      headers.append("Content-Length", markdownBuffer.length.toString())
      headers.append("Cache-Control", "no-cache, no-store, must-revalidate")

      return new Response(markdownBuffer, {
        status: 200,
        headers
      })
    }
  } catch (error) {
    console.error("生成报告失败:", error)
    return NextResponse.json(
      { success: false, error: { message: "生成报告失败" } },
      { status: 500 }
    )
  }
}

// PDF生成函数（支持云端和本地）
async function generatePDFWithCloudSupport(markdownContent: string): Promise<Buffer> {
  console.log("启动PDF生成...")

  let browser
  try {
    // 动态导入puppeteer，避免构建时问题
    const puppeteer = await import('puppeteer')

    // 判断是否在云端环境
    const isCloudEnv = process.env.AWS_REGION || process.env.VERCEL || process.env.NODE_ENV === 'production'

    if (isCloudEnv) {
      console.log("检测到云端环境，尝试安装Chrome并使用特殊配置...")

      try {
        // 在云端环境尝试安装Chrome
        await puppeteer.createBrowserFetcher().download("141.0.7390.122")
      } catch (installError) {
        console.warn("Chrome安装失败，使用默认配置:", installError)
      }

      // 云端环境配置
      browser = await puppeteer.launch({
        headless: "new",
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--enable-features=NetworkService',
          '--single-process' // 在资源受限的环境中
        ]
      })
    } else {
      console.log("检测到本地环境，使用本地Chrome...")

      // 本地环境配置
      browser = await puppeteer.launch({
        headless: "new",
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      })
    }

    console.log("浏览器启动成功")

    const page = await browser.newPage()

    // 将Markdown转换为HTML
    const htmlContent = marked.parse(markdownContent) as string

    // 构建HTML文档，使用中文字体支持
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AI评估报告</title>
  <style>
    body {
      font-family: "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 40px auto;
      font-size: 14px;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 20px;
      border-bottom: 2px solid #2E74B5;
      padding-bottom: 10px;
      color: #2E74B5;
    }
    h2 {
      font-size: 20px;
      margin-top: 30px;
      margin-bottom: 15px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 8px;
      color: #333;
    }
    h3 {
      font-size: 18px;
      margin-top: 25px;
      margin-bottom: 10px;
      color: #333;
    }
    h4 {
      font-size: 16px;
      margin-top: 20px;
      margin-bottom: 8px;
      color: #333;
    }
    p {
      margin: 15px 0;
      line-height: 1.6;
    }
    ul, ol {
      padding-left: 20px;
      margin: 15px 0;
    }
    li {
      margin: 5px 0;
      line-height: 1.5;
    }
    strong, b {
      font-weight: bold;
    }
    code {
      background: #f4f4f4;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 13px;
    }
    pre {
      background: #f4f4f4;
      padding: 15px;
      border-radius: 5px;
      overflow: auto;
      border: 1px solid #ddd;
      margin: 15px 0;
    }
    pre code {
      background: none;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #ddd;
      padding: 10px 20px;
      margin: 15px 0;
      background: #f9f9f9;
      color: #666;
    }
    hr {
      border: none;
      border-top: 1px solid #ddd;
      margin: 30px 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 20px 0;
      font-size: 13px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }
    th {
      background-color: #f4f4f4;
      font-weight: bold;
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`

    console.log("设置页面内容...")

    // 设置页面内容
    await page.setContent(fullHtml, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })

    console.log("开始生成PDF...")

    // 生成PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      printBackground: true,
      preferCSSPageSize: true,
      timeout: 60000
    })

    console.log("PDF生成完成，大小:", pdfBuffer.length, "bytes")

    return pdfBuffer

  } catch (error) {
    console.error("PDF生成过程中出错:", error)
    throw error
  } finally {
    if (browser) {
      await browser.close()
      console.log("浏览器已关闭")
    }
  }
}

function generateMarkdownReport(evaluation: any): string {
  const data = evaluation

  let markdown = `# AI需求评估完整报告\n\n`
  markdown += `**生成时间**: ${new Date(evaluation.createdAt).toLocaleString("zh-CN")}\n\n`
  markdown += `---\n\n`

  // 1. 评估总览
  markdown += `## 📊 评估总览\n\n`

  // 使用保存的硬件评分，确保历史记录显示一致性
  const resourceScore = (data as any).hardwareScore ??
    data.technicalFeasibility?.hardwareScore ??
    Math.round((
      calculateResourceScore(data.resourceFeasibility?.pretraining?.memoryUsagePercent ?? 0) +
      calculateResourceScore(data.resourceFeasibility?.fineTuning?.memoryUsagePercent ?? 0) +
      calculateResourceScore(data.resourceFeasibility?.inference?.memoryUsagePercent ?? 0)
    ) / 3) // 降级：使用简单平均分
  // 检查数据结构，兼容新旧格式
  const techData = data.technicalFeasibility?.detailedEvaluation || data.technicalFeasibility
  const technicalScore = techData?.score || 0
  const businessScore = data.businessValue?.score || 0
  const overallScore = data.businessValue
    ? Math.round((resourceScore + technicalScore + businessScore) / 3)
    : Math.round((resourceScore + technicalScore) / 2)

  markdown += `### 综合评分: **${overallScore}** / 100\n\n`
  markdown += `- 资源可行性: **${resourceScore}** / 100\n`
  markdown += `- 技术合理性: **${technicalScore}** / 100\n`
  if (data.businessValue) {
    markdown += `- 场景价值: **${businessScore}** / 100\n`
  }
  markdown += `\n---\n\n`

  // 2. 资源可行性评估
  markdown += `## 💻 资源可行性评估\n\n`
  markdown += `### 预训练\n\n`
  markdown += `- **可行性**: ${data.resourceFeasibility?.pretraining?.feasible ? "✅ 可行" : "❌ 不可行"}\n`
  markdown += `- **显存满足度**: ${data.resourceFeasibility?.pretraining?.memoryUsagePercent || 0}%\n`
  markdown += `- **显存需求**: ${data.resourceFeasibility?.pretraining?.memoryRequired || 0} GB / ${data.resourceFeasibility?.pretraining?.memoryAvailable || 0} GB\n\n`
  if (data.resourceFeasibility?.pretraining?.suggestions && data.resourceFeasibility.pretraining.suggestions.length > 0) {
    markdown += `**建议**:\n`
    data.resourceFeasibility.pretraining.suggestions.forEach((s: string) => {
      markdown += `- ${s}\n`
    })
  }
  markdown += `\n`

  markdown += `### 微调\n\n`
  markdown += `- **可行性**: ${data.resourceFeasibility?.fineTuning?.feasible ? "✅ 可行" : "❌ 不可行"}\n`
  markdown += `- **显存满足度**: ${data.resourceFeasibility?.fineTuning?.memoryUsagePercent || 0}%\n`
  markdown += `- **显存需求**: ${data.resourceFeasibility?.fineTuning?.memoryRequired || 0} GB / ${data.resourceFeasibility?.fineTuning?.memoryAvailable || 0} GB\n`
  markdown += `- **LoRA**: ${data.resourceFeasibility?.fineTuning?.loraFeasible ? "✅ 可行" : "❌ 不可行"}\n`
  markdown += `- **QLoRA**: ${data.resourceFeasibility?.fineTuning?.qloraFeasible ? "✅ 可行" : "❌ 不可行"}\n\n`
  if (data.resourceFeasibility?.fineTuning?.suggestions && data.resourceFeasibility.fineTuning.suggestions.length > 0) {
    markdown += `**建议**:\n`
    data.resourceFeasibility.fineTuning.suggestions.forEach((s: string) => {
      markdown += `- ${s}\n`
    })
  }
  markdown += `\n`

  markdown += `### 推理\n\n`
  markdown += `- **可行性**: ${data.resourceFeasibility?.inference?.feasible ? "✅ 可行" : "❌ 不可行"}\n`
  markdown += `- **显存满足度**: ${data.resourceFeasibility?.inference?.memoryUsagePercent || 0}%\n`
  markdown += `- **显存需求**: ${data.resourceFeasibility?.inference?.memoryRequired || 0} GB / ${data.resourceFeasibility?.inference?.memoryAvailable || 0} GB\n`
  markdown += `- **支持的QPS**: ${data.resourceFeasibility?.inference?.supportedQPS || 0}\n`
  markdown += `- **吞吐量**: ${data.resourceFeasibility?.inference?.supportedThroughput || 0}\n`
  markdown += `- **满足性能要求**: ${data.resourceFeasibility?.inference?.meetsRequirements ? "✅ 是" : "❌ 否"}\n\n`
  if (data.resourceFeasibility?.inference?.suggestions && data.resourceFeasibility.inference.suggestions.length > 0) {
    markdown += `**建议**:\n`
    data.resourceFeasibility.inference.suggestions.forEach((s: string) => {
      markdown += `- ${s}\n`
    })
  }
  markdown += `\n---\n\n`

  // 3. 技术方案合理性评估
  markdown += `## 🔧 技术方案合理性评估\n\n`
  markdown += `### 评分: **${techData?.score || 0}** / 100\n\n`

  if (techData && techData.summary) {
    markdown += `**评估总结**:\n${techData.summary}\n\n`

    if (techData.criticalIssues && techData.criticalIssues.length > 0) {
      markdown += `### ⚠️ 致命问题\n\n`
      techData.criticalIssues.forEach((issue: string) => {
        markdown += `- ${issue}\n`
      })
      markdown += `\n`
    }

    // 各维度详细分析
    markdown += `### 详细维度分析\n\n`

    markdown += `#### 1. 技术可行性\n`
    markdown += `**评分**: ${techData.dimensions?.technicalFeasibility?.score || 0} / 100\n\n`
    markdown += `**分析**: ${techData.dimensions?.technicalFeasibility?.analysis || '暂无分析'}\n\n`
    markdown += `**推荐技术范式**: ${techData.dimensions?.technicalFeasibility?.implementationPath?.paradigm || '未指定'}\n\n`

    if (techData.dimensions?.technicalFeasibility?.implementationPath?.shortTerm && techData.dimensions.technicalFeasibility.implementationPath.shortTerm.length > 0) {
      markdown += `**短期可落地** (1-2个月):\n`
      techData.dimensions.technicalFeasibility.implementationPath.shortTerm.forEach((item: string) => {
        markdown += `- ${item}\n`
      })
      markdown += `\n`
    }

    if (techData.dimensions?.technicalFeasibility?.implementationPath?.midTerm && techData.dimensions.technicalFeasibility.implementationPath.midTerm.length > 0) {
      markdown += `**中期可落地** (3-6个月):\n`
      techData.dimensions.technicalFeasibility.implementationPath.midTerm.forEach((item: string) => {
        markdown += `- ${item}\n`
      })
      markdown += `\n`
    }

    markdown += `#### 2. 大模型必要性\n`
    markdown += `**评分**: ${techData.dimensions?.llmNecessity?.score || 0} / 100\n\n`
    markdown += `**分析**: ${techData.dimensions?.llmNecessity?.analysis || '暂无分析'}\n\n`
    if (techData.dimensions?.llmNecessity?.alternatives) {
      markdown += `**替代方案**: ${techData.dimensions.llmNecessity.alternatives}\n\n`
    }

    markdown += `#### 3. 模型适配度\n`
    markdown += `**评分**: ${techData.dimensions?.modelFit?.score || 0} / 100\n\n`
    markdown += `**分析**: ${techData.dimensions?.modelFit?.analysis || '暂无分析'}\n\n`

    markdown += `#### 4. 数据质量与充足性\n`
    markdown += `**评分**: ${techData.dimensions?.dataAdequacy?.score || 0} / 100\n\n`
    markdown += `**分析**: ${techData.dimensions?.dataAdequacy?.analysis || '暂无分析'}\n\n`
    markdown += `**数据质量评估**: ${techData.dimensions?.dataAdequacy?.qualityAssessment || '未评估'}\n\n`
    markdown += `**数据数量评估**: ${techData.dimensions?.dataAdequacy?.quantityAssessment || '未评估'}\n\n`

    markdown += `#### 5. 硬件与性能匹配度\n`
    markdown += `**评分**: ${techData.dimensions?.hardwarePerformanceFit?.score || 0} / 100\n\n`
    markdown += `**分析**: ${techData.dimensions?.hardwarePerformanceFit?.analysis || '暂无分析'}\n\n`

    if (techData.dimensions?.hardwarePerformanceFit?.recommendations && techData.dimensions.hardwarePerformanceFit.recommendations.length > 0) {
      markdown += `**硬件建议**:\n`
      techData.dimensions.hardwarePerformanceFit.recommendations.forEach((rec: string) => {
        markdown += `- ${rec}\n`
      })
      markdown += `\n`
    }

    markdown += `#### 6. 实施风险\n`
    markdown += `**评分**: ${techData.dimensions?.implementationRisk?.score || 0} / 100\n\n`
    markdown += `**分析**: ${techData.dimensions?.implementationRisk?.analysis || '暂无分析'}\n\n`

    if (techData.dimensions?.implementationRisk?.riskItems && techData.dimensions.implementationRisk.riskItems.length > 0) {
      markdown += `**具体风险点**:\n`
      techData.dimensions.implementationRisk.riskItems.forEach((risk: string) => {
        markdown += `- ${risk}\n`
      })
      markdown += `\n`
    }

    if (techData.recommendations && techData.recommendations.length > 0) {
      markdown += `### 💡 总体建议\n\n`
      techData.recommendations.forEach((rec: string) => {
        markdown += `- ${rec}\n`
      })
      markdown += `\n`
    }
  } else {
    // 兼容旧数据格式
    if (data.technicalFeasibility?.issues && data.technicalFeasibility.issues.length > 0) {
      markdown += `### 发现的问题\n\n`
      data.technicalFeasibility.issues.forEach((issue: string) => {
        markdown += `- ${issue}\n`
      })
      markdown += `\n`
    }

    if (data.technicalFeasibility?.recommendations && data.technicalFeasibility.recommendations.length > 0) {
      markdown += `### 改进建议\n\n`
      data.technicalFeasibility.recommendations.forEach((rec: string) => {
        markdown += `- ${rec}\n`
      })
      markdown += `\n`
    }
  }

  markdown += `\n---\n\n`

  // 4. 场景价值评估
  if (data.businessValue) {
    markdown += `## 💰 场景价值评估\n\n`
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
      markdown += `**评分**: ${business.dimensions?.problemSolutionFit?.score || 0} / 100\n`
      markdown += `**状态**: ${business.dimensions?.problemSolutionFit?.status || '未评估'}\n\n`
      markdown += `${business.dimensions?.problemSolutionFit?.analysis || '暂无分析'}\n\n`

      if (business.dimensions?.problemSolutionFit?.painPoints && business.dimensions.problemSolutionFit.painPoints.length > 0) {
        markdown += `**业务痛点**:\n`
        business.dimensions.problemSolutionFit.painPoints.forEach((point: string) => {
          markdown += `- ${point}\n`
        })
        markdown += `\n`
      }

      markdown += `**AI必要性**: ${business.dimensions?.problemSolutionFit?.aiNecessity || '未评估'}\n\n`

      markdown += `#### 2. ROI预期合理性\n`
      markdown += `**评分**: ${business.dimensions?.roiFeasibility?.score || 0} / 100\n\n`
      markdown += `${business.dimensions?.roiFeasibility?.analysis || '暂无分析'}\n\n`

      if (business.dimensions?.roiFeasibility?.considerations && business.dimensions.roiFeasibility.considerations.length > 0) {
        markdown += `**关键考量因素**:\n`
        business.dimensions.roiFeasibility.considerations.forEach((item: string) => {
          markdown += `- ${item}\n`
        })
        markdown += `\n`
      }

      markdown += `#### 3. 市场竞争优势\n`
      markdown += `**评分**: ${business.dimensions?.competitiveAdvantage?.score || 0} / 100\n`
      markdown += `**等级**: ${business.dimensions?.competitiveAdvantage?.level || '未评估'}\n\n`
      markdown += `${business.dimensions?.competitiveAdvantage?.analysis || '暂无分析'}\n\n`

      if (business.dimensions?.competitiveAdvantage?.barriers && business.dimensions.competitiveAdvantage.barriers.length > 0) {
        markdown += `**潜在竞争壁垒**:\n`
        business.dimensions.competitiveAdvantage.barriers.forEach((barrier: string) => {
          markdown += `- ${barrier}\n`
        })
        markdown += `\n`
      }

      markdown += `#### 4. 可扩展性与增长潜力\n`
      markdown += `**评分**: ${business.dimensions?.scalability?.score || 0} / 100\n`
      markdown += `**等级**: ${business.dimensions?.scalability?.level || '未评估'}\n\n`
      markdown += `${business.dimensions?.scalability?.analysis || '暂无分析'}\n\n`

      if (business.dimensions?.scalability?.growthPotential && business.dimensions.scalability.growthPotential.length > 0) {
        markdown += `**增长潜力**:\n`
        business.dimensions.scalability.growthPotential.forEach((potential: string) => {
          markdown += `- ${potential}\n`
        })
        markdown += `\n`
      }

      markdown += `#### 5. 落地风险评估\n`
      markdown += `**评分**: ${business.dimensions?.implementationRisk?.score || 0} / 100\n`
      markdown += `**风险等级**: ${business.dimensions?.implementationRisk?.level || '未评估'}\n\n`
      markdown += `${business.dimensions?.implementationRisk?.analysis || '暂无分析'}\n\n`

      if (business.dimensions?.implementationRisk?.risks) {
        const risks = business.dimensions.implementationRisk.risks
        if (risks?.technical && risks.technical.length > 0) {
          markdown += `**技术风险**:\n`
          risks.technical.forEach((risk: string) => {
            markdown += `- ${risk}\n`
          })
          markdown += `\n`
        }
        if (risks?.business && risks.business.length > 0) {
          markdown += `**业务风险**:\n`
          risks.business.forEach((risk: string) => {
            markdown += `- ${risk}\n`
          })
          markdown += `\n`
        }
        if (risks?.compliance && risks.compliance.length > 0) {
          markdown += `**合规风险**:\n`
          risks.compliance.forEach((risk: string) => {
            markdown += `- ${risk}\n`
          })
          markdown += `\n`
        }
        if (risks?.organizational && risks.organizational.length > 0) {
          markdown += `**组织风险**:\n`
          risks.organizational.forEach((risk: string) => {
            markdown += `- ${risk}\n`
          })
          markdown += `\n`
        }
      }

      if (business.dimensions?.implementationRisk?.mitigations && business.dimensions.implementationRisk.mitigations.length > 0) {
        markdown += `**风险缓解措施**:\n`
        business.dimensions.implementationRisk.mitigations.forEach((mitigation: string) => {
          markdown += `- ${mitigation}\n`
        })
        markdown += `\n`
      }

      markdown += `#### 6. 时间窗口与紧迫性\n`
      markdown += `**评分**: ${business.dimensions?.marketTiming?.score || 0} / 100\n`
      markdown += `**时机**: ${business.dimensions?.marketTiming?.status || '未评估'}\n`
      markdown += `**紧迫性**: ${business.dimensions?.marketTiming?.urgency || '未评估'}\n\n`
      markdown += `${business.dimensions?.marketTiming?.analysis || '暂无分析'}\n\n`

      if (business.recommendations && business.recommendations.length > 0) {
        markdown += `### 💡 行动建议\n\n`
        business.recommendations.forEach((rec: string) => {
          markdown += `- ${rec}\n`
        })
        markdown += `\n`
      }
    } else {
      markdown += `**分析**:\n${data.businessValue?.analysis || '暂无分析'}\n\n`

      if (data.businessValue?.opportunities && data.businessValue.opportunities.length > 0) {
        markdown += `### 商业机会\n\n`
        data.businessValue.opportunities.forEach((opp: string) => {
          markdown += `- ${opp}\n`
        })
        markdown += `\n`
      }

      if (data.businessValue?.risks && data.businessValue.risks.length > 0) {
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
