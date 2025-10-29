"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { History, Loader2, ServerCrash, Inbox } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface HistoryItem {
  id: string
  createdAt: string
  model: string
  hardware: string
  cardCount: number
  machineCount: number
  cardsPerMachine: number
  businessScenario: string
  businessDataDescription: string
  performanceTPS: number
  performanceConcurrency: number
  score: number | null
}

export function HistorySidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      fetchHistory()
    }
  }, [isOpen])

  const fetchHistory = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setError("请先登录以查看历史记录")
        return
      }

      const response = await fetch("/api/history", {
        headers: { Authorization: `Bearer ${token}` },
      })

      const result = await response.json()

      if (result.success) {
        setHistory(result.data)
      } else {
        throw new Error(result.error?.message || "获取历史记录失败")
      }
    } catch (err: any) {
      setError(err.message)
      toast({
        title: "加载失败",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleItemClick = (id: string) => {
    router.push(`/?evaluationId=${id}`)
    setIsOpen(false)
  }

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    let interval = seconds / 31536000
    if (interval > 1) return Math.floor(interval) + " 年前"
    interval = seconds / 2592000
    if (interval > 1) return Math.floor(interval) + " 个月前"
    interval = seconds / 86400
    if (interval > 1) return Math.floor(interval) + " 天前"
    interval = seconds / 3600
    if (interval > 1) return Math.floor(interval) + " 小时前"
    interval = seconds / 60
    if (interval > 1) return Math.floor(interval) + " 分钟前"
    return "刚刚"
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          历史记录
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
        <SheetHeader>
          <SheetTitle>评估历史记录</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>正在加载...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-destructive">
              <ServerCrash className="h-8 w-8 mb-4" />
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={fetchHistory} className="mt-4">重试</Button>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Inbox className="h-8 w-8 mb-4" />
              <p>暂无历史记录</p>
              <p className="text-xs mt-1">完成一次评估后，记录会出现在这里</p>
            </div>
          ) : (
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className="p-4 rounded-lg border bg-card hover:bg-muted transition-colors cursor-pointer"
                  >
                    {/* 标题和评分 */}
                    <div className="flex items-start justify-between mb-3">
                      <p className="font-semibold text-sm line-clamp-2 pr-4">
                        {item.businessScenario || item.businessDataDescription || "评估记录"}
                      </p>
                      <Badge variant={item.score && item.score >= 70 ? "default" : "secondary"}>
                        {item.score ?? 'N/A'}
                      </Badge>
                    </div>

                    {/* 用户输入摘要 */}
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-muted-foreground">模型：</span>
                          <span className="font-medium ml-1">{item.model}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">硬件：</span>
                          <span className="font-medium ml-1">{item.hardware}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-muted-foreground">配置：</span>
                          <span className="font-medium ml-1">{item.machineCount}机×{item.cardsPerMachine}卡</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">TPS：</span>
                          <span className="font-medium ml-1">{item.performanceTPS}</span>
                        </div>
                      </div>

                      {item.businessDataDescription && (
                        <div>
                          <span className="text-muted-foreground">数据：</span>
                          <span className="font-medium ml-1 line-clamp-1">{item.businessDataDescription}</span>
                        </div>
                      )}
                    </div>

                    {/* 时间戳 */}
                    <div className="flex items-center justify-end text-xs text-muted-foreground mt-3 pt-2 border-t">
                      <span>{timeAgo(item.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
