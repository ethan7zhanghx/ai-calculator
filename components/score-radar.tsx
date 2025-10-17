"use client"

interface ScoreRadarProps {
  scores: {
    label: string
    value: number // 0-100
    color: string
  }[]
  size?: number
}

export function ScoreRadar({ scores, size = 200 }: ScoreRadarProps) {
  const centerX = size / 2
  const centerY = size / 2
  const radius = (size / 2) * 0.7
  const levels = 5

  // 计算多边形的点
  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / scores.length - Math.PI / 2
    const distance = (radius * value) / 100
    return {
      x: centerX + distance * Math.cos(angle),
      y: centerY + distance * Math.sin(angle),
    }
  }

  // 生成雷达图的背景网格
  const gridLevels = Array.from({ length: levels }, (_, i) => i + 1)

  // 生成数据多边形的路径
  const dataPoints = scores.map((score, i) => getPoint(i, score.value))
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ") + " Z"

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* 背景网格 */}
        {gridLevels.map((level) => {
          const levelRadius = (radius * level) / levels
          const points = scores.map((_, i) => {
            const angle = (Math.PI * 2 * i) / scores.length - Math.PI / 2
            return {
              x: centerX + levelRadius * Math.cos(angle),
              y: centerY + levelRadius * Math.sin(angle),
            }
          })
          const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ") + " Z"
          return (
            <path
              key={level}
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-muted opacity-20"
            />
          )
        })}

        {/* 轴线 */}
        {scores.map((_, i) => {
          const point = getPoint(i, 100)
          return (
            <line
              key={i}
              x1={centerX}
              y1={centerY}
              x2={point.x}
              y2={point.y}
              stroke="currentColor"
              strokeWidth="1"
              className="text-muted opacity-20"
            />
          )
        })}

        {/* 数据区域 */}
        <path d={dataPath} fill="hsl(var(--primary))" fillOpacity="0.2" stroke="hsl(var(--primary))" strokeWidth="2" />

        {/* 数据点 */}
        {dataPoints.map((point, i) => (
          <circle key={i} cx={point.x} cy={point.y} r="4" fill={scores[i].color} stroke="white" strokeWidth="2" />
        ))}

        {/* 标签 */}
        {scores.map((score, i) => {
          const angle = (Math.PI * 2 * i) / scores.length - Math.PI / 2
          const labelDistance = radius + 25
          const x = centerX + labelDistance * Math.cos(angle)
          const y = centerY + labelDistance * Math.sin(angle)

          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-medium fill-current"
            >
              {score.label}
            </text>
          )
        })}
      </svg>

      {/* 图例 */}
      <div className="mt-4 flex flex-wrap justify-center gap-4">
        {scores.map((score, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: score.color }} />
            <span className="text-sm">
              {score.label}: <span className="font-bold">{score.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
