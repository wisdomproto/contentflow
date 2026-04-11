'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AuditFormProps {
  onAudit: (url: string) => void
  loading: boolean
}

export function AuditForm({ onAudit, loading }: AuditFormProps) {
  const [url, setUrl] = useState('')

  return (
    <div className="flex gap-2">
      <Input
        placeholder="https://yonseicare.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="flex-1"
      />
      <Button onClick={() => onAudit(url)} disabled={loading || !url}>
        {loading ? '검사 중...' : '사이트 검사'}
      </Button>
    </div>
  )
}
