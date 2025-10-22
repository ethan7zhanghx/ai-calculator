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
import { ChevronLeft, ChevronRight, Loader2, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Evaluation {
  id: string
  userId: string
  userEmail: string
  userName: string | null
  model: string
  hardware: string
  cardCount: number
  businessScenario: string
  performanceQPS: number | null
  performanceConcurrency: number | null
  businessDataTypes: string[]
  businessDataQuality: string | null
  businessDataVolume: number | null
  createdAt: string
}

interface PaginationData {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function EvaluationsTable() {
  const { toast } = useToast()
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchEvaluations(pagination.page)
  }, [])

  const fetchEvaluations = async (page: number) => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/admin/evaluations?page=${page}&pageSize=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setEvaluations(data.data.evaluations)
        setPagination(data.data.pagination)
      } else {
        toast({
          title: "加载失败",
          description: data.error?.message || "无法加载评估数据",
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

  const handleViewDetail = (evaluation: Evaluation) => {
    setSelectedEvaluation(evaluation)
    setDialogOpen(true)
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
                <TableHead>模型</TableHead>
                <TableHead>硬件</TableHead>
                <TableHead className="text-center">卡数</TableHead>
                <TableHead>业务场景</TableHead>
                <TableHead>评估时间</TableHead>
                <TableHead className="text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                evaluations.map((evaluation) => (
                  <TableRow key={evaluation.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{evaluation.userEmail}</span>
                        {evaluation.userName && (
                          <span className="text-xs text-muted-foreground">{evaluation.userName}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{evaluation.model}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{evaluation.hardware}</TableCell>
                    <TableCell className="text-center">
                      <Badge>{evaluation.cardCount}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={evaluation.businessScenario}>
                      {evaluation.businessScenario}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(evaluation.createdAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(evaluation)}
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
              onClick={() => fetchEvaluations(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchEvaluations(pagination.page + 1)}
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
            <DialogTitle>评估详情</DialogTitle>
            <DialogDescription>查看完整的评估参数信息</DialogDescription>
          </DialogHeader>
          {selectedEvaluation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold mb-1">用户邮箱</div>
                  <div className="text-sm text-muted-foreground">{selectedEvaluation.userEmail}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1">用户姓名</div>
                  <div className="text-sm text-muted-foreground">{selectedEvaluation.userName || "-"}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold mb-1">模型</div>
                  <Badge variant="outline">{selectedEvaluation.model}</Badge>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1">硬件配置</div>
                  <div className="text-sm text-muted-foreground">{selectedEvaluation.hardware}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold mb-1">卡数</div>
                  <div className="text-sm text-muted-foreground">{selectedEvaluation.cardCount}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1">数据量</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedEvaluation.businessDataVolume?.toLocaleString() || "-"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold mb-1">数据类型</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedEvaluation.businessDataTypes.map((type) => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1">数据质量</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedEvaluation.businessDataQuality || "-"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold mb-1">QPS要求</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedEvaluation.performanceQPS || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1">并发数</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedEvaluation.performanceConcurrency || "-"}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-1">业务场景</div>
                <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                  {selectedEvaluation.businessScenario}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-1">评估时间</div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(selectedEvaluation.createdAt)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
