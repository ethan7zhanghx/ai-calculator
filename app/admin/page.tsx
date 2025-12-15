"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Users, FileText, MessageSquare, LogOut, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DashboardOverview } from "@/components/admin/dashboard-overview"
import { UsersTable } from "@/components/admin/users-table"
import { EvaluationsTable } from "@/components/admin/evaluations-table"
import { FeedbacksTable } from "@/components/admin/feedbacks-table"
import { AdminsManagement } from "@/components/admin/admins-management"
import { AnnouncementPanel } from "@/components/admin/announcement-panel"

export default function AdminPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // 检查管理员权限
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token")
      if (!token) {
        toast({
          title: "未登录",
          description: "请先登录",
          variant: "destructive",
        })
        router.push("/")
        return
      }

      // 验证管理员权限
      try {
        const response = await fetch("/api/admin/stats", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.status === 403) {
          toast({
            title: "权限不足",
            description: "您没有访问后台管理系统的权限",
            variant: "destructive",
          })
          router.push("/")
          return
        }

        if (!response.ok) {
          toast({
            title: "验证失败",
            description: "请重新登录",
            variant: "destructive",
          })
          localStorage.removeItem("token")
          localStorage.removeItem("username")
          router.push("/")
          return
        }

        // 获取用户角色信息
        const statsData = await response.json()

        // 检查是否是超级管理员(通过尝试访问管理员管理接口)
        const adminCheckResponse = await fetch("/api/admin/manage-admins", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (adminCheckResponse.ok) {
          setIsSuperAdmin(true)
        }

        setIsLoading(false)
      } catch (error) {
        toast({
          title: "验证失败",
          description: "网络错误",
          variant: "destructive",
        })
        router.push("/")
      }
    }

    checkAuth()
  }, [router, toast])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("username")
    toast({ title: "已登出" })
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold">后台管理系统</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
                返回首页
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                登出
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">数据管理中心</h1>
          <p className="text-muted-foreground">查看和管理系统数据</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${isSuperAdmin ? 'grid-cols-6' : 'grid-cols-5'} lg:w-auto`}>
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">数据大屏</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">用户管理</span>
            </TabsTrigger>
            <TabsTrigger value="evaluations" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">评估记录</span>
            </TabsTrigger>
            <TabsTrigger value="feedbacks" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">用户反馈</span>
            </TabsTrigger>
            <TabsTrigger value="announcement" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">公告&维护</span>
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="admins" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">管理员</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardOverview />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>用户列表</CardTitle>
                <CardDescription>查看所有注册用户信息</CardDescription>
              </CardHeader>
              <CardContent>
                <UsersTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evaluations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>评估记录</CardTitle>
                <CardDescription>查看所有评估历史记录</CardDescription>
              </CardHeader>
              <CardContent>
                <EvaluationsTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedbacks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>用户反馈</CardTitle>
                <CardDescription>查看用户提交的反馈信息</CardDescription>
              </CardHeader>
              <CardContent>
                <FeedbacksTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcement" className="space-y-6">
            <AnnouncementPanel />
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="admins" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>管理员管理</CardTitle>
                  <CardDescription>管理系统管理员权限</CardDescription>
                </CardHeader>
                <CardContent>
                  <AdminsManagement />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
