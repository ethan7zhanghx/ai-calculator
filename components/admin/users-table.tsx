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
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

interface User {
  id: string
  email: string
  phone: string | null
  name: string | null
  createdAt: string
  updatedAt: string
  evaluationCount: number
  feedbackCount: number
}

interface PaginationData {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function UsersTable() {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUsers(pagination.page)
  }, [])

  const fetchUsers = async (page: number) => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/admin/users?page=${page}&pageSize=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setUsers(data.data.users)
        setPagination(data.data.pagination)
      } else {
        toast({
          title: "加载失败",
          description: data.error?.message || "无法加载用户数据",
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>邮箱</TableHead>
              <TableHead>手机号</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead className="text-center">评估次数</TableHead>
              <TableHead className="text-center">反馈次数</TableHead>
              <TableHead>注册时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.phone || "-"}</TableCell>
                  <TableCell>{user.name || "-"}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{user.evaluationCount}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{user.feedbackCount}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(user.createdAt)}
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
            onClick={() => fetchUsers(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            上一页
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchUsers(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            下一页
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
