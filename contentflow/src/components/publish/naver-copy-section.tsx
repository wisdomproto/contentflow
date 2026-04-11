'use client'

import { Button } from '@/components/ui/button'

export function NaverCopySection() {
  return (
    <div className="bg-card border border-border rounded-lg p-4 border-l-4 border-l-[#03c75a]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 bg-[#03c75a] rounded flex items-center justify-center text-white text-xs font-bold">N</div>
        <span className="text-sm font-semibold">네이버 블로그 (수동 업로드)</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        네이버 블로그는 자동 발행이 불가합니다. AI가 네이버에 최적화된 포맷으로 변환해드립니다.
      </p>
      <div className="text-center py-6 text-muted-foreground text-sm">
        콘텐츠를 선택하면 네이버 포맷 변환이 가능합니다
      </div>
    </div>
  )
}
