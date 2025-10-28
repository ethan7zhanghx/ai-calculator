"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2, Eye, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Feedback {
  id: string
  userId: string
  userEmail: string
  userName: string | null
  type: string
  moduleName: string | null
  rating: string | null
  feedbackType: string | null
  title: string | null
  description: string | null
  contactEmail: string | null
  evaluationId: string | null
  createdAt: string
}

interface PaginationData {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function FeedbacksTable() {
  const { toast } = useToast()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [evaluationDialogOpen, setEvaluationDialogOpen] = useState(false)
  const [evaluationDetail, setEvaluationDetail] = useState<any>(null)
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState(false)

  useEffect(() => {
    fetchFeedbacks(pagination.page)
  }, [])

  const fetchFeedbacks = async (page: number) => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/admin/feedbacks?page=${page}&pageSize=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setFeedbacks(data.data.feedbacks)
        setPagination(data.data.pagination)
      } else {
        toast({
          title: "加载失败",
          description: data.error?.message || "无法加载反馈数据",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "加载失败",
        description: "网络错误",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getFeedbackTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      module: "模块反馈",
      general: "通用反馈",
      bug: "Bug报告",
      feature: "功能建议",
      improvement: "改进建议",
      other: "其他",
    }
    return labels[type] || type
  }

  const getRatingBadge = (rating: string | null) => {
    if (!rating) return null
    if (rating === "positive") {
      return <Badge className="bg-green-500">👍 点赞</Badge>
    }
    return <Badge className="bg-red-500">👎 不满意</Badge>
  }

  const handleViewDetail = (feedback: Feedback) => {
    setSelectedFeedback(feedback)
    setDialogOpen(true)
  }

  const handleViewEvaluation = async (evaluationId: string) => {
    setIsLoadingEvaluation(true)
    setEvaluationDialogOpen(true)

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/admin/evaluations/${evaluationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setEvaluationDetail(data.data.evaluation)
      } else {
        toast({
          title: "加载失败",
          description: data.error?.message || "无法加载评估详情",
          variant: "destructive",
        })
        setEvaluationDialogOpen(false)
      }
    } catch (error) {
      toast({
        title: "加载失败",
        description: "网络错误",
        variant: "destructive",
      })
      setEvaluationDialogOpen(false)
    } finally {
      setIsLoadingEvaluation(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>反馈类型</TableHead>
                <TableHead>模块/评分</TableHead>
                <TableHead>标题</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead className="text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedbacks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                feedbacks.map((feedback) => (
                  <TableRow key={feedback.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{feedback.userEmail}</span>
                        {feedback.userName && (
                          <span className="text-xs text-muted-foreground">{feedback.userName}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getFeedbackTypeLabel(feedback.type)}</Badge>
                    </TableCell>
                    <TableCell>
                      {feedback.type === "module" ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">{feedback.moduleName}</span>
                          {getRatingBadge(feedback.rating)}
                        </div>
                      ) : (
                        <Badge variant="secondary">{getFeedbackTypeLabel(feedback.feedbackType || "")}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {feedback.title || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(feedback.createdAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(feedback)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页控制 */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            共 {pagination.total} 条记录,第 {pagination.page} / {pagination.totalPages} 页
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchFeedbacks(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchFeedbacks(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              下一页
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 详情对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>反馈详情</DialogTitle>
            <DialogDescription>查看完整的反馈信息</DialogDescription>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold mb-1">用户邮箱</div>
                  <div className="text-sm text-muted-foreground">{selectedFeedback.userEmail}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1">用户姓名</div>
                  <div className="text-sm text-muted-foreground">{selectedFeedback.userName || "-"}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold mb-1">反馈类型</div>
                  <Badge variant="outline">{getFeedbackTypeLabel(selectedFeedback.type)}</Badge>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1">提交时间</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(selectedFeedback.createdAt)}
                  </div>
                </div>
              </div>

              {selectedFeedback.type === "module" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-semibold mb-1">模块名称</div>
                      <div className="text-sm text-muted-foreground">{selectedFeedback.moduleName}</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold mb-1">评分</div>
                      {getRatingBadge(selectedFeedback.rating)}
                    </div>
                  </div>
                  {selectedFeedback.evaluationId && (
                    <div>
                      <div className="text-sm font-semibold mb-1">评估ID</div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          {selectedFeedback.evaluationId}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewEvaluation(selectedFeedback.evaluationId!)}
                          className="h-7 text-xs"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          查看评估详情
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-semibold mb-1">反馈分类</div>
                      <Badge variant="secondary">
                        {getFeedbackTypeLabel(selectedFeedback.feedbackType || "")}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm font-semibold mb-1">联系邮箱</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedFeedback.contactEmail || "-"}
                      </div>
                    </div>
                  </div>

                  {selectedFeedback.title && (
                    <div>
                      <div className="text-sm font-semibold mb-1">标题</div>
                      <div className="text-sm text-muted-foreground">{selectedFeedback.title}</div>
                    </div>
                  )}

                  {selectedFeedback.description && (
                    <div>
                      <div className="text-sm font-semibold mb-1">描述</div>
                      <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md whitespace-pre-wrap">
                        {selectedFeedback.description}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 评估详情对话框 */}
      <Dialog open={evaluationDialogOpen} onOpenChange={setEvaluationDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>评估详情</DialogTitle>
            <DialogDescription>查看完整的评估参数和结果</DialogDescription>
          </DialogHeader>
          {isLoadingEvaluation ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : evaluationDetail ? (
            <div className="space-y-6">
              {/* 用户信息 */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-3">用户信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">邮箱</div>
                    <div className="text-sm">{evaluationDetail.userEmail}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">姓名</div>
                    <div className="text-sm">{evaluationDetail.userName || "-"}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">手机</div>
                    <div className="text-sm">{evaluationDetail.userPhone || "-"}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">评估时间</div>
                    <div className="text-sm">{formatDate(evaluationDetail.createdAt)}</div>
                  </div>
                </div>
              </div>

              {/* 配置信息 */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-3">配置信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">模型</div>
                    <Badge variant="outline">{evaluationDetail.model}</Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">硬件</div>
                    <div className="text-sm">{evaluationDetail.hardware} x {evaluationDetail.cardCount}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">数据量</div>
                    <div className="text-sm">{evaluationDetail.businessDataVolume?.toLocaleString() || "-"} 条</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">数据类型</div>
                    <div className="flex flex-wrap gap-1">
                      {evaluationDetail.businessDataTypes.map((type: string) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">QPS要求</div>
                    <div className="text-sm">{evaluationDetail.performanceQPS || "-"}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">并发数</div>
                    <div className="text-sm">{evaluationDetail.performanceConcurrency || "-"}</div>
                  </div>
                </div>
              </div>

              {/* 业务场景 */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-3">业务场景</h3>
                <div className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                  {evaluationDetail.businessScenario}
                </div>
              </div>

              {/* 评估结果摘要 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">评估结果</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">资源可行性</div>
                    <div className="text-2xl font-bold">
                      {evaluationDetail.resourceFeasibility.inference.feasible ? "✓" : "✗"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      推理{evaluationDetail.resourceFeasibility.inference.feasible ? "可行" : "不可行"}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">技术合理性</div>
                    <div className="text-2xl font-bold">
                      {evaluationDetail.technicalFeasibility.score}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">分/100</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">场景价值</div>
                    <div className="text-2xl font-bold">
                      {evaluationDetail.businessValue.score}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">分/100</div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
