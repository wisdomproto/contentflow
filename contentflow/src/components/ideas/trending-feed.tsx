'use client'

interface TrendItem {
  keyword: string
  trend: string
  change: string
}

interface TrendingFeedProps {
  googleTrends: TrendItem[]
  naverTrends: TrendItem[]
  onSelectTopic: (topic: string) => void
}

export function TrendingFeed({ googleTrends, naverTrends, onSelectTopic }: TrendingFeedProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
          <span className="text-blue-400 font-bold">G</span>
          <span className="text-sm font-semibold">Google Trends</span>
        </div>
        <div className="p-3 space-y-2">
          {googleTrends.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">키워드를 입력하세요</p>}
          {googleTrends.map(item => (
            <button key={item.keyword} onClick={() => onSelectTopic(item.keyword)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-left">
              <span className="text-green-400 text-xs">▲ {item.change}</span>
              <span className="text-sm">{item.keyword}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
          <span className="text-green-500 font-bold">N</span>
          <span className="text-sm font-semibold">Naver DataLab</span>
        </div>
        <div className="p-3 space-y-2">
          {naverTrends.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">키워드를 입력하세요</p>}
          {naverTrends.map(item => (
            <button key={item.keyword} onClick={() => onSelectTopic(item.keyword)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-left">
              <span className="text-green-400 text-xs">▲ {item.change}</span>
              <span className="text-sm">{item.keyword}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
