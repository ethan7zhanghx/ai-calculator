"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"
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
  Sparkles,
  Download,
  History,
  HelpCircle,
} from "lucide-react"
import { AuthDialog } from "@/components/auth-dialog"
import { FeedbackButton } from "@/components/feedback-button"
import { HistorySidebar } from "@/components/history-sidebar"
import { ResourceCard } from "@/components/resource-card"
import { EvaluationDashboard } from "@/components/evaluation-dashboard"
import { BusinessValueChart } from "@/components/business-value-chart"
import { TechnicalEvaluationDetailed } from "@/components/technical-evaluation-detailed"
import { TechnicalEvaluationSimple } from "@/components/technical-evaluation-simple"
import { BusinessEvaluationSimple } from "@/components/business-evaluation-simple"
import { EvaluationProgress } from "@/components/evaluation-progress"
import { ModuleLoadingIndicator } from "@/components/module-loading-indicator"
import { BusinessEvaluationDetailed } from "@/components/business-evaluation-detailed"
import { InputSummary } from "@/components/input-summary"
import { ScenarioRequirements } from "@/components/scenario-requirements"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import { MODEL_KNOWLEDGE } from "@/lib/model-knowledge-base"
import { calculateResourceFeasibility, type ResourceFeasibility } from "@/lib/resource-calculator"
import type {
  DataQuality,
  EvaluationResponse,
  ModuleType,
  FeedbackType,
} from "@/lib/types"

