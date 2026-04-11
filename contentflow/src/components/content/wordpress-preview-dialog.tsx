'use client'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { BlogCard } from '@/types/database'

interface WordpressPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  metaTitle?: string
  metaDescription?: string
  cards: BlogCard[]
  siteName?: string
}

export function WordpressPreviewDialog({
  open, onOpenChange, title, metaTitle, metaDescription, cards, siteName = 'My WordPress Blog'
}: WordpressPreviewDialogProps) {

  function renderCardContent(card: BlogCard) {
    const content = card.content as Record<string, unknown>
    const text = (content?.text as string) || ''
    const imageUrl = (content?.url as string) || ''
    const alt = (content?.alt as string) || ''
    const caption = (content?.caption as string) || ''

    return (
      <div key={card.id} className="mb-6">
        {imageUrl && (
          <figure className="mb-4">
            <img src={imageUrl} alt={alt} className="w-full rounded-sm" />
            {caption && <figcaption className="text-sm text-gray-500 mt-2 text-center italic">{caption}</figcaption>}
          </figure>
        )}
        {text && (
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, '<br/>') }}
          />
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* WordPress-style header */}
        <div className="bg-white border-b px-6 py-3 flex items-center justify-between shrink-0">
          <div className="text-sm font-medium text-gray-700">{siteName}</div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onOpenChange(false)}>
              닫기
            </Button>
          </div>
        </div>

        {/* Google SERP Preview */}
        <div className="bg-gray-50 border-b px-6 py-3 shrink-0">
          <div className="text-xs text-muted-foreground mb-1">Google 검색 결과 미리보기</div>
          <div className="bg-white rounded-lg border p-3 max-w-xl">
            <div className="text-xs text-green-700 mb-0.5">
              {siteName} › blog › post
            </div>
            <div className="text-blue-800 text-base font-medium hover:underline cursor-pointer mb-0.5 line-clamp-1">
              {metaTitle || title}
            </div>
            <div className="text-xs text-gray-600 line-clamp-2">
              {metaDescription || '메타 디스크립션이 설정되지 않았습니다.'}
            </div>
          </div>
        </div>

        {/* WordPress-style article */}
        <div className="flex-1 overflow-y-auto bg-white">
          <article className="max-w-2xl mx-auto px-6 py-10">
            {/* Post header */}
            <header className="mb-8">
              <div className="text-sm text-gray-500 mb-3">
                {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-4">
                {title}
              </h1>
              <div className="w-16 h-0.5 bg-gray-900"></div>
            </header>

            {/* Post content */}
            <div className="text-gray-700 leading-relaxed text-[17px]">
              {cards.length === 0 ? (
                <p className="text-gray-400 italic">콘텐츠가 아직 없습니다. AI 생성 후 미리보기를 확인하세요.</p>
              ) : (
                cards.map(card => renderCardContent(card))
              )}
            </div>

            {/* Post footer */}
            <footer className="mt-12 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm text-gray-500">
                  A
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Admin</div>
                  <div className="text-xs text-gray-500">{siteName}</div>
                </div>
              </div>
            </footer>
          </article>
        </div>
      </DialogContent>
    </Dialog>
  )
}
