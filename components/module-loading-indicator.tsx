"use client"

import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Loader2, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

type ModuleStatus = 'pending' | 'loading' | 'completed' | 'error'

interface Module {
  id: string
  name: string
  description: string
  status: ModuleStatus
  error?: string
}

interface ModuleLoadingIndicatorProps {
  modules: Module[]
}

export function ModuleLoadingIndicator({ modules }: ModuleLoadingIndicatorProps) {
  return (
    <Card className="shadow-lg border-2 border-primary/20">
      <CardContent className="pt-6 space-y-3">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-primary">AI 评估进行中</h3>
          <p className="text-xs text-muted-foreground mt-1">各模块将独立加载，完成后立即显示</p>
        </div>

        <div className="space-y-3">
          {modules.map((module) => (
            <div
              key={module.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-all duration-300",
                module.status === 'completed' && "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800",
                module.status === 'loading' && "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800",
                module.status === 'error' && "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800",
                module.status === 'pending' && "bg-muted/50 border border-transparent"
              )}
            >
              {/* 状态图标 */}
              <div className="flex-shrink-0">
                {module.status === 'completed' && (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                )}
                {module.status === 'loading' && (
                  <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                )}
                {module.status === 'error' && (
                  <Circle className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
                {module.status === 'pending' && (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              {/* 模块信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-medium",
                    module.status === 'completed' && "text-green-700 dark:text-green-300",
                    module.status === 'loading' && "text-blue-700 dark:text-blue-300",
                    module.status === 'error' && "text-red-700 dark:text-red-300",
                    module.status === 'pending' && "text-muted-foreground"
                  )}>
                    {module.name}
                  </span>
                  {module.status === 'completed' && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      ✓ 已完成
                    </span>
                  )}
                  {module.status === 'loading' && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      正在分析...
                    </span>
                  )}
                  {module.status === 'error' && (
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                      失败
                    </span>
                  )}
                </div>
                <p className={cn(
                  "text-xs truncate",
                  module.status === 'error' ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                )}>
                  {module.status === 'error' && module.error ? module.error : module.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 提示信息 */}
        <div className="text-center text-xs text-muted-foreground pt-3 border-t">
          💡 评估模块将依次完成，您可以先查看已完成的模块结果
        </div>
      </CardContent>
    </Card>
  )
}