// 带提示的Label组件
function LabelWithTooltip({ htmlFor, children, tooltip }: { htmlFor: string; children: React.ReactNode; tooltip: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{children}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

export default function PageContent() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()

  // 用户认证状态
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState("")
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [authDialogTab, setAuthDialogTab] = useState<"login" | "register">("login")

  // 表单状态
  const [model, setModel] = useState("")
  const [hardware, setHardware] = useState("")
  const [machineCount, setMachineCount] = useState("")
  const [cardsPerMachine, setCardsPerMachine] = useState("")
  const [dataDescription, setDataDescription] = useState("")
  const [dataQuality, setDataQuality] = useState<DataQuality>("high")
  const [businessScenario, setBusinessScenario] = useState("")
  const [tps, setTps] = useState("")
  const [concurrency, setConcurrency] = useState("")

  // 评估结果
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)

  // 流式加载状态 - 追踪各个模块的加载状态
  const [moduleStatuses, setModuleStatuses] = useState({
    resource: 'pending' as 'pending' | 'loading' | 'completed' | 'error',
    technical: 'pending' as 'pending' | 'loading' | 'completed' | 'error',
    business: 'pending' as 'pending' | 'loading' | 'completed' | 'error',
  })

  // 部分评估结果 - 用于流式显示
  const [partialEvaluation, setPartialEvaluation] = useState<Partial<EvaluationResponse>>({})

  // 实时硬件资源评估
  const [resourceEvaluation, setResourceEvaluation] = useState<ResourceFeasibility | null>(null)

  // 待评估标记 - 用于登录后自动评估
  const [pendingEvaluation, setPendingEvaluation] = useState(false)

  // 反馈状态跟踪 - 记录每个模块的反馈状态
  const [moduleFeedbacks, setModuleFeedbacks] = useState<Record<ModuleType, FeedbackType | null>>({
    resource: null,
    technical: null,
    business: null,
  })

  // 标记是否正在主动清除evaluation（点击重新编辑）
  const isManualClearRef = useRef(false)

  // 从URL加载评估结果
  useEffect(() => {
    const evaluationId = searchParams.get("evaluationId")

    console.log("[useEffect] 触发 - evaluationId:", evaluationId, "evaluation:", evaluation?.evaluationId, "isManualClear:", isManualClearRef.current)

    // 如果是主动清除（点击重新编辑），不要重新加载
    if (isManualClearRef.current) {
      console.log("[useEffect] 检测到主动清除标记，跳过加载")
      // 重置标记，但只在URL也变成空时才重置
      if (!evaluationId) {
        console.log("[useEffect] URL已清除，重置主动清除标记")
        isManualClearRef.current = false
      }
      return
    }

    // 如果URL中没有evaluationId，不做任何操作（避免在点击"重新编辑"时重新加载）
    if (!evaluationId) {
      console.log("[useEffect] URL中没有evaluationId，退出")
      return
    }

    // 只有当URL中的evaluationId与当前不一致时才加载
    if (evaluation && evaluation.evaluationId === evaluationId) {
      console.log("[useEffect] evaluationId一致，无需重新加载")
      return
    }

    console.log("[useEffect] 开始加载evaluation:", evaluationId)

    const fetchEvaluation = async (id: string) => {
      try {
        const response = await fetch(`/api/evaluate/${id}`)
        const result = await response.json()

        if (result.success) {
          const data = result.data
          // 恢复所有相关状态
          setEvaluation({
            evaluationId: data.evaluationId,
            resourceFeasibility: data.resourceFeasibility,
            technicalFeasibility: data.technicalFeasibility,
            businessValue: data.businessValue,
            createdAt: data.createdAt,
          })
          // 填充表单输入以供摘要卡使用
          setModel(data.model || "")
          setHardware(data.hardware || "")
          setMachineCount(data.machineCount || "")
          setCardsPerMachine(data.cardsPerMachine || "")
          setDataDescription(data.businessDataDescription || "")
          setDataQuality(data.businessDataQuality || "high")
          setBusinessScenario(data.businessScenario || "")
          setTps(data.performanceTPS || "")
          setConcurrency(data.performanceConcurrency || "")

          toast({
            title: "已加载评估记录",
            description: "已成功从您的历史记录中恢复评估报告。",
          })
        } else {
          toast({
            title: "无法加载评估记录",
            description: "该记录可能已被删除或链接无效。",
            variant: "destructive",
          })
          router.replace("/") // 从URL中移除无效ID
        }
      } catch (error) {
        toast({
          title: "加载失败",
          description: "网络错误，请稍后重试。",
          variant: "destructive",
        })
        router.replace("/")
      }
    }

    fetchEvaluation(evaluationId)
  }, [searchParams, router, toast, evaluation])


  // 检查登录状态
  useEffect(() => {
    const token = localStorage.getItem("token")
    const savedUsername = localStorage.getItem("username")
    if (token && savedUsername) {
      setIsAuthenticated(true)
      setUsername(savedUsername)
    }
  }, [])

  // 实时计算硬件资源可行性
  useEffect(() => {
    if (model && hardware && machineCount && cardsPerMachine && tps) {
      const totalCards = parseInt(machineCount) * parseInt(cardsPerMachine)
      const resource = calculateResourceFeasibility(
        model,
        hardware,
        totalCards,
        parseInt(tps)
      )
      setResourceEvaluation(resource)
    } else {
      setResourceEvaluation(null)
    }
  }, [model, hardware, machineCount, cardsPerMachine, tps])

  // 监听部分评估完成，更新最终评估结果
  useEffect(() => {
    // 当所有模块都完成后，合并为最终结果
    if (
      partialEvaluation.resourceFeasibility &&
      partialEvaluation.technicalFeasibility &&
      partialEvaluation.evaluationId
    ) {
      // 只在所有必要数据都有时才设置最终评估
      setEvaluation({
        evaluationId: partialEvaluation.evaluationId,
        resourceFeasibility: partialEvaluation.resourceFeasibility,
        technicalFeasibility: partialEvaluation.technicalFeasibility,
        businessValue: partialEvaluation.businessValue ?? null, // 使用nullish coalescing确保类型正确
        hardwareScore: partialEvaluation.hardwareScore, // 保存硬件评分
        createdAt: partialEvaluation.createdAt || new Date().toISOString(),
      })
    }
  }, [partialEvaluation])

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

  // 核心评估函数 - 实际调用API（支持流式响应）
  const performEvaluation = async (token?: string) => {
    setIsEvaluating(true)
    setPartialEvaluation({}) // 重置部分评估结果
    setModuleStatuses({
      resource: 'pending',
      technical: 'pending',
      business: 'pending',
    })

    try {
      let finalEvaluationId: string | undefined = undefined
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
          machineCount: parseInt(machineCount),
          cardsPerMachine: parseInt(cardsPerMachine),
          businessData: {
            description: dataDescription,
            quality: dataQuality,
          },
          businessScenario,
          performanceRequirements: {
            tps: parseInt(tps),
            concurrency: parseInt(concurrency),
          },
        }),
      })

      // 检查响应类型
      const contentType = response.headers.get('content-type')

      if (contentType?.includes('text/event-stream')) {
        // 流式响应处理
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error("无法读取响应流")
        }

        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue

            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'resource') {
                // 资源评估完成
                finalEvaluationId = data.data.evaluationId // 捕获ID到局部变量
                setModuleStatuses(prev => ({ ...prev, resource: 'completed' }))
                setPartialEvaluation(prev => ({
                  ...prev,
                  evaluationId: data.data.evaluationId,
                  resourceFeasibility: data.data.resourceFeasibility,
                  createdAt: data.data.createdAt,
                }))
              } else if (data.type === 'technical') {
                // 技术评估完成（包含硬件评分）
                setModuleStatuses(prev => ({ ...prev, resource: 'completed', technical: 'completed' }))
                setPartialEvaluation(prev => ({
                  ...prev,
                  technicalFeasibility: data.data.technicalFeasibility,
                  hardwareScore: data.data.hardwareScore, // 保存硬件评分
                }))
              } else if (data.type === 'business') {
                // 场景价值评估完成
                setModuleStatuses(prev => ({ ...prev, business: 'completed' }))
                setPartialEvaluation(prev => ({
                  ...prev,
                  businessValue: data.data.businessValue,
                }))
              } else if (data.type === 'complete') {
                // 所有评估完成
                console.log("所有评估完成")
              } else if (data.type === 'error') {
                // 某个模块评估失败
                console.error(`${data.module} 模块评估失败:`, data.error)
                if (data.module === 'resource') {
                  setModuleStatuses(prev => ({ ...prev, resource: 'error' }))
                } else if (data.module === 'technical') {
                  setModuleStatuses(prev => ({ ...prev, technical: 'error' }))
                } else if (data.module === 'business') {
                  setModuleStatuses(prev => ({ ...prev, business: 'error' }))
                }
              }

              // 更新模块状态为loading（当前正在处理的模块）
              if (data.type === 'resource') {
                setModuleStatuses(prev => ({ ...prev, technical: 'loading' }))
              } else if (data.type === 'technical') {
                setModuleStatuses(prev => ({ ...prev, business: 'loading' }))
              }

            } catch (e) {
              console.error("解析流式数据失败:", e)
            }
          }
        }

        // 流式响应完成
        setModuleFeedbacks({ resource: null, technical: null, business: null })

        // 更新URL以包含评估ID
        if (finalEvaluationId) {
          const newUrl = `${window.location.pathname}?evaluationId=${finalEvaluationId}`
          window.history.pushState({ path: newUrl }, "", newUrl)
        }

        toast({
          title: "评估完成",
          description: "AI分析报告已生成"
        })

        // 自动滚动到结果
        setTimeout(() => {
          document.getElementById("evaluation-results")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }, 100)

      } else {
        // 降级处理：非流式响应（兼容旧版本）
        const data = await response.json()

        if (data.success) {
          setEvaluation(data.data)
          setModuleFeedbacks({ resource: null, technical: null, business: null })

          // 更新URL以包含评估ID
          const finalEvaluationId = data.data.evaluationId
          if (finalEvaluationId) {
            const newUrl = `${window.location.pathname}?evaluationId=${finalEvaluationId}`
            window.history.pushState({ path: newUrl }, "", newUrl)
          }

          toast({
            title: "评估完成",
            description: "AI分析报告已生成"
          })
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
      }

    } catch (error) {
      console.error("评估错误:", error)
      toast({
        title: "评估失败",
        description: "网络错误,请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsEvaluating(false)
      setModuleStatuses({
        resource: 'pending',
        technical: 'pending',
        business: 'pending',
      })
    }
  }

  const handleEvaluate = async () => {
    if (!model || !hardware || !machineCount || !cardsPerMachine || !dataDescription || !businessScenario || !tps || !concurrency) {
      toast({
        title: "请填写完整信息",
        description: "所有字段均为必填项",
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


  // 查看完整报告
  const handleViewReport = () => {
    if (!evaluation) return
    // 在新标签页打开报告页面
    window.open(`/report/${evaluation.evaluationId}`, '_blank')
  }

  const isFormComplete = model && hardware && machineCount && cardsPerMachine && dataDescription && businessScenario && tps && concurrency

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/paddlepaddle.jpeg" alt="PaddlePaddle Logo" width={32} height={32} className="rounded-md" />
              <span className="text-xl font-semibold">AI FitCheck 企业级AI需求资源计算器</span>
            </div>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <HistorySidebar />
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
            <h1 className="text-4xl font-bold tracking-tight">AI FitCheck 企业级AI需求资源计算器</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            企业AI应用提供一键式"智能参谋"，秒级启动资源、技术、场景价值评估
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
                  <LabelWithTooltip
                    htmlFor="model"
                    tooltip="选择您计划使用的AI大语言模型。不同模型有不同的参数量和能力特点。"
                  >
                    模型选择
                  </LabelWithTooltip>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger id="model" className="w-full">
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
                <div className="space-y-2">
                  <LabelWithTooltip
                    htmlFor="hardware"
                    tooltip="选择您拥有或计划采购的GPU型号。不同GPU在显存容量和计算性能上有差异。"
                  >
                    硬件型号
                  </LabelWithTooltip>
                  <Select value={hardware} onValueChange={setHardware}>
                    <SelectTrigger id="hardware" className="w-full">
                      <SelectValue placeholder="选择硬件" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="昆仑芯 P800">昆仑芯 P800</SelectItem>
                      <SelectItem value="昇腾 910B">昇腾 910B</SelectItem>
                      <SelectItem value="海光 K100">海光 K100</SelectItem>
                      <SelectItem value="寒武纪MLU590">寒武纪MLU590</SelectItem>
                      <SelectItem value="曦云 C500">曦云 C500</SelectItem>
                      <SelectItem value="思元 MLU370">思元 MLU370</SelectItem>
                      <SelectItem value="NVIDIA A100 (80GB)">NVIDIA A100 (80GB)</SelectItem>
                      <SelectItem value="NVIDIA A100 (40GB)">NVIDIA A100 (40GB)</SelectItem>
                      <SelectItem value="NVIDIA H100">NVIDIA H100</SelectItem>
                      <SelectItem value="NVIDIA V100">NVIDIA V100</SelectItem>
                      <SelectItem value="NVIDIA A10">NVIDIA A10</SelectItem>
                      <SelectItem value="NVIDIA RTX 4090">NVIDIA RTX 4090</SelectItem>
                      <SelectItem value="NVIDIA RTX 3090">NVIDIA RTX 3090</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 机卡配置 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <LabelWithTooltip
                      htmlFor="machineCount"
                      tooltip="您拥有或计划采购的服务器（机器）数量。"
                    >
                      机器数量
                    </LabelWithTooltip>
                    <Input
                      id="machineCount"
                      type="number"
                      min="1"
                      placeholder="台"
                      value={machineCount}
                      onChange={(e) => setMachineCount(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <LabelWithTooltip
                      htmlFor="cardsPerMachine"
                      tooltip="每台服务器上配备的GPU卡数。例如：一台8卡A100服务器，这里填8。"
                    >
                      每机卡数
                    </LabelWithTooltip>
                    <Input
                      id="cardsPerMachine"
                      type="number"
                      min="1"
                      placeholder="卡/台"
                      value={cardsPerMachine}
                      onChange={(e) => setCardsPerMachine(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* 业务数据描述 */}
                <div className="space-y-2">
                  <LabelWithTooltip
                    htmlFor="dataDescription"
                    tooltip="请描述您是否拥有可用于模型精调的业务数据，包括数据类型和大致数量。例如：有「10000条电商领域」的「客服对话记录」数据样例，且该数据「已经过数据治理、精调」。"
                  >
                    精调数据情况
                  </LabelWithTooltip>
                  <Textarea
                    id="dataDescription"
                    placeholder="请描述您是否有用于精调的业务数据，以及数据量（例如：有「10000条电商领域」的「客服对话记录」数据样例，且该数据「已经过数据治理、精调」）"
                    rows={3}
                    value={dataDescription}
                    onChange={(e) => setDataDescription(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* 数据治理 */}
                <div className="space-y-2">
                  <LabelWithTooltip
                    htmlFor="dataQuality"
                    tooltip="数据治理指是否对数据进行过专业标注、生产等预处理工作，良好且一定量级的数据治理能显著提升模型效果。"
                  >
                    数据治理
                  </LabelWithTooltip>
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

                {/* 业务场景 */}
                <div className="space-y-2">
                  <LabelWithTooltip
                    htmlFor="businessScenario"
                    tooltip="详细描述您想用AI解决的业务问题或实现的功能。例如：我是一名从事金融行业智能客服场景的技术人员，目前针对客服智能化场景已有初步市场调研，计划采取大小模型结合的技术方式，有3名AI人员辅助计划12月上线。"
                  >
                    业务场景
                  </LabelWithTooltip>
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
                    <LabelWithTooltip
                      htmlFor="tps"
                      tooltip="TPS (Tokens Per Second)：大模型每秒生成的token数量。这是衡量模型推理性能的关键指标，影响响应速度和用户体验。"
                    >
                      期望TPS
                    </LabelWithTooltip>
                    <Input
                      id="tps"
                      type="number"
                      min="1"
                      placeholder="每秒token数"
                      value={tps}
                      onChange={(e) => setTps(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <LabelWithTooltip
                      htmlFor="concurrency"
                      tooltip="系统需要同时支持多少用户在线使用。并发数越高，对系统资源要求越大。"
                    >
                      用户并发数
                    </LabelWithTooltip>
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
                machineCount={machineCount}
                cardsPerMachine={cardsPerMachine}
                dataDescription={dataDescription}
                dataQuality={dataQuality}
                businessScenario={businessScenario}
                tps={tps}
                concurrency={concurrency}
                onEdit={() => {
                  console.log("[onEdit] 点击重新编辑 - 当前evaluation:", evaluation?.evaluationId)
                  // 设置主动清除标记，防止useEffect重新加载
                  isManualClearRef.current = true
                  console.log("[onEdit] 已设置主动清除标记")
                  // 先清除evaluation状态，确保界面立即切换到输入表单
                  setEvaluation(null)
                  console.log("[onEdit] 已调用setEvaluation(null)")
                  // 然后清除URL中的ID
                  router.replace("/")
                  console.log("[onEdit] 已调用router.replace(\"/\")")
                }}
              />
            )}
          </div>

          {/* 评估结果 */}
          <div className="space-y-6" id="evaluation-results">
            {isEvaluating ? (
              /* 评估中 - 显示模块加载指示器 */
              <>
                <ModuleLoadingIndicator
                  modules={[
                    {
                      id: 'resource',
                      name: '资源可行性评估',
                      description: '计算硬件资源是否能支持模型的各项任务',
                      status: moduleStatuses.resource,
                    },
                    {
                      id: 'technical',
                      name: '技术方案合理性评估',
                      description: 'AI深度分析技术选型是否合理',
                      status: moduleStatuses.technical,
                    },
                    {
                      id: 'business',
                      name: '场景价值评估',
                      description: 'AI深度评估该方案的场景价值',
                      status: moduleStatuses.business,
                    },
                  ]}
                />

                {/* 实时显示已完成的模块 */}
                {partialEvaluation.resourceFeasibility && (
                  <Card className="shadow-lg animate-in fade-in-50 slide-in-from-top-4">
                    <CardHeader>
                      <CardTitle>资源可行性评估</CardTitle>
                      <CardDescription>硬件资源是否能够支持模型的各项任务</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-3">
                        <ResourceCard
                          title="预训练"
                          feasible={partialEvaluation.resourceFeasibility.pretraining.feasible}
                          memoryUsagePercent={partialEvaluation.resourceFeasibility.pretraining.memoryUsagePercent}
                          memoryRequired={partialEvaluation.resourceFeasibility.pretraining.memoryRequired}
                          memoryAvailable={partialEvaluation.resourceFeasibility.pretraining.memoryAvailable}
                          suggestions={partialEvaluation.resourceFeasibility.pretraining.suggestions}
                        />

                        <ResourceCard
                          title="精调"
                          feasible={partialEvaluation.resourceFeasibility.fineTuning.feasible}
                          memoryUsagePercent={partialEvaluation.resourceFeasibility.fineTuning.memoryUsagePercent}
                          memoryRequired={partialEvaluation.resourceFeasibility.fineTuning.memoryRequired}
                          memoryAvailable={partialEvaluation.resourceFeasibility.fineTuning.memoryAvailable}
                          suggestions={partialEvaluation.resourceFeasibility.fineTuning.suggestions}
                          extraInfo={
                            <div className="flex gap-1.5 flex-wrap">
                              <span className="text-xs text-muted-foreground">
                                LoRA: {partialEvaluation.resourceFeasibility.fineTuning.loraFeasible ? "✓" : "✗"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                QLoRA: {partialEvaluation.resourceFeasibility.fineTuning.qloraFeasible ? "✓" : "✗"}
                              </span>
                            </div>
                          }
                        />

                        <ResourceCard
                          title="推理"
                          feasible={partialEvaluation.resourceFeasibility.inference.feasible}
                          memoryUsagePercent={partialEvaluation.resourceFeasibility.inference.memoryUsagePercent}
                          memoryRequired={partialEvaluation.resourceFeasibility.inference.memoryRequired}
                          memoryAvailable={partialEvaluation.resourceFeasibility.inference.memoryAvailable}
                          suggestions={partialEvaluation.resourceFeasibility.inference.suggestions}
                          extraInfo={
                            <div className="space-y-2">
                              <div className="flex flex-col gap-1.5">
                                <div className="text-center p-1.5 rounded bg-primary/10">
                                  <div className="text-sm font-bold text-primary">
                                    {partialEvaluation.resourceFeasibility.inference.supportedThroughput}
                                  </div>
                                  <div className="text-xs text-muted-foreground">TPS</div>
                                </div>
                                <div className="text-center p-1.5 rounded bg-primary/10">
                                  <div className="text-sm font-bold text-primary">
                                    {partialEvaluation.resourceFeasibility.inference.supportedQPS}
                                  </div>
                                  <div className="text-xs text-muted-foreground">QPS</div>
                                </div>
                              </div>

                              {!partialEvaluation.resourceFeasibility.inference.meetsRequirements && (
                                <div>
                                  <h5 className="text-xs font-semibold mb-1">量化:</h5>
                                  <div className="space-y-1">
                                    {partialEvaluation.resourceFeasibility.inference.quantizationOptions.map((opt, i) => (
                                      <div key={i} className="flex items-center justify-between p-1 rounded text-xs bg-background">
                                        <span className="font-medium">{opt.type}</span>
                                        <span className={opt.meetsRequirements ? "text-green-600" : "text-amber-600"}>
                                          {Math.round(opt.supportedQPS)} {opt.meetsRequirements ? "✓" : "✗"}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 场景需求分析 - 仅在技术评估包含场景需求时显示 */}
                {partialEvaluation.technicalFeasibility?.detailedEvaluation?.scenarioRequirements && (
                  <ScenarioRequirements
                    scenarioRequirements={partialEvaluation.technicalFeasibility.detailedEvaluation.scenarioRequirements}
                  />
                )}

                {partialEvaluation.technicalFeasibility && (
                  <Card className="shadow-lg animate-in fade-in-50 slide-in-from-top-4">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>技术方案合理性评估</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">评分:</span>
                          <div className="bg-primary text-primary-foreground rounded-lg px-3 py-1">
                            <span className="text-lg font-bold">{partialEvaluation.technicalFeasibility?.score}</span>
                            <span className="text-sm">/100</span>
                          </div>
                        </div>
                      </CardTitle>
                      <CardDescription>AI深度评估技术选型是否合理</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="relative py-4 mb-6">
                        <div className="flex h-3 rounded-full overflow-hidden">
                          <div className="flex-1 bg-red-500 opacity-30" />
                          <div className="flex-1 bg-amber-500 opacity-30" />
                          <div className="flex-1 bg-blue-500 opacity-30" />
                          <div className="flex-1 bg-green-500 opacity-30" />
                        </div>
                        <div
                          className="absolute -top-2.5 transition-all duration-500"
                          style={{
                            left: `clamp(1.5rem, ${partialEvaluation.technicalFeasibility?.score || 0}%, calc(100% - 1.5rem))`,
                            transform: "translateX(-50%)",
                          }}
                        >
                          <div className="relative">
                            <div className="bg-primary text-primary-foreground text-xs font-bold w-8 h-5 flex items-center justify-center rounded-sm shadow-md">
                              {partialEvaluation.technicalFeasibility?.score}
                            </div>
                            <div className="absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-primary transform rotate-45 -bottom-1" />
                          </div>
                        </div>
                      </div>

                      {partialEvaluation.technicalFeasibility.detailedEvaluation ? (
                        <TechnicalEvaluationDetailed evaluation={partialEvaluation.technicalFeasibility.detailedEvaluation} />
                      ) : (
                        <div className="space-y-4">
                          {partialEvaluation.technicalFeasibility.issues.length > 0 && (
                            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                              <h4 className="font-semibold text-sm mb-2 text-amber-600 dark:text-amber-400">发现的问题:</h4>
                              <ul className="space-y-2">
                                {partialEvaluation.technicalFeasibility.issues.map((issue, i) => (
                                  <li key={i} className="text-sm flex gap-2">
                                    <span className="text-amber-600 dark:text-amber-400">•</span>
                                    <span>{issue}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {partialEvaluation.technicalFeasibility.recommendations.length > 0 && (
                            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                              <h4 className="font-semibold text-sm mb-2 text-blue-600 dark:text-blue-400">改进建议:</h4>
                              <ul className="space-y-2">
                                {partialEvaluation.technicalFeasibility.recommendations.map((rec, i) => (
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
                  </Card>
                )}

                {partialEvaluation.businessValue && (
                  <Card className="shadow-lg animate-in fade-in-50 slide-in-from-top-4">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>场景价值评估</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">评分:</span>
                          <div className="bg-primary text-primary-foreground rounded-lg px-3 py-1">
                            <span className="text-lg font-bold">{partialEvaluation.businessValue?.score}</span>
                            <span className="text-sm">/100</span>
                          </div>
                        </div>
                      </CardTitle>
                      <CardDescription>AI深度评估该方案的场景价值</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="relative py-4 mb-6">
                        <div className="flex h-3 rounded-full overflow-hidden">
                          <div className="flex-1 bg-red-500 opacity-30" />
                          <div className="flex-1 bg-amber-500 opacity-30" />
                          <div className="flex-1 bg-blue-500 opacity-30" />
                          <div className="flex-1 bg-green-500 opacity-30" />
                        </div>
                        <div
                          className="absolute -top-2.5 transition-all duration-500"
                          style={{
                            left: `clamp(1.5rem, ${partialEvaluation.businessValue?.score || 0}%, calc(100% - 1.5rem))`,
                            transform: "translateX(-50%)",
                          }}
                        >
                          <div className="relative">
                            <div className="bg-primary text-primary-foreground text-xs font-bold w-8 h-5 flex items-center justify-center rounded-sm shadow-md">
                              {partialEvaluation.businessValue?.score}
                            </div>
                            <div className="absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-primary transform rotate-45 -bottom-1" />
                          </div>
                        </div>
                      </div>

                      {partialEvaluation.businessValue.detailedEvaluation ? (
                        <BusinessEvaluationDetailed evaluation={partialEvaluation.businessValue.detailedEvaluation} />
                      ) : (
                        <div className="space-y-4">
                          <BusinessValueChart
                            score={partialEvaluation.businessValue?.score || 0}
                            risks={partialEvaluation.businessValue.risks}
                            opportunities={partialEvaluation.businessValue.opportunities}
                          />

                          <Separator />

                          <div>
                            <h4 className="font-semibold text-sm mb-3">详细分析:</h4>
                            <p className="text-sm whitespace-pre-line leading-relaxed text-muted-foreground">
                              {partialEvaluation.businessValue.analysis}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
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

                {/* 场景需求分析 - 仅在技术评估包含场景需求时显示 */}
                {evaluation.technicalFeasibility?.detailedEvaluation?.scenarioRequirements && (
                  <ScenarioRequirements
                    scenarioRequirements={evaluation.technicalFeasibility.detailedEvaluation.scenarioRequirements}
                  />
                )}

                {/* 资源可行性评估 - 使用增强卡片 */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle>资源可行性评估</CardTitle>
                    <CardDescription>硬件资源是否能够支持模型的各项任务</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-3">
                      <ResourceCard
                        title="预训练"
                        feasible={evaluation.resourceFeasibility.pretraining.feasible}
                        memoryUsagePercent={evaluation.resourceFeasibility.pretraining.memoryUsagePercent}
                        memoryRequired={evaluation.resourceFeasibility.pretraining.memoryRequired}
                        memoryAvailable={evaluation.resourceFeasibility.pretraining.memoryAvailable}
                        suggestions={evaluation.resourceFeasibility.pretraining.suggestions}
                      />

                      <ResourceCard
                        title="精调"
                        feasible={evaluation.resourceFeasibility.fineTuning.feasible}
                        memoryUsagePercent={evaluation.resourceFeasibility.fineTuning.memoryUsagePercent}
                        memoryRequired={evaluation.resourceFeasibility.fineTuning.memoryRequired}
                        memoryAvailable={evaluation.resourceFeasibility.fineTuning.memoryAvailable}
                        suggestions={evaluation.resourceFeasibility.fineTuning.suggestions}
                        extraInfo={
                          <div className="flex gap-1.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              LoRA: {evaluation.resourceFeasibility.fineTuning.loraFeasible ? "✓" : "✗"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              QLoRA: {evaluation.resourceFeasibility.fineTuning.qloraFeasible ? "✓" : "✗"}
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
                          <div className="space-y-2">
                            <div className="flex flex-col gap-1.5">
                              <div className="text-center p-1.5 rounded bg-primary/10">
                                <div className="text-sm font-bold text-primary">
                                  {evaluation.resourceFeasibility.inference.supportedThroughput}
                                </div>
                                <div className="text-xs text-muted-foreground">TPS</div>
                              </div>
                              <div className="text-center p-1.5 rounded bg-primary/10">
                                <div className="text-sm font-bold text-primary">
                                  {evaluation.resourceFeasibility.inference.supportedQPS}
                                </div>
                                <div className="text-xs text-muted-foreground">QPS</div>
                              </div>
                            </div>

                            {!evaluation.resourceFeasibility.inference.meetsRequirements && (
                              <div>
                                <h5 className="text-xs font-semibold mb-1">量化:</h5>
                                <div className="space-y-1">
                                  {evaluation.resourceFeasibility.inference.quantizationOptions.map((opt, i) => (
                                    <div key={i} className="flex items-center justify-between p-1 rounded text-xs bg-background">
                                      <span className="font-medium">{opt.type}</span>
                                      <span className={opt.meetsRequirements ? "text-green-600" : "text-amber-600"}>
                                        {Math.round(opt.supportedQPS)} {opt.meetsRequirements ? "✓" : "✗"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        }
                      />
                    </div>
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
                      <div className="bg-primary text-primary-foreground rounded-lg px-3 py-1">
                        <span className="text-lg font-bold">{evaluation.technicalFeasibility?.score}</span>
                        <span className="text-sm">/100</span>
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
                        className="absolute -top-2.5 transition-all duration-500"
                        style={{
                          left: `clamp(1.5rem, ${evaluation.technicalFeasibility?.score || 0}%, calc(100% - 1.5rem))`,
                          transform: "translateX(-50%)",
                        }}
                      >
                        <div className="relative">
                          <div className="bg-primary text-primary-foreground text-xs font-bold w-8 h-5 flex items-center justify-center rounded-sm shadow-md">
                            {evaluation.technicalFeasibility?.score}
                          </div>
                          <div className="absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-primary transform rotate-45 -bottom-1" />
                        </div>
                      </div>
                    </div>

                    {/* 使用简化版评估内容 */}
                    {evaluation.technicalFeasibility.detailedEvaluation ? (
                      <TechnicalEvaluationSimple evaluation={evaluation.technicalFeasibility.detailedEvaluation} />
                    ) : (
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

                {/* 场景价值评估 */}
                {evaluation.businessValue ? (
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>场景价值评估</span>
                        {/* 评分显示 */}
                        <div className="bg-primary text-primary-foreground rounded-lg px-3 py-1">
                          <span className="text-lg font-bold">{evaluation.businessValue?.score}</span>
                          <span className="text-sm">/100</span>
                        </div>
                      </CardTitle>
                      <CardDescription>AI深度评估该方案的场景价值</CardDescription>
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
                          className="absolute -top-2.5 transition-all duration-500"
                          style={{
                            left: `clamp(1.5rem, ${evaluation.businessValue?.score || 0}%, calc(100% - 1.5rem))`,
                            transform: "translateX(-50%)",
                          }}
                        >
                          <div className="relative">
                            <div className="bg-primary text-primary-foreground text-xs font-bold w-8 h-5 flex items-center justify-center rounded-sm shadow-md">
                              {evaluation.businessValue?.score}
                            </div>
                            <div className="absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-primary transform rotate-45 -bottom-1" />
                          </div>
                        </div>
                      </div>

                      {/* 使用简化版评估内容 */}
                      {evaluation.businessValue.detailedEvaluation ? (
                        <BusinessEvaluationSimple evaluation={evaluation.businessValue.detailedEvaluation} />
                      ) : (
                        /* 降级展示：如果没有详细评估数据，显示简化版 */
                        <div className="space-y-4">
                          <BusinessValueChart
                            score={evaluation.businessValue?.score || 0}
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
                ) : (
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle>场景价值评估</CardTitle>
                      <CardDescription>评估暂时不可用</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="p-8 text-center text-muted-foreground">
                        <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">场景价值评估服务暂时不可用，请稍后重试</p>
                        <p className="text-xs mt-2 opacity-70">技术方案评估和资源可行性评估已完成</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 查看完整报告按钮 */}
                <div className="flex flex-col items-center pt-2 space-y-3">
                  <Button
                    variant="default"
                    size="lg"
                    onClick={handleViewReport}
                    className="gap-2"
                  >
                    <Download className="h-5 w-5" />
                    查看完整报告
                  </Button>

                  {/* AI报告说明提示 */}
                  <div className="max-w-md text-center">
                    <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="text-left">
                        <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-1">
                          报告由AI智能生成
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                          点击查看完整报告后，可使用浏览器打印功能（Ctrl+P / Cmd+P）保存为PDF。如需专家深度建议或定制化方案，欢迎通过右下角「反馈建议」联系我们。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
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
