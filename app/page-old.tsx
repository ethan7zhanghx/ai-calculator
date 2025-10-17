"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Calculator, CheckCircle2, AlertTriangle, XCircle, Info, LogIn, UserPlus, MessageSquare } from "lucide-react"

type EvaluationResult = {
  hardwareCompatibility: {
    status: "pass" | "warning" | "fail"
    message: string
    details: string[]
  }
  fineTuningFeasibility: {
    status: "pass" | "warning" | "fail"
    message: string
    details: string[]
  }
  technicalAppropriateness: {
    status: "pass" | "warning" | "fail"
    message: string
    details: string[]
    alternatives?: string[]
  }
  businessValueAlignment: {
    status: "pass" | "warning" | "fail"
    message: string
    details: string[]
  }
}

export default function AIRequirementsCalculator() {
  const [model, setModel] = useState("")
  const [hardware, setHardware] = useState("")
  const [quantity, setQuantity] = useState("")
  const [dataVolume, setDataVolume] = useState("")
  const [dataCharacteristics, setDataCharacteristics] = useState("")
  const [scenario, setScenario] = useState("")
  const [businessValue, setBusinessValue] = useState("")
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null)

  const evaluateRequirements = () => {
    const result: EvaluationResult = {
      hardwareCompatibility: evaluateHardware(model, hardware, quantity),
      fineTuningFeasibility: evaluateFineTuning(model, dataVolume, dataCharacteristics),
      technicalAppropriateness: evaluateTechnicalFit(model, scenario, dataCharacteristics),
      businessValueAlignment: evaluateBusinessValue(model, scenario, businessValue, hardware, quantity),
    }

    setEvaluation(result)
  }

  const evaluateHardware = (
    model: string,
    hardware: string,
    quantity: string,
  ): EvaluationResult["hardwareCompatibility"] => {
    const qty = Number.parseInt(quantity) || 0

    const modelRequirements: Record<string, { vram: number; minGPUs: number }> = {
      "GPT-4": { vram: 80, minGPUs: 8 },
      "GPT-3.5": { vram: 40, minGPUs: 2 },
      "Claude 3 Opus": { vram: 80, minGPUs: 8 },
      "Claude 3 Sonnet": { vram: 40, minGPUs: 2 },
      "Llama 3 70B": { vram: 80, minGPUs: 4 },
      "Llama 3 8B": { vram: 16, minGPUs: 1 },
      "Mistral Large": { vram: 80, minGPUs: 4 },
      "Mistral 7B": { vram: 14, minGPUs: 1 },
    }

    const hardwareSpecs: Record<string, { vram: number }> = {
      "NVIDIA A100 (80GB)": { vram: 80 },
      "NVIDIA A100 (40GB)": { vram: 40 },
      "NVIDIA H100": { vram: 80 },
      "NVIDIA V100": { vram: 32 },
      "NVIDIA RTX 4090": { vram: 24 },
      "NVIDIA RTX 3090": { vram: 24 },
    }

    const modelReq = modelRequirements[model]
    const hwSpec = hardwareSpecs[hardware]

    if (!modelReq || !hwSpec) {
      return {
        status: "warning",
        message: "无法完全评估硬件兼容性",
        details: ["请确保所有字段都已填写有效选项"],
      }
    }

    const totalVRAM = hwSpec.vram * qty
    const requiredVRAM = modelReq.vram

    if (qty >= modelReq.minGPUs && totalVRAM >= requiredVRAM) {
      return {
        status: "pass",
        message: "硬件配置兼容",
        details: [
          `总显存：${totalVRAM}GB（需求：约${requiredVRAM}GB）`,
          `GPU数量：${qty}（最低要求：${modelReq.minGPUs}）`,
          "配置支持模型推理和训练",
          qty > modelReq.minGPUs * 2 ? "充足的余量可支持批处理和并行操作" : "足以满足标准操作需求",
        ],
      }
    } else if (qty >= modelReq.minGPUs && totalVRAM >= requiredVRAM * 0.7) {
      return {
        status: "warning",
        message: "硬件配置勉强满足要求",
        details: [
          `总显存：${totalVRAM}GB（建议：约${requiredVRAM}GB）`,
          `GPU数量：${qty}（最低要求：${modelReq.minGPUs}）`,
          "可能需要量化（INT8/INT4）才能高效运行",
          "批处理容量有限 - 预计吞吐量较慢",
          "建议升级到更高显存的GPU或增加数量",
        ],
      }
    } else {
      return {
        status: "fail",
        message: "硬件配置不足",
        details: [
          `总显存：${totalVRAM}GB（需求：约${requiredVRAM}GB）- 缺口：${requiredVRAM - totalVRAM}GB`,
          `GPU数量：${qty}（最低要求：${modelReq.minGPUs}）`,
          qty < modelReq.minGPUs ? `至少需要增加${modelReq.minGPUs - qty}个GPU` : "需要升级到更高显存的GPU",
          "当前配置无法支持此模型",
          "建议：考虑使用更小的模型变体或升级硬件",
        ],
      }
    }
  }

  const evaluateFineTuning = (
    model: string,
    dataVolume: string,
    dataCharacteristics: string,
  ): EvaluationResult["fineTuningFeasibility"] => {
    const volume = Number.parseInt(dataVolume) || 0
    const dataLower = dataCharacteristics.toLowerCase()

    const modelCategories: Record<string, { minSamples: number; optimalSamples: number; category: string }> = {
      "GPT-4": { minSamples: 50, optimalSamples: 500, category: "large" },
      "GPT-3.5": { minSamples: 50, optimalSamples: 500, category: "large" },
      "Claude 3 Opus": { minSamples: 50, optimalSamples: 500, category: "large" },
      "Claude 3 Sonnet": { minSamples: 50, optimalSamples: 500, category: "large" },
      "Llama 3 70B": { minSamples: 100, optimalSamples: 1000, category: "large" },
      "Llama 3 8B": { minSamples: 100, optimalSamples: 1000, category: "medium" },
      "Mistral Large": { minSamples: 100, optimalSamples: 1000, category: "large" },
      "Mistral 7B": { minSamples: 100, optimalSamples: 1000, category: "medium" },
    }

    const modelInfo = modelCategories[model]

    if (!modelInfo) {
      return {
        status: "warning",
        message: "无法评估微调可行性",
        details: ["请选择有效的模型"],
      }
    }

    const hasQualityData =
      dataLower.includes("标注") ||
      dataLower.includes("标记") ||
      dataLower.includes("精选") ||
      dataLower.includes("labeled") ||
      dataLower.includes("annotated") ||
      dataLower.includes("curated")
    const hasDiverseData =
      dataLower.includes("多样") ||
      dataLower.includes("丰富") ||
      dataLower.includes("代表性") ||
      dataLower.includes("diverse") ||
      dataLower.includes("varied") ||
      dataLower.includes("representative")

    if (volume >= modelInfo.optimalSamples && hasQualityData) {
      return {
        status: "pass",
        message: "微调高度可行",
        details: [
          `数据量（${volume.toLocaleString()}样本）超过最佳阈值（${modelInfo.optimalSamples.toLocaleString()}）`,
          "数据充足，可进行稳健的模型适配",
          hasQualityData ? "数据质量指标表明数据集准备充分" : "",
          hasDiverseData ? "数据多样性将提高模型泛化能力" : "建议确保数据多样性以提高泛化能力",
          "推荐方法：全量微调或使用LoRA提高效率",
          "预期结果：在特定领域任务上显著提升性能",
        ].filter(Boolean),
      }
    } else if (volume >= modelInfo.minSamples) {
      return {
        status: "warning",
        message: "微调可行但需注意",
        details: [
          `数据量（${volume.toLocaleString()}样本）达到最低要求但低于最佳值（${modelInfo.optimalSamples.toLocaleString()}）`,
          volume < modelInfo.optimalSamples * 0.5
            ? "数据有限可能导致过拟合 - 需密切监控验证指标"
            : "中等数据量 - 预期可获得合理结果",
          !hasQualityData ? "未说明数据质量 - 请确保正确标注和清洗" : "数据质量看起来足够",
          "推荐方法：参数高效微调（LoRA、QLoRA）以降低过拟合风险",
          "考虑使用数据增强技术扩充训练集",
          "实施稳健的验证策略，使用留出测试集",
        ],
      }
    } else {
      return {
        status: "fail",
        message: "数据不足，无法有效微调",
        details: [
          `数据量（${volume.toLocaleString()}样本）低于最低阈值（${modelInfo.minSamples}）`,
          `至少还需要${modelInfo.minSamples - volume}个样本才能进行可行的微调`,
          "过拟合和泛化能力差的风险很高",
          "可考虑的替代方案：",
          "  • 使用少样本提示和上下文学习",
          "  • 检索增强生成（RAG）方法",
          "  • 在继续之前收集更多高质量训练数据",
          "  • 使用预训练模型配合提示工程",
        ],
      }
    }
  }

  const evaluateTechnicalFit = (
    model: string,
    scenario: string,
    dataCharacteristics: string,
  ): EvaluationResult["technicalAppropriateness"] => {
    const scenarioLower = scenario.toLowerCase()
    const dataLower = dataCharacteristics.toLowerCase()

    const isOCRTask =
      scenarioLower.includes("ocr") ||
      scenarioLower.includes("文字识别") ||
      scenarioLower.includes("文本提取") ||
      scenarioLower.includes("文档扫描") ||
      scenarioLower.includes("text extraction") ||
      scenarioLower.includes("document scanning")
    const isSimpleClassification =
      (scenarioLower.includes("分类") || scenarioLower.includes("classification")) &&
      (scenarioLower.includes("简单") ||
        scenarioLower.includes("二分类") ||
        scenarioLower.includes("simple") ||
        scenarioLower.includes("binary"))
    const isStructuredData =
      dataLower.includes("结构化") ||
      dataLower.includes("表格") ||
      dataLower.includes("structured") ||
      dataLower.includes("tabular") ||
      dataLower.includes("csv")
    const isComplexNLP =
      scenarioLower.includes("推理") ||
      scenarioLower.includes("复杂") ||
      scenarioLower.includes("多步骤") ||
      scenarioLower.includes("reasoning") ||
      scenarioLower.includes("complex") ||
      scenarioLower.includes("multi-step")
    const isConversational =
      scenarioLower.includes("聊天") ||
      scenarioLower.includes("对话") ||
      scenarioLower.includes("会话") ||
      scenarioLower.includes("chat") ||
      scenarioLower.includes("conversation") ||
      scenarioLower.includes("dialogue")
    const isGenerative =
      scenarioLower.includes("生成") ||
      scenarioLower.includes("创作") ||
      scenarioLower.includes("写作") ||
      scenarioLower.includes("generation") ||
      scenarioLower.includes("creative") ||
      scenarioLower.includes("writing")
    const isAnalytical =
      scenarioLower.includes("分析") ||
      scenarioLower.includes("洞察") ||
      scenarioLower.includes("摘要") ||
      scenarioLower.includes("analysis") ||
      scenarioLower.includes("insight") ||
      scenarioLower.includes("summarization")

    const isLargeModel =
      model.includes("GPT-4") || model.includes("Claude 3 Opus") || model.includes("70B") || model.includes("Large")

    if (isOCRTask && isLargeModel) {
      return {
        status: "warning",
        message: "大语言模型对此任务可能过度设计",
        details: [
          "OCR任务更适合使用专门的计算机视觉模型",
          "大语言模型增加了不必要的复杂性和成本",
          "建议：使用专用OCR解决方案以获得更好的准确性和效率",
        ],
        alternatives: [
          "Tesseract OCR（开源，高精度）",
          "Google Cloud Vision API",
          "AWS Textract",
          "Azure Computer Vision OCR",
          "PaddleOCR（支持多语言）",
        ],
      }
    }

    if (isSimpleClassification && isLargeModel) {
      return {
        status: "warning",
        message: "简单分类任务可能过度设计",
        details: [
          "简单分类任务通常不需要大语言模型",
          "传统机器学习模型（SVM、随机森林、XGBoost）通常性能更好且成本更低",
          "建议首先考虑更小的模型或经典机器学习方法",
        ],
        alternatives: [
          "Scikit-learn分类器（逻辑回归、SVM、随机森林）",
          "XGBoost或LightGBM（适用于结构化数据）",
          "小型BERT模型（DistilBERT、TinyBERT用于文本分类）",
          "FastText（高效文本分类）",
        ],
      }
    }

    if (isStructuredData && model.includes("GPT")) {
      return {
        status: "warning",
        message: "大语言模型不适合处理结构化/表格数据",
        details: [
          "结构化数据分析更适合使用专门的机器学习框架",
          "大语言模型缺乏处理表格数据模式所需的归纳偏置",
          "传统机器学习模型提供更好的可解释性和性能",
        ],
        alternatives: [
          "XGBoost或LightGBM（梯度提升）",
          "TabNet架构的神经网络",
          "AutoML平台（H2O.ai、AutoGluon）",
          "经典统计模型（提供可解释性）",
        ],
      }
    }

    if ((isComplexNLP || isConversational || isGenerative || isAnalytical) && isLargeModel) {
      return {
        status: "pass",
        message: "技术方案非常适合应用场景",
        details: [
          "大语言模型擅长复杂推理和自然语言任务",
          isConversational ? "对话式AI受益于大模型能力" : "",
          isGenerative ? "生成任务充分利用模型的创造能力" : "",
          isAnalytical ? "分析任务受益于模型的理解能力" : "",
          "模型规模适合任务复杂度",
          "通过适当的微调预期可提供高质量结果",
        ].filter(Boolean),
      }
    }

    if ((isComplexNLP || isConversational) && !isLargeModel) {
      return {
        status: "warning",
        message: "模型可能不足以应对复杂需求",
        details: [
          "复杂推理任务通常受益于更大的模型容量",
          "较小的模型可能难以进行细微理解",
          "如果质量不足，考虑升级到更大的模型变体",
          "替代方案：使用较小模型配合RAG（检索增强生成）增强知识",
        ],
      }
    }

    return {
      status: "pass",
      message: "技术方案对场景来说合理",
      details: [
        "模型选择与一般用例需求一致",
        "确保进行充分测试以验证性能预期",
        "在实施过程中监控成本与性能比",
        "考虑从较小模型开始，如有需要再扩展",
      ],
    }
  }

  const evaluateBusinessValue = (
    model: string,
    scenario: string,
    businessValue: string,
    hardware: string,
    quantity: string,
  ): EvaluationResult["businessValueAlignment"] => {
    const valueLower = businessValue.toLowerCase()
    const qty = Number.parseInt(quantity) || 0

    const revenueMatch = valueLower.match(/[¥$]?([\d,]+)(?:万|k|m)?/i)
    const percentMatch = valueLower.match(/(\d+)%/)

    const hasQuantifiedValue =
      revenueMatch ||
      percentMatch ||
      valueLower.includes("成本节约") ||
      valueLower.includes("效率") ||
      valueLower.includes("cost savings") ||
      valueLower.includes("efficiency")
    const hasStrategicValue =
      valueLower.includes("竞争") ||
      valueLower.includes("战略") ||
      valueLower.includes("创新") ||
      valueLower.includes("competitive") ||
      valueLower.includes("strategic") ||
      valueLower.includes("innovation")

    const hardwareCosts: Record<string, number> = {
      "NVIDIA A100 (80GB)": 100000,
      "NVIDIA A100 (40GB)": 70000,
      "NVIDIA H100": 200000,
      "NVIDIA V100": 55000,
      "NVIDIA RTX 4090": 15000,
      "NVIDIA RTX 3090": 10000,
    }

    const unitCost = hardwareCosts[hardware] || 70000
    const totalHardwareCost = unitCost * qty
    const annualOperatingCost = totalHardwareCost * 0.3 // 粗略估算：硬件成本的30%作为年度运营成本
    const developmentCost = 1000000 // AI项目粗略估算

    const totalFirstYearCost = totalHardwareCost + annualOperatingCost + developmentCost

    if (!hasQuantifiedValue && !hasStrategicValue) {
      return {
        status: "fail",
        message: "商业价值未充分定义",
        details: [
          "没有明确量化预期的商业影响",
          "预计第一年投资：¥" + totalFirstYearCost.toLocaleString(),
          "没有定义价值指标，无法评估投资回报率",
          "要求：具体、可衡量的业务成果",
          "建议：",
          "  • 定义具体的KPI（收入增长、成本降低、时间节省）",
          "  • 用现实的预测量化预期影响",
          "  • 建立用于比较的基线指标",
          "  • 创建明确的成功标准和衡量框架",
        ],
      }
    }

    if (hasQuantifiedValue) {
      const estimatedValue = revenueMatch
        ? Number.parseInt(revenueMatch[1].replace(/,/g, "")) *
          (valueLower.includes("m") ? 1000000 : valueLower.includes("万") ? 10000 : valueLower.includes("k") ? 1000 : 1)
        : 0

      if (estimatedValue > totalFirstYearCost * 3) {
        return {
          status: "pass",
          message: "商业价值预测强劲且合理",
          details: [
            `预估价值：¥${estimatedValue.toLocaleString()}`,
            `预计第一年成本：¥${totalFirstYearCost.toLocaleString()}`,
            `预计投资回报率：${((estimatedValue / totalFirstYearCost - 1) * 100).toFixed(0)}%`,
            "价值显著超过投资 - 商业案例强劲",
            hasStrategicValue ? "额外的战略价值进一步增强了案例" : "",
            "建议：继续进行详细的实施规划",
            "确保与利益相关者验证价值假设",
          ].filter(Boolean),
        }
      } else if (estimatedValue > totalFirstYearCost) {
        return {
          status: "warning",
          message: "商业价值为正但较为温和",
          details: [
            `预估价值：¥${estimatedValue.toLocaleString()}`,
            `预计第一年成本：¥${totalFirstYearCost.toLocaleString()}`,
            `预计投资回报率：${((estimatedValue / totalFirstYearCost - 1) * 100).toFixed(0)}%`,
            "价值超过成本但利润率相对较薄",
            "考虑是否存在其他未衡量的收益",
            "建议：验证假设并探索成本优化",
            "寻找增加价值获取或降低实施成本的机会",
          ],
        }
      } else {
        return {
          status: "fail",
          message: "商业价值不足以证明投资合理",
          details: [
            `预估价值：¥${estimatedValue.toLocaleString()}`,
            `预计第一年成本：¥${totalFirstYearCost.toLocaleString()}`,
            `预计投资回报率：${((estimatedValue / totalFirstYearCost - 1) * 100).toFixed(0)}%（负值）`,
            "投资超过预计回报 - 商业案例不佳",
            "建议：",
            "  • 重新评估价值假设 - 是否存在隐藏收益？",
            "  • 考虑更具成本效益的技术方法",
            "  • 探索基于云的解决方案以降低前期成本",
            "  • 分阶段实施以在全面投资前验证价值",
          ],
        }
      }
    }

    return {
      status: "warning",
      message: "商业价值具有战略性但缺乏量化",
      details: [
        "已识别战略价值但未量化",
        `预计第一年成本：¥${totalFirstYearCost.toLocaleString()}`,
        "战略举措需要可衡量的成功标准",
        "建议：",
        "  • 为战略价值定义代理指标（市场份额、客户满意度等）",
        "  • 建立价值实现时间表",
        "  • 创建衡量无形收益的框架",
        "  • 确保高管层对价值预期达成一致",
      ],
    }
  }

  const getStatusIcon = (status: "pass" | "warning" | "fail") => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-600" />
      case "fail":
        return <XCircle className="h-5 w-5 text-red-600" />
    }
  }

  const getStatusBadge = (status: "pass" | "warning" | "fail") => {
    const variants = {
      pass: "default",
      warning: "secondary",
      fail: "destructive",
    } as const

    const labels = {
      pass: "通过",
      warning: "需要审查",
      fail: "不推荐",
    }

    return <Badge variant={variants[status]}>{labels[status]}</Badge>
  }

  const isFormComplete = model && hardware && quantity && dataVolume && dataCharacteristics && scenario && businessValue

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calculator className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold">AI需求计算器</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm">
                <MessageSquare className="mr-2 h-4 w-4" />
                反馈
              </Button>
              <Button variant="ghost" size="sm">
                <LogIn className="mr-2 h-4 w-4" />
                登录
              </Button>
              <Button size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                注册
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Calculator className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-balance">企业级AI需求计算器</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-pretty">
            通过全面分析评估您的AI解决方案的技术可行性和商业可行性
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                解决方案需求
              </CardTitle>
              <CardDescription>提供有关您提议的AI解决方案的详细信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="model">AI模型选择</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger id="model">
                    <SelectValue placeholder="选择AI模型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GPT-4">GPT-4</SelectItem>
                    <SelectItem value="GPT-3.5">GPT-3.5</SelectItem>
                    <SelectItem value="Claude 3 Opus">Claude 3 Opus</SelectItem>
                    <SelectItem value="Claude 3 Sonnet">Claude 3 Sonnet</SelectItem>
                    <SelectItem value="Llama 3 70B">Llama 3 70B</SelectItem>
                    <SelectItem value="Llama 3 8B">Llama 3 8B</SelectItem>
                    <SelectItem value="Mistral Large">Mistral Large</SelectItem>
                    <SelectItem value="Mistral 7B">Mistral 7B</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hardware">硬件类型</Label>
                  <Select value={hardware} onValueChange={setHardware}>
                    <SelectTrigger id="hardware">
                      <SelectValue placeholder="选择硬件" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NVIDIA A100 (80GB)">NVIDIA A100 (80GB)</SelectItem>
                      <SelectItem value="NVIDIA A100 (40GB)">NVIDIA A100 (40GB)</SelectItem>
                      <SelectItem value="NVIDIA H100">NVIDIA H100</SelectItem>
                      <SelectItem value="NVIDIA V100">NVIDIA V100</SelectItem>
                      <SelectItem value="NVIDIA RTX 4090">NVIDIA RTX 4090</SelectItem>
                      <SelectItem value="NVIDIA RTX 3090">NVIDIA RTX 3090</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">数量</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    placeholder="单位数量"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataVolume">数据量（样本数）</Label>
                <Input
                  id="dataVolume"
                  type="number"
                  placeholder="例如：10000"
                  value={dataVolume}
                  onChange={(e) => setDataVolume(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataCharacteristics">数据特征</Label>
                <Textarea
                  id="dataCharacteristics"
                  placeholder="描述您的数据：类型、质量、多样性、标注状态等"
                  rows={4}
                  value={dataCharacteristics}
                  onChange={(e) => setDataCharacteristics(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scenario">应用场景</Label>
                <Textarea
                  id="scenario"
                  placeholder="描述用例：您要解决什么问题，AI将执行什么任务？"
                  rows={4}
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessValue">预估商业价值</Label>
                <Textarea
                  id="businessValue"
                  placeholder="量化预期收益：收入增长、成本节约、效率提升、战略价值等"
                  rows={4}
                  value={businessValue}
                  onChange={(e) => setBusinessValue(e.target.value)}
                />
              </div>

              <Button onClick={evaluateRequirements} className="w-full" size="lg" disabled={!isFormComplete}>
                <Calculator className="mr-2 h-4 w-4" />
                评估需求
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {!evaluation ? (
              <Card className="shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Calculator className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">准备评估</h3>
                  <p className="text-muted-foreground max-w-md text-pretty">
                    完成左侧表单并点击"评估需求"以获得AI解决方案的全面分析
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(evaluation.hardwareCompatibility.status)}
                        <CardTitle className="text-lg">硬件资源</CardTitle>
                      </div>
                      {getStatusBadge(evaluation.hardwareCompatibility.status)}
                    </div>
                    <CardDescription className="font-medium text-foreground">
                      {evaluation.hardwareCompatibility.message}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {evaluation.hardwareCompatibility.details.map((detail, idx) => (
                        <li key={idx} className="flex gap-2 text-sm">
                          <span className="text-muted-foreground mt-1">•</span>
                          <span className="text-pretty">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(evaluation.fineTuningFeasibility.status)}
                        <CardTitle className="text-lg">微调可行性</CardTitle>
                      </div>
                      {getStatusBadge(evaluation.fineTuningFeasibility.status)}
                    </div>
                    <CardDescription className="font-medium text-foreground">
                      {evaluation.fineTuningFeasibility.message}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {evaluation.fineTuningFeasibility.details.map((detail, idx) => (
                        <li key={idx} className="flex gap-2 text-sm">
                          <span className="text-muted-foreground mt-1">•</span>
                          <span className="text-pretty">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(evaluation.technicalAppropriateness.status)}
                        <CardTitle className="text-lg">技术适当性</CardTitle>
                      </div>
                      {getStatusBadge(evaluation.technicalAppropriateness.status)}
                    </div>
                    <CardDescription className="font-medium text-foreground">
                      {evaluation.technicalAppropriateness.message}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {evaluation.technicalAppropriateness.details.map((detail, idx) => (
                        <li key={idx} className="flex gap-2 text-sm">
                          <span className="text-muted-foreground mt-1">•</span>
                          <span className="text-pretty">{detail}</span>
                        </li>
                      ))}
                    </ul>
                    {evaluation.technicalAppropriateness.alternatives && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold text-sm mb-2">推荐的替代方案：</h4>
                          <ul className="space-y-1">
                            {evaluation.technicalAppropriateness.alternatives.map((alt, idx) => (
                              <li key={idx} className="flex gap-2 text-sm">
                                <span className="text-primary mt-1">→</span>
                                <span>{alt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(evaluation.businessValueAlignment.status)}
                        <CardTitle className="text-lg">商业价值一致性</CardTitle>
                      </div>
                      {getStatusBadge(evaluation.businessValueAlignment.status)}
                    </div>
                    <CardDescription className="font-medium text-foreground">
                      {evaluation.businessValueAlignment.message}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {evaluation.businessValueAlignment.details.map((detail, idx) => (
                        <li key={idx} className="flex gap-2 text-sm">
                          <span className="text-muted-foreground mt-1">•</span>
                          <span className="text-pretty">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>下一步：</strong>
                    仔细审查每个评估部分。在继续之前解决标记为"不推荐"的项目。对于"需要审查"的项目，请考虑建议并与利益相关者验证假设。
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
