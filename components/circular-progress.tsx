"use client"

interface CircularProgressProps {
  percentage: number
  size?: number
  strokeWidth?: number
  label?: string
  className?: string
  color?: string // 新增 color prop
}

export function CircularProgress({
  percentage,
  size = 120,
  strokeWidth = 8,
  label,
  className = "",
  color: externalColor, // 接收外部颜色
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  // 默认颜色逻辑
  const getDefaultColor = () => {
    if (percentage > 100) return "text-slate-500"
    if (percentage > 90) return "text-red-600"
    if (percentage > 70) return "text-amber-600"
    return "text-green-600"
  }

  // 如果外部没有提供颜色，则使用内部的默认逻辑
  const colorClass = externalColor || getDefaultColor()

  return (
    <div className={`flex flex-col items-center ${className} ${colorClass}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* 背景圆圈 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted opacity-20"
          />
          {/* 进度圆圈 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor" // 使用currentColor，由父元素的文本颜色决定
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-in-out"
          />
        </svg>
        {/* 中心文字 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color: 'currentColor' }}>
            {Math.round(percentage)}%
          </span>
          {label && <span className="text-xs text-muted-foreground mt-1">{label}</span>}
        </div>
      </div>
    </div>
  )
}
