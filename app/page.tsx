"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Calculator,
  Info,
  LogIn,
  UserPlus,
  ThumbsUp,
  ThumbsDown,
  User,
  LogOut,
  Loader2,
} from "lucide-react"
import { AuthDialog } from "@/components/auth-dialog"
import { FeedbackButton } from "@/components/feedback-button"
import { ResourceCard } from "@/components/resource-card"
import { EvaluationDashboard } from "@/components/evaluation-dashboard"
import { BusinessValueChart } from "@/components/business-value-chart"
import { TechnicalEvaluationDetailed } from "@/components/technical-evaluation-detailed"
import { EvaluationProgress } from "@/components/evaluation-progress"
import { BusinessEvaluationDetailed } from "@/components/business-evaluation-detailed"
import { MultiSelect, type Option } from "@/components/multi-select"
import { InputSummary } from "@/components/input-summary"
import { useToast } from "@/hooks/use-toast"
import type {
  DataType,
  DataQuality,
  EvaluationResponse,
  ModuleType,
  FeedbackType,
} from "@/lib/types"

export default function AIRequirementsCalculator() {
  const { toast } = useToast()

  // 用户认证状态
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState("")
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [authDialogTab, setAuthDialogTab] = useState<"login" | "register">("login")

  // 表单状态
  const [model, setModel] = useState("")
  const [hardware, setHardware] = useState("")
  const [cardCount, setCardCount] = useState("")
  const [dataVolume, setDataVolume] = useState("")
  const [dataTypes, setDataTypes] = useState<DataType[]>([])
  const [dataQuality, setDataQuality] = useState<DataQuality>("high")
  const [businessScenario, setBusinessScenario] = useState("")
  const [qps, setQps] = useState("")
  const [concurrency, setConcurrency] = useState("")

  // 评估结果
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)

  // 待评估标记 - 用于登录后自动评估
  const [pendingEvaluation, setPendingEvaluation] = useState(false)

  // 反馈状态跟踪 - 记录每个模块的反馈状态
  const [moduleFeedbacks, setModuleFeedbacks] = useState<Record<ModuleType, FeedbackType | null>>({
    resource: null,
    technical: null,
    business: null,
  })

  // 检查登录状态
  useEffect(() => {
    const token = localStorage.getItem("token")
    const savedUsername = localStorage.getItem("username")
    if (token && savedUsername) {
      setIsAuthenticated(true)
      setUsername(savedUsername)
    }
  }, [])

  const handleAuthSuccess = (userData: { username: string; token: string }) => {
    setIsAuthenticated(true)
    setUsername(userData.username)
    // 登录成功后,如果有待评估的请求,自动执行评估
    if (pendingEvaluation) {
      setPendingEvaluation(false)
      // 延迟一下,等待状态更新
      setTimeout(() => {
        performEvaluation(userData.token)
      }, 300)
    }
  }

  const handleLogout = async () => {
    const token = localStorage.getItem("token")
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch (error) {
        // 忽略错误,继续登出
      }
    }

    localStorage.removeItem("token")
    localStorage.removeItem("username")
    setIsAuthenticated(false)
    setUsername("")
    setEvaluation(null) // 登出时清除评估结果
    setModuleFeedbacks({ resource: null, technical: null, business: null }) // 清除反馈状态
    toast({ title: "已登出" })
  }

  // 核心评估函数 - 实际调用API
  const performEvaluation = async (token?: string) => {
    setIsEvaluating(true)

    try {
      const authToken = token || localStorage.getItem("token")
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`
      }

      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          hardware,
          cardCount: parseInt(cardCount),
          businessData: {
            volume: parseInt(dataVolume),
            dataTypes,
            quality: dataQuality,
          },
          businessScenario,
          performanceRequirements: {
            qps: parseInt(qps),
            concurrency: parseInt(concurrency),
          },
        }),
      })

      const data = await response.json()

      if (data.success) {
        setEvaluation(data.data)
        setModuleFeedbacks({ resource: null, technical: null, business: null }) // 重置反馈状态
        toast({
          title: "评估完成",
          description: "AI分析报告已生成"
        })
        // 自动滚动到结果
        setTimeout(() => {
          document.getElementById("evaluation-results")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }, 100)
      } else {
        toast({
          title: "评估失败",
          description: data.error?.message || "请稍后重试",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "评估失败",
        description: "网络错误,请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsEvaluating(false)
    }
  }

  const handleEvaluate = async () => {
    if (!model || !hardware || !cardCount || !dataVolume || !businessScenario || !qps || !concurrency) {
      toast({
        title: "请填写完整信息",
        description: "所有字段均为必填项",
        variant: "destructive",
      })
      return
    }

    if (dataTypes.length === 0) {
      toast({
        title: "请选择数据类型",
        description: "至少选择一种数据类型",
        variant: "destructive",
      })
      return
    }

    // 检查是否已登录
    if (!isAuthenticated) {
      // 未登录,标记为待评估并打开登录对话框
      setPendingEvaluation(true)
      setAuthDialogTab("login")
      setAuthDialogOpen(true)
      toast({
        title: "请先登录",
        description: "登录后即可查看AI评估报告,您填写的信息已保留",
        variant: "default",
      })
      return
    }

    // 已登录,直接评估
    await performEvaluation()
  }

  const handleModuleFeedback = async (moduleType: ModuleType, feedbackType: FeedbackType) => {
    if (!evaluation) return

    // 如果点击的是已经选中的反馈,则取消选择
    if (moduleFeedbacks[moduleType] === feedbackType) {
      setModuleFeedbacks(prev => ({ ...prev, [moduleType]: null }))
      return
    }

    // 更新UI状态
    setModuleFeedbacks(prev => ({ ...prev, [moduleType]: feedbackType }))

    try {
      const token = localStorage.getItem("token")
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const response = await fetch("/api/feedback/module", {
        method: "POST",
        headers,
        body: JSON.stringify({
          evaluationId: evaluation.evaluationId,
          moduleType,
          feedbackType,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: feedbackType === "like" ? "感谢您的点赞" : "感谢您的反馈",
          description: "您的意见对我们很重要",
        })
      } else {
        // 如果保存失败,恢复UI状态
        setModuleFeedbacks(prev => ({ ...prev, [moduleType]: null }))
        toast({
          title: "反馈失败",
          description: data.error?.message || "请稍后重试",
          variant: "destructive",
        })
      }
    } catch (error) {
      // 如果出错,恢复UI状态
      setModuleFeedbacks(prev => ({ ...prev, [moduleType]: null }))
      toast({
        title: "反馈失败",
        description: "网络错误,请稍后重试",
        variant: "destructive",
      })
    }
  }

  const toggleDataType = (type: DataType) => {
    setDataTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const isFormComplete = model && hardware && cardCount && dataVolume && dataTypes.length > 0 && businessScenario && qps && concurrency

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calculator className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold">AI需求计算器</span>
            </div>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-muted">
                    <User className="h-4 w-4" />
                    <span className="text-sm">{username}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    登出
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAuthDialogTab("login")
                      setAuthDialogOpen(true)
                    }}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    登录
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setAuthDialogTab("register")
                      setAuthDialogOpen(true)
                    }}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    注册
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Calculator className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">企业级AI需求计算器</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            全面评估您的AI解决方案的资源可行性、技术合理性和商业价值
          </p>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6">
          {/* 输入表单或输入摘要 - 左侧固定列 */}
          <div>
            {!evaluation ? (
              <Card className="shadow-lg lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    需求信息
                  </CardTitle>
                  <CardDescription>请填写您的AI项目需求</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                {/* 模型选择 */}
                <div className="space-y-2">
                  <Label htmlFor="model">模型选择</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger id="model" className="w-full">
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

                {/* 硬件配置 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hardware">硬件型号</Label>
                    <Select value={hardware} onValueChange={setHardware}>
                      <SelectTrigger id="hardware" className="w-full">
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
                    <Label htmlFor="cardCount">卡数</Label>
                    <Input
                      id="cardCount"
                      type="number"
                      min="1"
                      placeholder="GPU数量"
                      value={cardCount}
                      onChange={(e) => setCardCount(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* 业务数据 */}
                <div className="space-y-2">
                  <Label htmlFor="dataVolume">业务数据量</Label>
                  <Input
                    id="dataVolume"
                    type="number"
                    placeholder="数据条数"
                    value={dataVolume}
                    onChange={(e) => setDataVolume(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* 数据类型和数据治理 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>数据类型</Label>
                    <MultiSelect
                      options={[
                        { value: "text", label: "文本" },
                        { value: "image", label: "图片" },
                        { value: "qa_pair", label: "QA Pair" },
                        { value: "video", label: "视频" },
                        { value: "audio", label: "音频" },
                      ]}
                      selected={dataTypes}
                      onChange={setDataTypes}
                      placeholder="选择数据类型"
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dataQuality">数据治理</Label>
                    <Select value={dataQuality} onValueChange={(v) => setDataQuality(v as DataQuality)}>
                      <SelectTrigger id="dataQuality" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">是</SelectItem>
                        <SelectItem value="low">否</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 业务场景 */}
                <div className="space-y-2">
                  <Label htmlFor="businessScenario">业务场景</Label>
                  <Textarea
                    id="businessScenario"
                    placeholder="描述您想要做的业务场景..."
                    rows={4}
                    value={businessScenario}
                    onChange={(e) => setBusinessScenario(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* 性能要求 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="qps">期望QPS</Label>
                    <Input
                      id="qps"
                      type="number"
                      min="1"
                      placeholder="每秒查询数"
                      value={qps}
                      onChange={(e) => setQps(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="concurrency">用户并发数</Label>
                    <Input
                      id="concurrency"
                      type="number"
                      min="1"
                      placeholder="并发用户"
                      value={concurrency}
                      onChange={(e) => setConcurrency(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleEvaluate}
                  className="w-full"
                  size="lg"
                  disabled={!isFormComplete || isEvaluating}
                >
                  {isEvaluating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      评估中...
                    </>
                  ) : (
                    <>
                      <Calculator className="mr-2 h-4 w-4" />
                      开始评估
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
            ) : (
              <InputSummary
                model={model}
                hardware={hardware}
                cardCount={cardCount}
                dataVolume={dataVolume}
                dataTypes={dataTypes}
                dataQuality={dataQuality}
                qps={qps}
                concurrency={concurrency}
                onEdit={() => setEvaluation(null)}
              />
            )}
          </div>

          {/* 评估结果 */}
          <div className="space-y-6" id="evaluation-results">
            {isEvaluating ? (
              /* 评估中 - 显示进度 */
              <EvaluationProgress />
            ) : !evaluation ? (
              /* 等待评估 */
              <Card className="shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Calculator className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    {isAuthenticated ? "等待评估" : "AI评估报告"}
                  </h3>
                  <p className="text-muted-foreground max-w-md">
                    {isAuthenticated
                      ? '完成左侧表单并点击"开始评估"以获取详细分析'
                      : "请填写左侧表单,登录后即可获取AI智能分析报告"}
                  </p>
                  {!isAuthenticated && (
                    <div className="mt-6 flex gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAuthDialogTab("login")
                          setAuthDialogOpen(true)
                        }}
                      >
                        <LogIn className="mr-2 h-4 w-4" />
                        登录查看报告
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setAuthDialogTab("register")
                          setAuthDialogOpen(true)
                        }}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        注册账号
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* 评估结果 */
              <>
                {/* 评估总览仪表盘 */}
                <EvaluationDashboard evaluation={evaluation} />

                {/* 资源可行性评估 - 使用增强卡片 */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle>资源可行性评估</CardTitle>
                    <CardDescription>硬件资源是否能够支持模型的各项任务</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ResourceCard
                      title="预训练"
                      feasible={evaluation.resourceFeasibility.pretraining.feasible}
                      memoryUsagePercent={evaluation.resourceFeasibility.pretraining.memoryUsagePercent}
                      memoryRequired={evaluation.resourceFeasibility.pretraining.memoryRequired}
                      memoryAvailable={evaluation.resourceFeasibility.pretraining.memoryAvailable}
                      suggestions={evaluation.resourceFeasibility.pretraining.suggestions}
                    />

                    <ResourceCard
                      title="微调"
                      feasible={evaluation.resourceFeasibility.fineTuning.feasible}
                      memoryUsagePercent={evaluation.resourceFeasibility.fineTuning.memoryUsagePercent}
                      memoryRequired={evaluation.resourceFeasibility.fineTuning.memoryRequired}
                      memoryAvailable={evaluation.resourceFeasibility.fineTuning.memoryAvailable}
                      suggestions={evaluation.resourceFeasibility.fineTuning.suggestions}
                      extraInfo={
                        <div className="flex gap-2">
                          <span className="text-xs text-muted-foreground">
                            LoRA: {evaluation.resourceFeasibility.fineTuning.loraFeasible ? "✓ 可行" : "✗ 不可行"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            QLoRA: {evaluation.resourceFeasibility.fineTuning.qloraFeasible ? "✓ 可行" : "✗ 不可行"}
                          </span>
                        </div>
                      }
                    />

                    <ResourceCard
                      title="推理"
                      feasible={evaluation.resourceFeasibility.inference.feasible}
                      memoryUsagePercent={evaluation.resourceFeasibility.inference.memoryUsagePercent}
                      memoryRequired={evaluation.resourceFeasibility.inference.memoryRequired}
                      memoryAvailable={evaluation.resourceFeasibility.inference.memoryAvailable}
                      suggestions={evaluation.resourceFeasibility.inference.suggestions}
                      extraInfo={
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-3 rounded bg-primary/10">
                              <div className="text-xl font-bold text-primary">
                                {evaluation.resourceFeasibility.inference.supportedQPS}
                              </div>
                              <div className="text-xs text-muted-foreground">支持的QPS</div>
                            </div>
                            <div className="text-center p-3 rounded bg-primary/10">
                              <div className="text-xl font-bold text-primary">
                                {evaluation.resourceFeasibility.inference.supportedThroughput}
                              </div>
                              <div className="text-xs text-muted-foreground">吞吐量</div>
                            </div>
                          </div>

                          {/* 量化选项 */}
                          {!evaluation.resourceFeasibility.inference.meetsRequirements && (
                            <div>
                              <h5 className="text-xs font-semibold mb-2">量化建议:</h5>
                              <div className="space-y-1">
                                {evaluation.resourceFeasibility.inference.quantizationOptions.map((opt, i) => (
                                  <div key={i} className="flex items-center justify-between p-2 rounded text-xs bg-background">
                                    <span className="font-medium">{opt.type}</span>
                                    <span className={opt.meetsRequirements ? "text-green-600" : "text-amber-600"}>
                                      QPS: {Math.round(opt.supportedQPS)} {opt.meetsRequirements ? "✓" : "✗"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      }
                    />
                  </CardContent>
                  <CardContent className="pt-0">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant={moduleFeedbacks.resource === "like" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleModuleFeedback("resource", "like")}
                        className={moduleFeedbacks.resource === "like" ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={moduleFeedbacks.resource === "dislike" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleModuleFeedback("resource", "dislike")}
                        className={moduleFeedbacks.resource === "dislike" ? "bg-red-600 hover:bg-red-700" : ""}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* 技术方案合理性评估 */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>技术方案合理性评估</span>
                      {/* 评分显示 */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">评分:</span>
                        <div className="bg-primary text-primary-foreground rounded-lg px-3 py-1">
                          <span className="text-lg font-bold">{evaluation.technicalFeasibility.score}</span>
                          <span className="text-sm">/100</span>
                        </div>
                      </div>
                    </CardTitle>
                    <CardDescription>AI深度评估技术选型是否合理</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* 评分条 */}
                    <div className="relative py-4 mb-6">
                      <div className="flex h-3 rounded-full overflow-hidden">
                        <div className="flex-1 bg-red-500 opacity-30" />
                        <div className="flex-1 bg-amber-500 opacity-30" />
                        <div className="flex-1 bg-blue-500 opacity-30" />
                        <div className="flex-1 bg-green-500 opacity-30" />
                      </div>
                      <div
                        className="absolute top-0 transition-all duration-500"
                        style={{
                          left: `${evaluation.technicalFeasibility.score}%`,
                          transform: "translateX(-50%)",
                        }}
                      >
                        <div className="w-0.5 h-3 bg-primary" />
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full" />
                      </div>
                    </div>

                    {/* 详细评估内容 */}
                    {evaluation.technicalFeasibility.detailedEvaluation ? (
                      <TechnicalEvaluationDetailed evaluation={evaluation.technicalFeasibility.detailedEvaluation} />
                    ) : (
                      /* 降级展示：如果没有详细评估数据，显示简化版 */
                      <div className="space-y-4">
                        {evaluation.technicalFeasibility.issues.length > 0 && (
                          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                            <h4 className="font-semibold text-sm mb-2 text-amber-600 dark:text-amber-400">发现的问题:</h4>
                            <ul className="space-y-2">
                              {evaluation.technicalFeasibility.issues.map((issue, i) => (
                                <li key={i} className="text-sm flex gap-2">
                                  <span className="text-amber-600 dark:text-amber-400">•</span>
                                  <span>{issue}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {evaluation.technicalFeasibility.recommendations.length > 0 && (
                          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                            <h4 className="font-semibold text-sm mb-2 text-blue-600 dark:text-blue-400">改进建议:</h4>
                            <ul className="space-y-2">
                              {evaluation.technicalFeasibility.recommendations.map((rec, i) => (
                                <li key={i} className="text-sm flex gap-2">
                                  <span className="text-blue-600 dark:text-blue-400">→</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                  <CardContent className="pt-0">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant={moduleFeedbacks.technical === "like" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleModuleFeedback("technical", "like")}
                        className={moduleFeedbacks.technical === "like" ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={moduleFeedbacks.technical === "dislike" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleModuleFeedback("technical", "dislike")}
                        className={moduleFeedbacks.technical === "dislike" ? "bg-red-600 hover:bg-red-700" : ""}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* 商业价值评估 */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>商业价值评估</span>
                      {/* 评分显示 */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">评分:</span>
                        <div className="bg-primary text-primary-foreground rounded-lg px-3 py-1">
                          <span className="text-lg font-bold">{evaluation.businessValue.score}</span>
                          <span className="text-sm">/100</span>
                        </div>
                      </div>
                    </CardTitle>
                    <CardDescription>AI深度评估该方案的商业价值</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* 评分条 */}
                    <div className="relative py-4 mb-6">
                      <div className="flex h-3 rounded-full overflow-hidden">
                        <div className="flex-1 bg-red-500 opacity-30" />
                        <div className="flex-1 bg-amber-500 opacity-30" />
                        <div className="flex-1 bg-blue-500 opacity-30" />
                        <div className="flex-1 bg-green-500 opacity-30" />
                      </div>
                      <div
                        className="absolute top-0 transition-all duration-500"
                        style={{
                          left: `${evaluation.businessValue.score}%`,
                          transform: "translateX(-50%)",
                        }}
                      >
                        <div className="w-0.5 h-3 bg-primary" />
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full" />
                      </div>
                    </div>

                    {/* 详细评估内容 */}
                    {evaluation.businessValue.detailedEvaluation ? (
                      <BusinessEvaluationDetailed evaluation={evaluation.businessValue.detailedEvaluation} />
                    ) : (
                      /* 降级展示：如果没有详细评估数据，显示简化版 */
                      <div className="space-y-4">
                        <BusinessValueChart
                          score={evaluation.businessValue.score}
                          risks={evaluation.businessValue.risks}
                          opportunities={evaluation.businessValue.opportunities}
                        />

                        <Separator />

                        <div>
                          <h4 className="font-semibold text-sm mb-3">详细分析:</h4>
                          <p className="text-sm whitespace-pre-line leading-relaxed text-muted-foreground">
                            {evaluation.businessValue.analysis}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardContent className="pt-0">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant={moduleFeedbacks.business === "like" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleModuleFeedback("business", "like")}
                        className={moduleFeedbacks.business === "like" ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={moduleFeedbacks.business === "dislike" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleModuleFeedback("business", "dislike")}
                        className={moduleFeedbacks.business === "dislike" ? "bg-red-600 hover:bg-red-700" : ""}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 认证对话框 */}
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        defaultTab={authDialogTab}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* 浮动反馈按钮 */}
      <FeedbackButton />
    </div>
  )
}
