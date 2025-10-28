"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff } from "lucide-react"

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: "login" | "register"
  onAuthSuccess?: (userData: { username: string; token: string }) => void
}

export function AuthDialog({ open, onOpenChange, defaultTab = "login", onAuthSuccess }: AuthDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // 网络状态监控
  useEffect(() => {
    const handleOnline = () => {
      console.log("🌐 [网络状态] 网络连接已恢复")
    }
    const handleOffline = () => {
      console.log("📡 [网络状态] 网络连接已断开")
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 登录表单状态
  const [loginPhone, setLoginPhone] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // 注册表单状态
  const [registerPhone, setRegisterPhone] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // 开始登录日志
    console.log("🔑 [登录开始] 用户开始登录流程")
    console.log("📱 [输入数据] 手机号:", loginPhone)
    console.log("🔑 [输入数据] 密码长度:", loginPassword.length, "个字符")
    console.log("⏰ [时间戳] 开始时间:", new Date().toISOString())

    try {
      console.log("🚀 [API请求] 发送登录请求到 /api/auth/login")
      console.log("📦 [请求体]", {
        phone: loginPhone,
        password: loginPassword.length + "个字符",
        timestamp: new Date().toISOString()
      })

      const requestStartTime = Date.now()

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: loginPhone, password: loginPassword }),
      })

      const requestEndTime = Date.now()
      const requestDuration = requestEndTime - requestStartTime

      console.log("📡 [响应状态] HTTP状态:", response.status, response.statusText)
      console.log("⏱️ [响应时间] 请求耗时:", requestDuration, "ms")
      console.log("🔗 [响应头] Content-Type:", response.headers.get('content-type'))
      console.log("🔗 [响应头] Content-Length:", response.headers.get('content-length'))

      const data = await response.json()

      console.log("📋 [响应数据] 完整服务器响应:", JSON.stringify(data, null, 2))

      if (data.success) {
        toast({
          title: "登录成功",
          description: `欢迎回来, ${data.data.username}!`,
        })

        console.log("✅ [登录成功] 用户登录成功")
        console.log("👤 [用户信息] 用户名:", data.data.username)
        console.log("🔐 [Token信息] Token长度:", data.data.token?.length || 0, "个字符")
        console.log("💾 [本地存储] 开始保存用户信息到localStorage")

        // 保存token到localStorage
        try {
          localStorage.setItem("token", data.data.token)
          localStorage.setItem("username", data.data.username)
          console.log("💾 [本地存储] 用户信息保存成功")
        } catch (storageError) {
          console.error("❌ [本地存储失败] localStorage保存错误:", storageError)
        }

        console.log("🔄 [回调执行] 执行成功回调函数")
        onAuthSuccess?.({ username: data.data.username, token: data.data.token })

        console.log("🚪 [界面更新] 关闭对话框")
        onOpenChange(false)

        console.log("📝 [表单重置] 重置登录表单")
        // 重置表单
        setLoginPhone("")
        setLoginPassword("")

        console.log("🎉 [登录完成] 整个登录流程���束")
      } else {
        console.log("❌ [登录失败] 服务器返回错误")
        console.log("📝 [错误信息] 错误代码:", data.error?.code || "未知")
        console.log("📝 [错误信息] 错误消息:", data.error?.message || "无详细消息")
        console.log("📝 [错误信息] 错误详情:", data.error?.details || "无详情信息")
        console.log("📊 [响应状态] HTTP状态:", response.status)

        toast({
          title: "登录失败",
          description: data.error?.message || "请检查您的手机号和密码",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.log("💥 [网络错误] 请求过程中发生异常")
      console.log("🔍 [错误类型] 错误类型:", error?.constructor?.name || "Unknown")
      console.log("📝 [错误消息] 错误消息:", error?.message || "无错误消息")
      console.log("📝 [错误堆栈] 错误堆栈:", error?.stack || "无堆栈信息")
      console.log("🔗 [网络状态] 检查网络连接状态:", navigator.onLine ? "在线" : "离线")
      console.log("🌐 [用户代理] 浏览器信息:", navigator.userAgent)
      console.log("🔌 [当前URL] 请求URL:", window.location.origin + "/api/auth/login")

      // 检查是否是特定的网络错误
      if (error instanceof TypeError) {
        if (error.message.includes('fetch')) {
          console.log("🌐 [网络分析] 可能是网络连接问题��服务器不可达")
        } else if (error.message.includes('JSON')) {
          console.log("📄 [数据解析] 服务器返回了无效的JSON数据")
        }
      }

      // 检查连接状态
      if (!navigator.onLine) {
        console.log("📡 [网络诊断] 用户处于离线状态")
      }

      toast({
        title: "登录失败",
        description: "网络错误,请稍后重试",
        variant: "destructive",
      })
    } finally {
      console.log("⏹️ [状态重置] 重置加载状态")
      setIsLoading(false)
      console.log("🏁 [登录结束] 登录流程处理完成")
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // 开始注册日志
    console.log("🔥 [注册开始] 用户开始注册流程")
    console.log("📱 [输入数据] 手机号:", registerPhone)
    console.log("🔑 [输入数据] 密码长度:", registerPassword.length, "个字符")
    console.log("⏰ [时间戳] 开始时间:", new Date().toISOString())

    try {
      console.log("🚀 [API请求] 发送注册请求到 /api/auth/register")
      console.log("📦 [请求体]", {
        phone: registerPhone,
        password: registerPassword.length + "个字符",
        timestamp: new Date().toISOString()
      })

      const requestStartTime = Date.now()

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: registerPhone,
          password: registerPassword,
        }),
      })

      const requestEndTime = Date.now()
      const requestDuration = requestEndTime - requestStartTime

      console.log("📡 [响应状态] HTTP状态:", response.status, response.statusText)
      console.log("⏱️ [响应时间] 请求耗时:", requestDuration, "ms")
      console.log("🔗 [响应头] Content-Type:", response.headers.get('content-type'))
      console.log("🔗 [响应头] Content-Length:", response.headers.get('content-length'))

      const data = await response.json()

      console.log("📋 [响应数据] 完整服务器响应:", JSON.stringify(data, null, 2))

      if (data.success) {
        toast({
          title: "注册成功",
          description: `欢迎加入, ${data.data.username}!`,
        })

        console.log("✅ [注册成功] 用户注册成功")
        console.log("👤 [用户信息] 用户名:", data.data.username)
        console.log("🔐 [Token信息] Token长度:", data.data.token?.length || 0, "个字符")
        console.log("💾 [本地存储] 开始保存用户信息到localStorage")

        // 保存token到localStorage
        try {
          localStorage.setItem("token", data.data.token)
          localStorage.setItem("username", data.data.username)
          console.log("💾 [本地存储] 用户信息保存成功")
        } catch (storageError) {
          console.error("❌ [本地存储失败] localStorage保存错误:", storageError)
        }

        console.log("🔄 [回调执行] 执行成功回调函数")
        onAuthSuccess?.({ username: data.data.username, token: data.data.token })

        console.log("🚪 [界面更新] 关闭对话框")
        onOpenChange(false)

        console.log("📝 [表单重置] 重置注册表单")
        // 重置表单
        setRegisterPhone("")
        setRegisterPassword("")

        console.log("🎉 [注册完成] ���个注册流程结束")
      } else {
        console.log("❌ [注册失败] 服务器返回错误")
        console.log("📝 [错误信息] 错误代码:", data.error?.code || "未知")
        console.log("📝 [错误信息] 错误消息:", data.error?.message || "无详细消息")
        console.log("📝 [错误信息] 错误详情:", data.error?.details || "无详情信息")
        console.log("📊 [响应状态] HTTP状态:", response.status)

        toast({
          title: "注册失败",
          description: data.error?.message || "请检查您的输入",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.log("💥 [网络错误] 请求过程中发生异常")
      console.log("🔍 [错误类型] 错误类型:", error?.constructor?.name || "Unknown")
      console.log("📝 [错误消息] 错误消息:", error?.message || "无错误消息")
      console.log("📝 [错误堆栈] 错误堆栈:", error?.stack || "无堆栈信息")
      console.log("🔗 [网络状态] 检查网络连接状态:", navigator.onLine ? "在线" : "离线")
      console.log("🌐 [用户代理] 浏览器信息:", navigator.userAgent)
      console.log("🔌 [当前URL] 请求URL:", window.location.origin + "/api/auth/register")

      // 检查是否是特定的网络错误
      if (error instanceof TypeError) {
        if (error.message.includes('fetch')) {
          console.log("🌐 [网络分析] 可能是���络连接问题或服务器不可达")
        } else if (error.message.includes('JSON')) {
          console.log("📄 [数据解析] 服务器返回了无效的JSON数据")
        }
      }

      // 检查连接状态
      if (!navigator.onLine) {
        console.log("📡 [网络诊断] 用户处于离线状态")
      }

      toast({
        title: "注册失败",
        description: "网络错误,请稍后重试",
        variant: "destructive",
      })
    } finally {
      console.log("⏹️ [状态重置] 重置加载状态")
      setIsLoading(false)
      console.log("🏁 [注册结束] 注册流程处理完成")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>账户</DialogTitle>
          <DialogDescription>登录或注册以保存您的评估历史</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-phone">手机号</Label>
                <Input
                  id="login-phone"
                  type="tel"
                  placeholder="请输入手机号"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  required
                  disabled={isLoading}
                  pattern="1[3-9]\d{9}"
                  maxLength={11}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">密码</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="请输入密码"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    disabled={isLoading}
                  >
                    {showLoginPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "登录中..." : "登录"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-phone">手机号</Label>
                <Input
                  id="register-phone"
                  type="tel"
                  placeholder="请输入手机号"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  required
                  disabled={isLoading}
                  pattern="1[3-9]\d{9}"
                  maxLength={11}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">密码</Label>
                <div className="relative">
                  <Input
                    id="register-password"
                    type={showRegisterPassword ? "text" : "password"}
                    placeholder="至少6位字符"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    disabled={isLoading}
                  >
                    {showRegisterPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "注册中..." : "注册"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
