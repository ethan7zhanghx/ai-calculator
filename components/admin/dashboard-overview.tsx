"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, MessageSquare, TrendingUp, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface StatsData {
  overview: {
    totalUsers: number
    totalEvaluations: number
    totalFeedbacks: number
    recentUsers: number
    recentEvaluations: number
  }
  modelStats: Array<{ model: string; count: number }>
  hardwareStats: Array<{ hardware: string; count: number }>
  feedbackStats: Array<{ type: string; count: number }>
  dailyTrend: Array<{ date: string; count: number }>
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

export function DashboardOverview() {
  const { toast } = useToast()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/admin/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setStats(data.data)
      } else {
        toast({
          title: "加载失败",
          description: data.error?.message || "无法加载统计数据",
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        无法加载统计数据
      </div>
    )
  }

  const StatCard = ({
    title,
    value,
    description,
    icon: Icon,
    trend,
  }: {
    title: string
    value: number
    description: string
    icon: any
    trend?: number
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {description}
          {trend !== undefined && (
            <span className="text-green-600 ml-2">
              +{trend} 最近7天
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="总用户数"
          value={stats.overview.totalUsers}
          description="注册用户总数"
          icon={Users}
          trend={stats.overview.recentUsers}
        />
        <StatCard
          title="总评估数"
          value={stats.overview.totalEvaluations}
          description="累计评估次数"
          icon={FileText}
          trend={stats.overview.recentEvaluations}
        />
        <StatCard
          title="总反馈数"
          value={stats.overview.totalFeedbacks}
          description="用户反馈总数"
          icon={MessageSquare}
        />
        <StatCard
          title="活跃度"
          value={Math.round((stats.overview.totalEvaluations / Math.max(stats.overview.totalUsers, 1)) * 100)}
          description="平均每用户评估次数"
          icon={TrendingUp}
        />
      </div>

      {/* 评估趋势图 */}
      <Card>
        <CardHeader>
          <CardTitle>评估趋势</CardTitle>
          <CardDescription>最近30天的评估数量变化</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stats.dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getMonth() + 1}/${date.getDate()}`
                }}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
                name="评估数"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 模型和硬件统计 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>热门模型</CardTitle>
            <CardDescription>用户选择最多的AI模型</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.modelStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" name="使用次数" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>硬件配置</CardTitle>
            <CardDescription>用户选择的硬件类型分布</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.hardwareStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ hardware, percent }) =>
                    `${hardware.split(" ")[1]} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {stats.hardwareStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 反馈类型统计 */}
      {stats.feedbackStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>反馈类型分布</CardTitle>
            <CardDescription>用户反馈的分类统计</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.feedbackStats} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="type" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#82ca9d" name="数量" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
