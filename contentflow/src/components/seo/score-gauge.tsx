'use client'

interface ScoreGaugeProps {
  score: number
  label: string
  sublabel?: string
  size?: number
}

export function ScoreGauge({ score, label, sublabel, size = 80 }: ScoreGaugeProps) {
  const color = score >= 75 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#ef4444'
  const circumference = 2 * Math.PI * 15.9
  const dashArray = (score / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 36 36" style={{ width: size, height: size, transform: 'rotate(-90deg)' }}>
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${dashArray} ${circumference}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <div className="text-xs font-medium mt-1">{label}</div>
      {sublabel && <div className="text-[10px] text-muted-foreground">{sublabel}</div>}
    </div>
  )
}
