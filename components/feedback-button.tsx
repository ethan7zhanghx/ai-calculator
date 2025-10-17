"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageSquare } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { GeneralFeedbackType } from "@/lib/types"

export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // 表单状态
  const [type, setType] = useState<GeneralFeedbackType>("feature")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [email, setEmail] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/feedback/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title, description, email: email || undefined }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "反馈已提交",
          description: "感谢您的宝贵意见!我们会认真处理",
        })

        // 重置表单
        setType("feature")
        setTitle("")
        setDescription("")
        setEmail("")
        setOpen(false)
      } else {
        toast({
          title: "提交失败",
          description: data.error?.message || "请稍后重试",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "提交失败",
        description: "网络错误,请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
            size="icon"
            title="反馈"
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>反馈与建议</DialogTitle>
            <DialogDescription>
              告诉我们您的想法,帮助我们改进产品
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="feedback-type">反馈类型</Label>
              <Select value={type} onValueChange={(value) => setType(value as GeneralFeedbackType)}>
                <SelectTrigger id="feedback-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">错误报告</SelectItem>
                  <SelectItem value="feature">功能建议</SelectItem>
                  <SelectItem value="improvement">改进建议</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-title">标题</Label>
              <Input
                id="feedback-title"
                placeholder="简短描述您的反馈"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-description">详细描述</Label>
              <Textarea
                id="feedback-description"
                placeholder="请详细描述您的反馈..."
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-email">邮箱 (可选)</Label>
              <Input
                id="feedback-email"
                type="email"
                placeholder="如需回复,请留下您的邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
                取消
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "提交中..." : "提交反馈"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
