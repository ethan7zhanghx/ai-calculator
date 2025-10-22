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
import { Loader2, Shield, ShieldCheck, UserX, UserPlus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Admin {
  id: string
  email: string
  phone: string | null
  name: string | null
  role: string
  createdAt: string
  evaluationCount: number
  feedbackCount: number
}

interface User {
  id: string
  email: string
  name: string | null
  role: string
}

export function AdminsManagement() {
  const { toast } = useToast()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGranting, setIsGranting] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)

  // 对话框状态
  const [grantDialogOpen, setGrantDialogOpen] = useState(false)
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedRole, setSelectedRole] = useState<"admin" | "super_admin">("admin")
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null)

  useEffect(() => {
    fetchAdmins()
  }, [])

  const fetchAdmins = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/admin/manage-admins", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setAdmins(data.data.admins)
      } else {
        toast({
          title: "加载失败",
          description: data.error?.message || "无法加载管理员列表",
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

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/admin/users?page=1&pageSize=100", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        // 只显示普通用户
        setUsers(data.data.users.filter((u: User) => u.role === "user"))
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
    }
  }

  const handleOpenGrantDialog = async () => {
    await fetchUsers()
    setGrantDialogOpen(true)
  }

  const handleGrantAdmin = async () => {
    if (!selectedUserId) {
      toast({
        title: "请选择用户",
        variant: "destructive",
      })
      return
    }

    setIsGranting(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/admin/manage-admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: selectedUserId,
          role: selectedRole,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "授权成功",
          description: data.data.message,
        })
        setGrantDialogOpen(false)
        setSelectedUserId("")
        fetchAdmins()
      } else {
        toast({
          title: "授权失败",
          description: data.error?.message || "请稍后重试",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "授权失败",
        description: "网络错误",
        variant: "destructive",
      })
    } finally {
      setIsGranting(false)
    }
  }

  const handleOpenRevokeDialog = (admin: Admin) => {
    setSelectedAdmin(admin)
    setRevokeDialogOpen(true)
  }

  const handleRevokeAdmin = async () => {
    if (!selectedAdmin) return

    setIsRevoking(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/admin/manage-admins?userId=${selectedAdmin.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "撤销成功",
          description: data.data.message,
        })
        setRevokeDialogOpen(false)
        setSelectedAdmin(null)
        fetchAdmins()
      } else {
        toast({
          title: "撤销失败",
          description: data.error?.message || "请稍后重试",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "撤销失败",
        description: "网络错误",
        variant: "destructive",
      })
    } finally {
      setIsRevoking(false)
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

  const getRoleBadge = (role: string) => {
    if (role === "super_admin") {
      return (
        <Badge className="bg-purple-500 hover:bg-purple-600">
          <ShieldCheck className="h-3 w-3 mr-1" />
          超级管理员
        </Badge>
      )
    }
    return (
      <Badge className="bg-blue-500 hover:bg-blue-600">
        <Shield className="h-3 w-3 mr-1" />
        管理员
      </Badge>
    )
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
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">
              共 {admins.length} 位管理员
            </p>
          </div>
          <Button onClick={handleOpenGrantDialog}>
            <UserPlus className="mr-2 h-4 w-4" />
            添加管理员
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>邮箱</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead className="text-center">评估次数</TableHead>
                <TableHead className="text-center">反馈次数</TableHead>
                <TableHead>授权时间</TableHead>
                <TableHead className="text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    暂无管理员
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.email}</TableCell>
                    <TableCell>{getRoleBadge(admin.role)}</TableCell>
                    <TableCell>{admin.name || "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{admin.evaluationCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{admin.feedbackCount}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(admin.createdAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenRevokeDialog(admin)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 授权对话框 */}
      <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加管理员</DialogTitle>
            <DialogDescription>
              选择用户并授予管理员权限
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>选择用户</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择要授权的用户" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email} {user.name && `(${user.name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>管理员类型</Label>
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as "admin" | "super_admin")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      普通管理员 - 可查看后台数据
                    </div>
                  </SelectItem>
                  <SelectItem value="super_admin">
                    <div className="flex items-center">
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      超级管理员 - 可管理其他管理员
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleGrantAdmin} disabled={isGranting || !selectedUserId}>
              {isGranting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  授权中...
                </>
              ) : (
                "确认授权"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 撤销对话框 */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>撤销管理员权限</DialogTitle>
            <DialogDescription>
              确定要撤销该用户的管理员权限吗?
            </DialogDescription>
          </DialogHeader>
          {selectedAdmin && (
            <div className="py-4">
              <div className="space-y-2 text-sm">
                <p><strong>邮箱:</strong> {selectedAdmin.email}</p>
                <p><strong>当前角色:</strong> {getRoleBadge(selectedAdmin.role)}</p>
                <p className="text-muted-foreground">
                  撤销后,该用户将变为普通用户,无法再访问后台管理系统
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeAdmin}
              disabled={isRevoking}
            >
              {isRevoking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  撤销中...
                </>
              ) : (
                "确认撤销"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
