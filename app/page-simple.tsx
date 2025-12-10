"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
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
import { CircularProgress } from "@/components/circular-progress"
import { useToast } from "@/hooks/use-toast"
import type {
  DataType,
  DataQuality,
  EvaluationResponse,
  ModuleType,
  FeedbackType,
} from "@/lib/types"
import { MODEL_KNOWLEDGE } from "@/lib/model-knowledge-base"
import { HARDWARE_OPTIONS } from "@/lib/resource-calculator"

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
  const [dataQuality, setDataQuality] = useState<DataQuality>("medium")
  const [businessScenario, setBusinessScenario] = useState("")
  const [qps, setQps] = useState("")
  const [concurrency, setConcurrency] = useState("")

  // 评估结果
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)

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
    toast({ title: "已登出" })
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

    setIsEvaluating(true)

    try {
      const token = localStorage.getItem("token")
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
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
        toast({ title: "评估完成" })
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

  const handleModuleFeedback = async (moduleType: ModuleType, feedbackType: FeedbackType) => {
    if (!evaluation) return

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
      }
    } catch (error) {
      // 静默失败
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

        <div className="grid lg:grid-cols-2 gap-6">
          {/* 输入表单 */}
          <Card className="shadow-lg">
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
                  <SelectTrigger id="model">
                    <SelectValue placeholder="选择AI模型" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(MODEL_KNOWLEDGE).map((modelName) => (
                      <SelectItem key={modelName} value={modelName}>
                        {modelName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 硬件配置 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hardware">硬件型号</Label>
                  <Select value={hardware} onValueChange={setHardware}>
                  <SelectTrigger id="hardware">
                    <SelectValue placeholder="选择硬件" />
                  </SelectTrigger>
                  <SelectContent>
                    {HARDWARE_OPTIONS.map((hw) => (
                      <SelectItem key={hw} value={hw}>
                        {hw}
                      </SelectItem>
                    ))}
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
                />
              </div>

              {/* 数据类型 */}
              <div className="space-y-3">
                <Label>数据类型</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "text" as const, label: "文本" },
                    { value: "image" as const, label: "图片" },
                    { value: "qa_pair" as const, label: "QA Pair" },
                    { value: "video" as const, label: "视频" },
                    { value: "audio" as const, label: "音频" },
                  ].map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={type.value}
                        checked={dataTypes.includes(type.value)}
                        onCheckedChange={() => toggleDataType(type.value)}
                      />
                      <Label htmlFor={type.value} className="cursor-pointer">
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* 数据质量 */}
              <div className="space-y-2">
                <Label htmlFor="dataQuality">数据质量评价</Label>
                <Select value={dataQuality} onValueChange={(v) => setDataQuality(v as DataQuality)}>
                  <SelectTrigger id="dataQuality">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">高质量</SelectItem>
                    <SelectItem value="medium">中等质量</SelectItem>
                    <SelectItem value="low">低质量</SelectItem>
                  </SelectContent>
                </Select>
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

          {/* 评估结果 */}
          <div className="space-y-6">
            {!evaluation ? (
              <Card className="shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Calculator className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">等待评估</h3>
                  <p className="text-muted-foreground max-w-md">
                    完成左侧表单并点击"开始评估"以获取详细分析
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* 资源可行性评估 */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle>资源可行性评估</CardTitle>
                    <CardDescription>硬件资源是否能够支持模型的各项任务</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* 预训练 */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">预训练</h4>
                        <Badge variant={evaluation.resourceFeasibility.pretraining.feasible ? "default" : "destructive"}>
                          {evaluation.resourceFeasibility.pretraining.feasible ? "可行" : "不可行"}
                        </Badge>
                      </div>
                      <CircularProgress
                        percentage={evaluation.resourceFeasibility.pretraining.memoryUsagePercent}
                        label="显存满足度"
                      />
                      <ul className="mt-4 space-y-2">
                        {evaluation.resourceFeasibility.pretraining.suggestions.map((s, i) => (
                          <li key={i} className="text-sm flex gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Separator />

                    {/* 微调 */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">微调</h4>
                        <Badge variant={evaluation.resourceFeasibility.fineTuning.feasible ? "default" : "destructive"}>
                          {evaluation.resourceFeasibility.fineTuning.feasible ? "可行" : "不可行"}
                        </Badge>
                      </div>
                      <CircularProgress
                        percentage={evaluation.resourceFeasibility.fineTuning.memoryUsagePercent}
                        label="显存满足度"
                      />
                      <ul className="mt-4 space-y-2">
                        {evaluation.resourceFeasibility.fineTuning.suggestions.map((s, i) => (
                          <li key={i} className="text-sm flex gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Separator />

                    {/* 推理 */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">推理</h4>
                        <Badge variant={evaluation.resourceFeasibility.inference.meetsRequirements ? "default" : "destructive"}>
                          {evaluation.resourceFeasibility.inference.meetsRequirements ? "满足需求" : "不满足"}
                        </Badge>
                      </div>
                      <CircularProgress
                        percentage={evaluation.resourceFeasibility.inference.memoryUsagePercent}
                        label="显存满足度"
                      />
                      <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-primary">
                            {evaluation.resourceFeasibility.inference.supportedQPS}
                          </div>
                          <div className="text-sm text-muted-foreground">支持的QPS</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-primary">
                            {evaluation.resourceFeasibility.inference.supportedThroughput}
                          </div>
                          <div className="text-sm text-muted-foreground">吞吐量</div>
                        </div>
                      </div>

                      {/* 量化选项 */}
                      {!evaluation.resourceFeasibility.inference.meetsRequirements && (
                        <div className="mt-4">
                          <h5 className="font-semibold text-sm mb-2">量化建议:</h5>
                          <div className="space-y-2">
                            {evaluation.resourceFeasibility.inference.quantizationOptions.map((opt, i) => (
                              <div key={i} className="flex items-center justify-between p-2 rounded bg-muted">
                                <span className="text-sm font-medium">{opt.type}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm">QPS: {Math.round(opt.supportedQPS)}</span>
                                  <Badge variant={opt.meetsRequirements ? "default" : "secondary"} className="text-xs">
                                    {opt.meetsRequirements ? "满足" : "不满足"}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <ul className="mt-4 space-y-2">
                        {evaluation.resourceFeasibility.inference.suggestions.map((s, i) => (
                          <li key={i} className="text-sm flex gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                  <CardContent className="pt-0">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleModuleFeedback("resource", "like")}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleModuleFeedback("resource", "dislike")}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* 技术方案合理性评估 */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle>技术方案合理性评估</CardTitle>
                    <CardDescription>评估技术选型是否合理</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">综合评分</span>
                      <span className="text-3xl font-bold text-primary">
                        {evaluation.technicalFeasibility.score}
                      </span>
                    </div>

                    {evaluation.technicalFeasibility.issues.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-amber-600">发现的问题:</h4>
                        <ul className="space-y-2">
                          {evaluation.technicalFeasibility.issues.map((issue, i) => (
                            <li key={i} className="text-sm flex gap-2">
                              <span className="text-amber-600">⚠</span>
                              <span>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {evaluation.technicalFeasibility.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-blue-600">建议:</h4>
                        <ul className="space-y-2">
                          {evaluation.technicalFeasibility.recommendations.map((rec, i) => (
                            <li key={i} className="text-sm flex gap-2">
                              <span className="text-blue-600">→</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                  <CardContent className="pt-0">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleModuleFeedback("technical", "like")}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleModuleFeedback("technical", "dislike")}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* 商业价值评估 */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle>商业价值评估</CardTitle>
                    <CardDescription>AI评估该业务的价值</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">价值评分</span>
                      <span className="text-3xl font-bold text-primary">
                        {evaluation.businessValue.score}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm mb-2">分析:</h4>
                      <p className="text-sm whitespace-pre-line">{evaluation.businessValue.analysis}</p>
                    </div>

                    {evaluation.businessValue.risks.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-red-600">风险:</h4>
                        <ul className="space-y-2">
                          {evaluation.businessValue.risks.map((risk, i) => (
                            <li key={i} className="text-sm flex gap-2">
                              <span className="text-red-600">⚠</span>
                              <span>{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {evaluation.businessValue.opportunities.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-green-600">机会:</h4>
                        <ul className="space-y-2">
                          {evaluation.businessValue.opportunities.map((opp, i) => (
                            <li key={i} className="text-sm flex gap-2">
                              <span className="text-green-600">✓</span>
                              <span>{opp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                  <CardContent className="pt-0">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleModuleFeedback("business", "like")}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleModuleFeedback("business", "dislike")}
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
