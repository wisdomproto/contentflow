'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { migrateFromIndexedDB } from '@/lib/migrations/migrate-indexeddb'

export default function MigratePage() {
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleMigrate() {
    setLoading(true)
    const result = await migrateFromIndexedDB()
    setStatus(result.message)
    setLoading(false)
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h2 className="text-lg font-bold mb-4">데이터 마이그레이션</h2>
      <p className="text-sm text-muted-foreground mb-6">
        기존 IndexedDB 데이터를 Supabase로 마이그레이션합니다. 이 작업은 1회만 실행하면 됩니다.
      </p>
      <Button onClick={handleMigrate} disabled={loading}>
        {loading ? '마이그레이션 중...' : '마이그레이션 시작'}
      </Button>
      {status && (
        <p className="mt-4 text-sm p-3 bg-muted rounded">{status}</p>
      )}
    </div>
  )
}
