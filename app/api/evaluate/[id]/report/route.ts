import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { getPrismaClient } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { calculateResourceScore } from "@/lib/resource-calculator"
import puppeteer from "puppeteer"
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

    // 使用Puppeteer直接生成PDF
    try {
      console.log("开始生成PDF报告...")

      // 将Markdown转换为HTML
      const htmlContent = marked.parse(reportMarkdown) as string
      console.log("Markdown转HTML完成，内容长度:", htmlContent.length)

      // 读取CSS样式
      const cssPath = path.join(process.cwd(), "styles", "markdown.css")
      let cssContent = ""
      try {
        cssContent = await fs.readFile(cssPath, "utf-8")
        console.log("CSS文件读取成功")
      } catch (e) {
        console.warn("无法读取CSS文件，使用默认样式")
      }

      // 构建完整的HTML文档，添加UTF-8元标签确保中文正确显示
      const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3, h4 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    h4 { font-size: 1em; }
    ul, ol { padding-left: 2em; }
    li { margin: 0.25em 0; }
    code {
      background: #f6f8fa;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 85%;
    }
    pre {
      background: #f6f8fa;
      padding: 16px;
      border-radius: 6px;
      overflow: auto;
    }
    pre code {
      background: transparent;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #dfe2e5;
      padding-left: 16px;
      color: #6a737d;
      margin: 0;
    }
    hr {
      border: 0;
      border-top: 1px solid #eaecef;
      margin: 24px 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
    }
    ${cssContent}
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>
      `
      console.log("HTML文档构建完成")

      // 检查Puppeteer是否可用
      try {
        const puppeteer = require('puppeteer')
        console.log("Puppeteer模块加载成功")
      } catch (moduleError) {
        console.error("Puppeteer模块加载失败:", moduleError)
        throw new Error("Puppeteer模块不可用")
      }

      // 启动Puppeteer并生成PDF，增加更多兼容性参数
      console.log("正在启动Puppeteer浏览器...")
      const browser = await puppeteer.launch({
        headless: "new", // 使用新的headless模式
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', // 避免内存问题
          '--disable-gpu', // 禁用GPU加速
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-default-apps',
          '--disable-translate',
          '--disable-device-discovery-notifications',
          '--disable-web-security', // 有时需要禁用网络安全
          '--disable-features=VizDisplayCompositor' // 禁用某些可能导致问题的特性
        ],
        timeout: 30000 // 30秒启动超时
      })

      console.log("Puppeteer浏览器启动成功")

      const page = await browser.newPage()

      // 设置用户代理和视口
      await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
      await page.setViewport({ width: 1200, height: 800 })

      console.log("正在设置页面内容...")
      await page.setContent(fullHtml, {
        waitUntil: 'networkidle0',
        timeout: 30000 // 30秒超时
      })

      console.log("页面内容设置完成，正在生成PDF...")

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
        timeout: 60000 // 60秒PDF生成超时
      })

      await browser.close()
      console.log("PDF生成完成，文件大小:", pdfBuffer.length, "bytes")

      // 验证PDF Buffer是否有效
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error("生成的PDF文件为空")
      }

      // 检查PDF文件头（PDF是二进制格式，使用ASCII编码检查）
      const pdfHeader = Buffer.from(pdfBuffer.slice(0, 5))
      const expectedHeader = Buffer.from([37, 80, 68, 70, 45]) // %PDF-

      console.log("PDF文件头字节:", Array.from(pdfHeader).map(b => b.toString(16).padStart(2, '0')).join(' '))
      console.log("期望文件头字节:", Array.from(expectedHeader).map(b => b.toString(16).padStart(2, '0')).join(' '))

      if (pdfHeader.length !== 5 || !pdfHeader.equals(expectedHeader)) {
        console.log("文件头不匹配")
        console.log("PDF buffer前20字节:", Array.from(pdfBuffer.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' '))
        throw new Error("生成的文件不是有效的PDF格式")
      }

      console.log("✅ PDF文件头验证通过")

      // 返回PDF
      const filename = `AI评估报告_${new Date().toLocaleDateString('zh-CN')}.pdf`
      const headers = new Headers()
      headers.append("Content-Type", "application/pdf")
      headers.append("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`)
      headers.append("Content-Length", pdfBuffer.length.toString())
      headers.append("Cache-Control", "no-cache, no-store, must-revalidate")
      headers.append("Pragma", "no-cache")
      headers.append("Expires", "0")

      console.log("PDF响应头设置完成，准备返回")
      return new Response(pdfBuffer, {
        status: 200,
        headers
      })

    } catch (pdfError) {
      console.error("PDF生成失败:", pdfError)

      // 更详细的错误日志
      if (pdfError instanceof Error) {
        console.error("PDF错误详情:", {
          name: pdfError.name,
          message: pdfError.message,
          stack: pdfError.stack
        })
      }

      // 检查是否是Puppeteer特有的错误
      if (pdfError.message.includes('Puppeteer') ||
          pdfError.message.includes('browser') ||
          pdfError.message.includes('launch')) {
        console.error("这是Puppeteer浏览器启动相关错误")
        console.error("可能的解决方案:")
        console.error("1. 检查系统环境是否支持Puppeteer")
        console.error("2. 检查是否有足够的权限")
        console.error("3. 检查内存是否充足")
      }

      // 降级方案：返回Markdown文件，但明确说明原因
      console.log("由于PDF生成失败，降级为Markdown文件下载")
      console.log("失败原因:", pdfError.message)

      // 确保Markdown内容是有效的UTF-8
      const markdownBuffer = Buffer.from(reportMarkdown, 'utf-8')
      const filename = `ai-evaluation-report-${evaluation.id}-${new Date().toISOString().split('T')[0]}.md`
      const headers = new Headers()
      headers.append("Content-Type", "text/markdown; charset=utf-8")
      headers.append("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`)
      headers.append("Content-Length", markdownBuffer.length.toString())
      headers.append("Cache-Control", "no-cache, no-store, must-revalidate")
      // 使用Base64编码错误信息，避免HTTP header编码问题
      headers.append("X-PDF-Error", Buffer.from(pdfError.message, 'utf-8').toString('base64'))

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

function generateMarkdownReport(evaluation: any): string {
  const data = evaluation

  let markdown = `# AI需求评估完整报告\n\n`
  markdown += `**生成时间**: ${new Date(evaluation.createdAt).toLocaleString("zh-CN")}\n\n`
  markdown += `---\n\n`

  // 1. 评估总览
  markdown += `## 📊 评估总览\n\n`

  // 使用技术评估时保存的硬件评分，如果不存在则降级到简单平均分计算
  const resourceScore = data.technicalFeasibility?.hardwareScore ??
    (data as any).hardwareScore ??
    Math.round((
      calculateResourceScore(data.resourceFeasibility?.pretraining?.memoryUsagePercent ?? 0) +
      calculateResourceScore(data.resourceFeasibility?.fineTuning?.memoryUsagePercent ?? 0) +
      calculateResourceScore(data.resourceFeasibility?.inference?.memoryUsagePercent ?? 0)
    ) / 3) // 降级：使用简单平均分
  // 检查数据结构，兼容新旧格式
  const techData = data.technicalFeasibility.detailedEvaluation || data.technicalFeasibility
  const technicalScore = techData.score
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
  markdown += `### 评分: **${techData.score}** / 100\n\n`

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
    markdown += `**评分**: ${techData.dimensions.technicalFeasibility.score} / 100\n\n`
    markdown += `**分析**: ${techData.dimensions.technicalFeasibility.analysis}\n\n`
    markdown += `**推荐技术范式**: ${techData.dimensions.technicalFeasibility.implementationPath.paradigm}\n\n`

    if (techData.dimensions.technicalFeasibility.implementationPath.shortTerm && techData.dimensions.technicalFeasibility.implementationPath.shortTerm.length > 0) {
      markdown += `**短期可落地** (1-2个月):\n`
      techData.dimensions.technicalFeasibility.implementationPath.shortTerm.forEach((item: string) => {
        markdown += `- ${item}\n`
      })
      markdown += `\n`
    }

    if (techData.dimensions.technicalFeasibility.implementationPath.midTerm && techData.dimensions.technicalFeasibility.implementationPath.midTerm.length > 0) {
      markdown += `**中期可落地** (3-6个月):\n`
      techData.dimensions.technicalFeasibility.implementationPath.midTerm.forEach((item: string) => {
        markdown += `- ${item}\n`
      })
      markdown += `\n`
    }

    markdown += `#### 2. 大模型必要性\n`
    markdown += `**评分**: ${techData.dimensions.llmNecessity.score} / 100\n\n`
    markdown += `**分析**: ${techData.dimensions.llmNecessity.analysis}\n\n`
    if (techData.dimensions.llmNecessity.alternatives) {
      markdown += `**替代方案**: ${techData.dimensions.llmNecessity.alternatives}\n\n`
    }

    markdown += `#### 3. 模型适配度\n`
    markdown += `**评分**: ${techData.dimensions.modelFit.score} / 100\n\n`
    markdown += `**分析**: ${techData.dimensions.modelFit.analysis}\n\n`

    markdown += `#### 4. 数据质量与充足性\n`
    markdown += `**评分**: ${techData.dimensions.dataAdequacy.score} / 100\n\n`
    markdown += `**分析**: ${techData.dimensions.dataAdequacy.analysis}\n\n`
    markdown += `**数据质量评估**: ${techData.dimensions.dataAdequacy.qualityAssessment}\n\n`
    markdown += `**数据数量评估**: ${techData.dimensions.dataAdequacy.quantityAssessment}\n\n`

    markdown += `#### 5. 硬件与性能匹配度\n`
    markdown += `**评分**: ${techData.dimensions.hardwarePerformanceFit.score} / 100\n\n`
    markdown += `**分析**: ${techData.dimensions.hardwarePerformanceFit.analysis}\n\n`

    if (techData.dimensions.hardwarePerformanceFit.recommendations && techData.dimensions.hardwarePerformanceFit.recommendations.length > 0) {
      markdown += `**硬件建议**:\n`
      techData.dimensions.hardwarePerformanceFit.recommendations.forEach((rec: string) => {
        markdown += `- ${rec}\n`
      })
      markdown += `\n`
    }

    markdown += `#### 6. 实施风险\n`
    markdown += `**评分**: ${techData.dimensions.implementationRisk.score} / 100\n\n`
    markdown += `**分析**: ${techData.dimensions.implementationRisk.analysis}\n\n`

    if (techData.dimensions.implementationRisk.riskItems && techData.dimensions.implementationRisk.riskItems.length > 0) {
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
    if (data.technicalFeasibility.issues && data.technicalFeasibility.issues.length > 0) {
      markdown += `### 发现的问题\n\n`
      data.technicalFeasibility.issues.forEach((issue: string) => {
        markdown += `- ${issue}\n`
      })
      markdown += `\n`
    }

    if (data.technicalFeasibility.recommendations && data.technicalFeasibility.recommendations.length > 0) {
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
