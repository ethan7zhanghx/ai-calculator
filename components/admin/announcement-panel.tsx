"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface Announcement {
  id: string
  title: string
  content: string
  active: boolean
  updatedAt: string
}

export function AnnouncementPanel() {
  const { toast } = useToast()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [active, setActive] = useState(true)

  const [maintenance, setMaintenance] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState("")
  const [loadingMaintenance, setLoadingMaintenance] = useState(false)

  useEffect(() => {
    fetchAnnouncements()
    fetchMaintenance()
  }, [])

  const authHeaders = () => {
    const token = localStorage.getItem("token")
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchAnnouncements = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/announcements", { headers: authHeaders() })
      const data = await res.json()
      if (data.success) {
        setAnnouncements(data.data)
      } else {
        throw new Error(data.error?.message || "获取公告失败")
      }
    } catch (error: any) {
      toast({
        title: "加载公告失败",
        description: error.message || "网络错误",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchMaintenance = async () => {
    try {
      const res = await fetch("/api/admin/settings/maintenance", { headers: authHeaders() })
      const data = await res.json()
      if (data.success) {
        setMaintenance(data.data.maintenance)
        setMaintenanceMessage(data.data.maintenanceMessage || "")
      }
    } catch (error) {
      // 忽略
    }
  }

  const handleCreate = async () => {
    if (!title || !content) {
      toast({ title: "请输入标题和内容", variant: "destructive" })
      return
    }
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ title, content, active }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "公告已发布" })
        setTitle("")
        setContent("")
        setActive(true)
        fetchAnnouncements()
      } else {
        throw new Error(data.error?.message || "发布失败")
      }
    } catch (error: any) {
      toast({
        title: "发布失败",
        description: error.message || "网络错误",
        variant: "destructive",
      })
    }
  }

  const toggleAnnouncement = async (item: Announcement, next: boolean) => {
    try {
      const res = await fetch(`/api/admin/announcements/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ active: next }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: next ? "已激活公告" : "已停用公告" })
        fetchAnnouncements()
      } else {
        throw new Error(data.error?.message || "更新失败")
      }
    } catch (error: any) {
      toast({
        title: "更新失败",
        description: error.message || "网络错误",
        variant: "destructive",
      })
    }
  }

  const saveMaintenance = async () => {
    setLoadingMaintenance(true)
    try {
      const res = await fetch("/api/admin/settings/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          maintenance,
          maintenanceMessage,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "维护状态已更新" })
      } else {
        throw new Error(data.error?.message || "保存失败")
      }
    } catch (error: any) {
      toast({
        title: "保存失败",
        description: error.message || "网络错误",
        variant: "destructive",
      })
    } finally {
      setLoadingMaintenance(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>公告发布</CardTitle>
          <CardDescription>创建/停用在首页展示的公告</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="announcement-title">标题</Label>
            <Input
              id="announcement-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入公告标题"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-content">内容</Label>
            <Textarea
              id="announcement-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="公告内容，将显示在首页顶部"
              rows={4}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="announcement-active" checked={active} onCheckedChange={setActive} />
            <Label htmlFor="announcement-active">发布后立即展示</Label>
          </div>
          <Button onClick={handleCreate}>发布公告</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>公告列表</CardTitle>
          <CardDescription>最近的公告（最多显示50条）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>加载中...</span>
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-sm text-muted-foreground">暂无公告</div>
          ) : (
            announcements.map((item) => (
              <div key={item.id} className="p-3 rounded-md border space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={item.active ? "default" : "secondary"}>
                      {item.active ? "已发布" : "停用"}
                    </Badge>
                    <span className="font-semibold">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.active}
                      onCheckedChange={(checked) => toggleAnnouncement(item, checked)}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.content}</p>
                <div className="text-xs text-muted-foreground">
                  更新于 {new Date(item.updatedAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>服务维护开关</CardTitle>
          <CardDescription>暂停评估服务用于版本更新/运维</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={maintenance} onCheckedChange={setMaintenance} id="maintenance-toggle" />
            <Label htmlFor="maintenance-toggle">
              {maintenance ? "维护中（用户无法发起评估）" : "服务正常"}
            </Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maintenance-message">维护提示</Label>
            <Textarea
              id="maintenance-message"
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              placeholder="维护中的提示信息（显示在首页）"
              rows={3}
            />
          </div>
          <Button onClick={saveMaintenance} disabled={loadingMaintenance}>
            {loadingMaintenance ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              "保存设置"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
